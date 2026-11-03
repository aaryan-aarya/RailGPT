package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.ChatResponse;
import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class ChatbotService {

    @Autowired
    private TrainRepository trainRepository;

    @Autowired
    private BookingRepository bookingRepository;

    public ChatResponse askQuestion(String question) {

        String q = question.toLowerCase();

        // RAC FAQ
        if (q.contains("rac")) {
            return new ChatResponse(
                    "RAC means Reservation Against Cancellation. RAC passengers can travel and may get a confirmed seat after cancellations."
            );
        }

        // WL FAQ
        if (q.contains("waiting") || q.contains("wl")) {
            return new ChatResponse(
                    "Waiting List means the ticket is not confirmed yet and depends on cancellations."
            );
        }

        // PNR Status
        if (q.contains("pnr")) {

            String[] words = question.split(" ");

            for (String word : words) {

                Booking booking =
                        bookingRepository.findByPnr(word)
                                .orElse(null);

                if (booking != null) {

                    return new ChatResponse(
                            "PNR: " + booking.getPnr()
                                    + " | Passenger: "
                                    + booking.getPassengerName()
                                    + " | Status: "
                                    + booking.getStatus()
                    );
                }
            }

            return new ChatResponse("PNR not found.");
        }

        // User Bookings
        if (q.contains("booking") || q.contains("my bookings")) {

            String[] words = question.split(" ");

            for (String word : words) {

                if (word.contains("@")) {

                    List<Booking> bookings =
                            bookingRepository.findByUserEmail(word);

                    return new ChatResponse(
                            "Total bookings found: "
                                    + bookings.size()
                    );
                }
            }
        }

        // Seat Availability
        if (q.contains("train")) {

            String[] words = question.split(" ");

            for (String word : words) {

                if (word.matches("\\d+")) {

                    Train train =
                            trainRepository
                                    .findByTrainNumber(word)
                                    .orElse(null);

                    if (train != null) {

                        return new ChatResponse(
                                "Train "
                                        + train.getTrainName()
                                        + " has "
                                        + train.getAvailableSeats()
                                        + " seats available."
                        );
                    }
                }
            }
        }

        // Train Statistics
        if (q.contains("statistics")
                || q.contains("booking count")) {

            String[] words = question.split(" ");

            for (String word : words) {

                if (word.matches("\\d+")) {

                    List<Booking> bookings =
                            bookingRepository.findByTrainNumber(word);

                    return new ChatResponse(
                            "Total bookings for train "
                                    + word
                                    + " : "
                                    + bookings.size()
                    );
                }
            }
        }

        // Train Recommendation
        if (q.contains("recommend")) {

            List<Train> trains = trainRepository.findAll();

            if (trains.isEmpty()) {
                return new ChatResponse(
                        "No trains available."
                );
            }

            Train bestTrain = trains.stream()
                    .max(Comparator.comparing(
                            Train::getAvailableSeats
                    ))
                    .orElse(null);

            if (bestTrain != null) {

                return new ChatResponse(
                        "Recommended Train: "
                                + bestTrain.getTrainNumber()
                                + " - "
                                + bestTrain.getTrainName()
                                + " | Available Seats: "
                                + bestTrain.getAvailableSeats()
                );
            }
        }

        // Show All Trains
        if (q.contains("find train")) {

            List<Train> trains = trainRepository.findAll();

            StringBuilder result = new StringBuilder();

            for (Train train : trains) {

                result.append(train.getTrainNumber())
                        .append(" - ")
                        .append(train.getTrainName())
                        .append("\n");
            }

            return new ChatResponse(result.toString());
        }

        // Tatkal FAQ
        if (q.contains("tatkal")) {
            return new ChatResponse(
                    "Tatkal is a scheme for last-minute train ticket booking."
            );
        }

        return new ChatResponse(
                "Sorry, I could not understand your question."
        );
    }
}