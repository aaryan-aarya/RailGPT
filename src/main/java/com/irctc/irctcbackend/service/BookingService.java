package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.BookingRequest;
import com.irctc.irctcbackend.dto.PassengerInput;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Passenger;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.entity.TrainClass;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.PassengerRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookingService {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private TrainRepository trainRepository;
    @Autowired private PassengerRepository passengerRepository;
    @Autowired private EntityManager entityManager;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ADVANCE_DAYS = 120;

    // Berth/coach patterns per class (mirrors the tested reference engine).
    private static final Map<String, int[]> CLASS_META = Map.of(
            "SL", new int[]{8, 72}, "3A", new int[]{8, 72}, "2A", new int[]{6, 54},
            "1A", new int[]{4, 24}, "CC", new int[]{5, 78}, "EC", new int[]{4, 56}, "2S", new int[]{6, 108});
    private static final Map<String, String[]> BERTH_PATTERN = Map.of(
            "SL", new String[]{"LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"},
            "3A", new String[]{"LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"},
            "2A", new String[]{"LB", "UB", "LB", "UB", "SL", "SU"},
            "1A", new String[]{"LB", "UB", "LB", "UB"},
            "CC", new String[]{"WS", "MS", "AS", "MS", "WS"},
            "EC", new String[]{"WS", "AS", "WS", "AS"},
            "2S", new String[]{"WS", "MS", "AS", "WS", "MS", "AS"});
    private static final Map<String, String> COACH_PREFIX = Map.of(
            "SL", "S", "3A", "B", "2A", "A", "1A", "H", "CC", "C", "EC", "E", "2S", "D");

    // ------------------------------------------------------------------ book

    @Transactional
    public Booking book(String userEmail, BookingRequest req) {
        // Pessimistic lock serializes concurrent bookings/cancellations for this train.
        Train train = trainRepository.findByTrainNumberForUpdate(req.trainNumber())
                .orElseThrow(() -> ApiException.notFound("TRAIN_NOT_FOUND", "Train not found."));

        validateJourneyDate(req.journeyDate());

        TrainClass cls = train.getClasses().stream()
                .filter(c -> c.getClassType().equals(req.classType()))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("CLASS_NOT_FOUND", "This class is not available on the selected train."));

        List<PassengerInput> inputs = req.passengers();

        // Working set = existing passengers for this train/date/class + new ones as we add them.
        List<Passenger> rows = new ArrayList<>(
                passengerRepository.findForInventory(train.getTrainNumber(), req.journeyDate(), req.classType()));

        long available = cls.getTotalSeats() - count(rows, "CONFIRMED");
        long racAvailable = cls.getRacLimit() - count(rows, "RAC");
        long waitingAvailable = cls.getWaitingLimit() - count(rows, "WL");
        if (inputs.size() > available + racAvailable + waitingAvailable) {
            throw ApiException.conflict("TRAIN_FULL", "Not enough seats, RAC or waiting-list slots for this many passengers.");
        }

        Booking booking = Booking.builder()
                .pnr(generatePnr())
                .trainNumber(train.getTrainNumber())
                .trainName(train.getTrainName())
                .userEmail(userEmail)
                .journeyDate(req.journeyDate())
                .classType(req.classType())
                .boarding(req.boarding() == null || req.boarding().isBlank() ? train.getSource() : req.boarding())
                .reservation(req.reservation() == null || req.reservation().isBlank() ? train.getDestination() : req.reservation())
                .source(train.getSource())
                .destination(train.getDestination())
                .status("CONFIRMED")
                .totalFare(inputs.size() * cls.getFare())
                .build();

        for (PassengerInput in : inputs) {
            Passenger p = Passenger.builder()
                    .name(in.name().trim())
                    .age(in.age())
                    .gender(in.gender())
                    .berthPreference(in.berthPreference())
                    .status("WL")
                    .build();

            long avail = cls.getTotalSeats() - count(rows, "CONFIRMED");
            long racA = cls.getRacLimit() - count(rows, "RAC");
            long wlA = cls.getWaitingLimit() - count(rows, "WL");

            if (avail > 0) {
                allocateSeat(rows, p, cls);
            } else if (racA > 0) {
                p.setStatus("RAC");
                p.setRacNumber((int) (count(rows, "RAC") + 1));
                p.setBerthType("RAC");
            } else if (wlA > 0) {
                p.setStatus("WL");
                p.setWaitingNumber((int) (count(rows, "WL") + 1));
                p.setBerthType("WL");
            } else {
                throw ApiException.conflict("TRAIN_FULL", "This train/date/class is fully booked.");
            }

            booking.addPassenger(p);
            rows.add(p);
        }

        // Idempotent rebalance: promote RAC->CONFIRMED / WL->RAC and renumber queues.
        rebalance(rows, cls);
        booking.setStatus(aggregateStatus(booking.getPassengers()));
        return bookingRepository.save(booking);
    }

    // ---------------------------------------------------------------- cancel

    @Transactional
    public Booking cancel(String userEmail, boolean isAdmin, String pnr) {
        Booking booking = bookingRepository.findByPnr(pnr)
                .orElseThrow(() -> ApiException.notFound("PNR_NOT_FOUND", "PNR not found."));
        if (!isAdmin && !booking.getUserEmail().equals(userEmail)) {
            throw ApiException.forbidden("FORBIDDEN", "You can only cancel your own bookings.");
        }
        if ("CANCELLED".equals(booking.getStatus())) {
            return booking;
        }

        Train train = trainRepository.findByTrainNumberForUpdate(booking.getTrainNumber())
                .orElseThrow(() -> ApiException.notFound("TRAIN_NOT_FOUND", "Train not found."));
        TrainClass cls = train.getClasses().stream()
                .filter(c -> c.getClassType().equals(booking.getClassType()))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("CLASS_NOT_FOUND", "Class not found."));

        for (Passenger p : booking.getPassengers()) {
            if (!"CANCELLED".equals(p.getStatus())) {
                p.setStatus("CANCELLED");
                p.setSeatNumber(null);
                p.setCoachNumber(null);
                p.setBerthType(null);
                p.setRacNumber(null);
                p.setWaitingNumber(null);
            }
        }
        booking.setStatus("CANCELLED");
        booking.setCancelledAt(System.currentTimeMillis());

        // Promote queued passengers into the freed capacity (auto-flush makes the
        // cancellation visible to this query within the same transaction).
        List<Passenger> rows = passengerRepository.findForInventory(
                train.getTrainNumber(), booking.getJourneyDate(), booking.getClassType());
        rebalance(rows, cls);

        return bookingRepository.save(booking);
    }

    // ------------------------------------------------------------------ reads

    public Booking getPnr(String pnr, String viewerEmail, boolean isAdmin) {
        Booking booking = bookingRepository.findByPnr(pnr)
                .orElseThrow(() -> ApiException.notFound("PNR_NOT_FOUND", "PNR not found."));
        boolean canSee = isAdmin || (viewerEmail != null && viewerEmail.equals(booking.getUserEmail()));
        if (canSee) {
            return booking;
        }
        // Public view: mask passenger names and hide the owner's email. Detach first
        // so masking is never persisted back to the database.
        entityManager.detach(booking);
        booking.setUserEmail(null);
        for (Passenger p : booking.getPassengers()) {
            p.setName(maskName(p.getName()));
        }
        return booking;
    }

    public List<Booking> getMyBookings(String userEmail) {
        return bookingRepository.findByUserEmailOrderByCreatedAtDesc(userEmail);
    }

    // -------------------------------------------------------------- inventory

    private long count(List<Passenger> rows, String status) {
        return rows.stream().filter(p -> status.equals(p.getStatus())).count();
    }

    private boolean allocateSeat(List<Passenger> rows, Passenger p, TrainClass cls) {
        Set<Integer> occupied = rows.stream()
                .filter(r -> "CONFIRMED".equals(r.getStatus()) && r.getSeatNumber() != null)
                .map(Passenger::getSeatNumber)
                .collect(Collectors.toSet());
        int seat = -1;
        for (int s = 1; s <= cls.getTotalSeats(); s++) {
            if (!occupied.contains(s)) { seat = s; break; }
        }
        if (seat == -1) return false;
        p.setStatus("CONFIRMED");
        p.setSeatNumber(seat);
        p.setCoachNumber(coach(cls.getClassType(), seat));
        p.setBerthType(berth(cls.getClassType(), seat));
        p.setRacNumber(null);
        p.setWaitingNumber(null);
        return true;
    }

    private void rebalance(List<Passenger> rows, TrainClass cls) {
        long available = cls.getTotalSeats() - count(rows, "CONFIRMED");
        List<Passenger> racQueue = rows.stream().filter(p -> "RAC".equals(p.getStatus()))
                .sorted(Comparator.comparingInt(p -> p.getRacNumber() == null ? Integer.MAX_VALUE : p.getRacNumber()))
                .collect(Collectors.toList());
        for (Passenger p : racQueue) {
            if (available <= 0) break;
            if (allocateSeat(rows, p, cls)) available--;
        }

        long racCountNow = count(rows, "RAC");
        long racSlots = cls.getRacLimit() - racCountNow;
        List<Passenger> wlQueue = rows.stream().filter(p -> "WL".equals(p.getStatus()))
                .sorted(Comparator.comparingInt(p -> p.getWaitingNumber() == null ? Integer.MAX_VALUE : p.getWaitingNumber()))
                .collect(Collectors.toList());
        for (Passenger p : wlQueue) {
            if (racSlots <= 0) break;
            p.setStatus("RAC");
            p.setRacNumber(0);
            p.setWaitingNumber(null);
            p.setSeatNumber(null);
            p.setCoachNumber(null);
            p.setBerthType("RAC");
            racSlots--;
        }

        List<Passenger> racSorted = rows.stream().filter(p -> "RAC".equals(p.getStatus()))
                .sorted(byCreatedThenId()).collect(Collectors.toList());
        for (int i = 0; i < racSorted.size(); i++) {
            racSorted.get(i).setRacNumber(i + 1);
            racSorted.get(i).setBerthType("RAC");
        }
        List<Passenger> wlSorted = rows.stream().filter(p -> "WL".equals(p.getStatus()))
                .sorted(byCreatedThenId()).collect(Collectors.toList());
        for (int i = 0; i < wlSorted.size(); i++) {
            wlSorted.get(i).setWaitingNumber(i + 1);
            wlSorted.get(i).setBerthType("WL");
        }
    }

    private Comparator<Passenger> byCreatedThenId() {
        return Comparator
                .comparingLong((Passenger p) -> p.getBooking().getCreatedAt())
                .thenComparingLong(p -> p.getId() == null ? Long.MAX_VALUE : p.getId());
    }

    private String aggregateStatus(List<Passenger> passengers) {
        List<Passenger> active = passengers.stream()
                .filter(p -> !"CANCELLED".equals(p.getStatus())).collect(Collectors.toList());
        if (active.isEmpty()) return "CANCELLED";
        boolean allConfirmed = active.stream().allMatch(p -> "CONFIRMED".equals(p.getStatus()));
        if (allConfirmed) return "CONFIRMED";
        boolean allRac = active.stream().allMatch(p -> "RAC".equals(p.getStatus()));
        if (allRac) return "RAC";
        boolean allWl = active.stream().allMatch(p -> "WL".equals(p.getStatus()));
        if (allWl) return "WL";
        return "PARTIAL";
    }

    private String berth(String classType, int seat) {
        String[] pattern = BERTH_PATTERN.getOrDefault(classType, new String[]{"LB", "UB"});
        int[] meta = CLASS_META.getOrDefault(classType, new int[]{8, 72});
        return pattern[(seat - 1) % meta[0]];
    }

    private String coach(String classType, int seat) {
        int[] meta = CLASS_META.getOrDefault(classType, new int[]{8, 72});
        int perCoach = meta[1];
        int coachNum = (seat - 1) / perCoach + 1;
        return COACH_PREFIX.getOrDefault(classType, "S") + coachNum;
    }

    private String generatePnr() {
        for (int i = 0; i < 50; i++) {
            StringBuilder sb = new StringBuilder();
            sb.append(2 + RANDOM.nextInt(8));
            for (int j = 1; j < 10; j++) sb.append(RANDOM.nextInt(10));
            String pnr = sb.toString();
            if (!bookingRepository.existsByPnr(pnr)) return pnr;
        }
        throw ApiException.conflict("PNR_COLLISION", "Could not generate a unique PNR. Please retry.");
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "Passenger";
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(parts[i].charAt(0)).append("***");
        }
        return sb.toString();
    }

    private void validateJourneyDate(String date) {
        LocalDate journey;
        try {
            journey = LocalDate.parse(date);
        } catch (Exception e) {
            throw ApiException.badRequest("VALIDATION", "Journey date must be YYYY-MM-DD.");
        }
        LocalDate today = LocalDate.now();
        if (journey.isBefore(today)) {
            throw ApiException.badRequest("VALIDATION", "Journey date cannot be in the past.");
        }
        if (journey.isAfter(today.plusDays(MAX_ADVANCE_DAYS))) {
            throw ApiException.badRequest("VALIDATION", "Bookings open up to 120 days in advance.");
        }
    }
}
