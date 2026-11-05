package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.ChatResponse;
import com.irctc.irctcbackend.dto.ClassAvailability;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Passenger;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Rule-based travel assistant. This is intentionally NOT an LLM — it answers from
 * the catalog and booking state and masks personal data for non-owners.
 */
@Service
public class ChatbotService {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private TrainRepository trainRepository;
    @Autowired private TrainService trainService;

    private static final Map<String, String> CLASS_LABELS = Map.of(
            "SL", "Sleeper", "3A", "AC 3-Tier", "2A", "AC 2-Tier", "1A", "First AC",
            "CC", "Chair Car", "EC", "Executive Chair Car", "2S", "Second Sitting");

    public ChatResponse ask(String question, String viewerEmail, boolean isAdmin) {
        String raw = question == null ? "" : question.trim();
        if (raw.isEmpty()) {
            return new ChatResponse("Please type a question about trains, PNR status, RAC, waiting list or fares.", defaults());
        }
        if (raw.length() > 500) {
            return new ChatResponse("That question is a bit long. Please keep it under 500 characters.", defaults());
        }
        String q = raw.toLowerCase();

        if (q.contains("rac")) {
            return new ChatResponse("RAC (Reservation Against Cancellation) means you can board the train and share a berth. When confirmed passengers cancel, RAC passengers are promoted to full confirmed berths in queue order.",
                    List.of("What is waiting list?", "Check my PNR status"));
        }
        if (q.contains("waiting") || Pattern.compile("\\bwl\\b").matcher(q).find()) {
            return new ChatResponse("A Waiting List (WL) ticket is not yet confirmed. It moves up as RAC and confirmed passengers cancel. You can track the exact position with your PNR.",
                    List.of("What is RAC?", "Check my PNR status"));
        }
        if (q.contains("tatkal")) {
            return new ChatResponse("Tatkal is a short-notice booking quota that opens one day before the journey. This environment does not process live Tatkal bookings.",
                    List.of("Search trains", "What is RAC?"));
        }
        if (q.contains("refund") || q.contains("cancel")) {
            return new ChatResponse("You can cancel a booking from “My Trips”. Confirmed, RAC and waiting-list tickets are released back to the pool and the next passengers in queue are promoted automatically. No payment is processed here.",
                    List.of("How do I check my PNR?", "What is RAC?"));
        }

        if (q.contains("pnr")) {
            String token = extractPnr(raw);
            if (token == null) {
                return new ChatResponse("Please share a 10-digit PNR, for example: “PNR 2456789012”.", defaults());
            }
            Optional<Booking> found = bookingRepository.findByPnr(token);
            if (found.isEmpty()) {
                return new ChatResponse("I couldn't find PNR " + token + ". Please double-check the number.", defaults());
            }
            Booking booking = found.get();
            boolean canSee = isAdmin || (viewerEmail != null && viewerEmail.equals(booking.getUserEmail()));
            String paxLines = booking.getPassengers().stream().map(p -> {
                String name = canSee ? p.getName() : maskName(p.getName());
                String detail = switch (p.getStatus()) {
                    case "CONFIRMED" -> p.getCoachNumber() + "/" + p.getSeatNumber() + " (" + p.getBerthType() + ")";
                    case "RAC" -> "RAC " + p.getRacNumber();
                    case "WL" -> "WL " + p.getWaitingNumber();
                    default -> "Cancelled";
                };
                return name + ": " + p.getStatus() + " — " + detail;
            }).collect(Collectors.joining("\n"));
            return new ChatResponse("PNR " + booking.getPnr() + " · " + booking.getTrainName() + " (" + booking.getTrainNumber() + ") · " + booking.getJourneyDate() + "\n" + paxLines,
                    List.of("What is RAC?", "Show my bookings"));
        }

        if (q.contains("my booking") || q.contains("show my booking") || (q.contains("booking") && viewerEmail != null)) {
            if (viewerEmail == null) {
                return new ChatResponse("Please sign in to see your bookings, or check a specific PNR.", List.of("Check PNR status"));
            }
            List<Booking> mine = bookingRepository.findByUserEmailOrderByCreatedAtDesc(viewerEmail);
            if (mine.isEmpty()) {
                return new ChatResponse("You have no bookings yet. Search for a train to make your first booking.", List.of("Search trains"));
            }
            String lines = mine.stream().limit(5)
                    .map(b -> b.getPnr() + " · " + b.getTrainName() + " · " + b.getJourneyDate() + " · " + b.getStatus())
                    .collect(Collectors.joining("\n"));
            return new ChatResponse("You have " + mine.size() + " booking(s):\n" + lines, List.of("Check PNR status"));
        }

        String numberToken = extractTrainNumber(raw);
        if (numberToken != null && (q.contains("train") || q.contains("seat") || q.contains("available"))) {
            Optional<Train> found = trainRepository.findByTrainNumber(numberToken);
            if (found.isEmpty()) {
                return new ChatResponse("I couldn't find train " + numberToken + " in the catalog.", List.of("Show all trains"));
            }
            Train train = found.get();
            String today = LocalDate.now().toString();
            Map<String, ClassAvailability> avail = trainService.computeAvailability(train, today);
            String lines = train.getClasses().stream().map(c -> {
                ClassAvailability inv = avail.get(c.getClassType());
                String label = CLASS_LABELS.getOrDefault(c.getClassType(), c.getClassType());
                return label + ": " + inv.availableSeats() + " available · RAC " + inv.racCount() + "/" + c.getRacLimit() + " · WL " + inv.waitingCount() + "/" + c.getWaitingLimit();
            }).collect(Collectors.joining("\n"));
            return new ChatResponse(train.getTrainName() + " (" + train.getTrainNumber() + ") · " + train.getSource() + " → " + train.getDestination()
                    + "\nAvailability for " + today + ":\n" + lines, List.of("Book a ticket", "What is RAC?"));
        }

        if (q.contains("recommend") || q.contains("suggest")) {
            String today = LocalDate.now().toString();
            record Ranked(Train train, long best) {}
            String lines = trainRepository.findAll().stream()
                    .map(t -> new Ranked(t, trainService.computeAvailability(t, today).values().stream()
                            .mapToLong(ClassAvailability::availableSeats).max().orElse(0)))
                    .sorted((a, b) -> Long.compare(b.best(), a.best()))
                    .limit(3)
                    .map(r -> r.train().getTrainNumber() + " " + r.train().getTrainName()
                            + " (" + r.train().getSource() + " → " + r.train().getDestination() + ") — " + r.best() + " seats")
                    .collect(Collectors.joining("\n"));
            return new ChatResponse("Here are trains with the most availability today:\n" + lines, List.of("Search trains"));
        }

        if (q.contains("find train") || q.contains("all train") || q.contains("list train") || q.contains("show train")) {
            List<Train> trains = trainRepository.findAll();
            String lines = trains.stream().limit(12)
                    .map(t -> t.getTrainNumber() + " " + t.getTrainName() + " — " + t.getSource() + " → " + t.getDestination())
                    .collect(Collectors.joining("\n"));
            return new ChatResponse("Catalog (" + trains.size() + " trains):\n" + lines, List.of("Search trains", "Recommend a train"));
        }

        if (q.contains("fare") || q.contains("price") || q.contains("cost") || q.contains("class")) {
            return new ChatResponse("Fares depend on the train and class (Sleeper, AC 3-Tier, AC 2-Tier, First AC, Chair Car). Open any train to see class-wise fares and live availability. Fares shown are indicative values.",
                    List.of("Search trains", "What classes are available?"));
        }
        if (q.contains("classes") || q.contains("coach")) {
            String list = CLASS_LABELS.entrySet().stream()
                    .map(e -> e.getKey() + " — " + e.getValue()).collect(Collectors.joining("\n"));
            return new ChatResponse("Classes supported:\n" + list, List.of("Search trains"));
        }

        return new ChatResponse("I can help with train search, seat availability, PNR status, RAC / waiting-list explanations, fares and cancellations. Try one of the suggestions below.", defaults());
    }

    private List<String> defaults() {
        return List.of("What is RAC?", "What is waiting list?", "Check PNR status", "Recommend a train");
    }

    private String extractPnr(String raw) {
        for (String word : raw.split("\\s+")) {
            String digits = word.replaceAll("[^0-9]", "");
            if (digits.matches("\\d{10}")) {
                return digits;
            }
        }
        return null;
    }

    private String extractTrainNumber(String raw) {
        for (String w : raw.split("\\s+")) {
            if (w.matches("\\d{4,5}")) return w;
        }
        return null;
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "••••";
        return Arrays.stream(name.trim().split("\\s+"))
                .map(w -> w.length() <= 1 ? "•" : w.charAt(0) + "•".repeat(Math.max(2, w.length() - 1)))
                .collect(Collectors.joining(" "));
    }
}
