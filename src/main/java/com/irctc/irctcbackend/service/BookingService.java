package com.irctc.irctcbackend.service;

import java.util.List;
import java.util.UUID;

import com.irctc.irctcbackend.entity.Booking;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.TrainRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private TrainRepository trainRepository;

    private final String[] sleeperPattern = {
            "LOWER",
            "MIDDLE",
            "UPPER",
            "LOWER",
            "MIDDLE",
            "UPPER",
            "SIDE LOWER",
            "SIDE UPPER"
    };

    public Booking getBookingByPnr(String pnr) {

        return bookingRepository
                .findByPnr(pnr)
                .orElseThrow(() ->
                        new RuntimeException("PNR Not Found"));
    }

    public List<Booking> getBookingsByUser(String email) {

        return bookingRepository.findByUserEmail(email);
    }

    public Booking bookTicket(Booking booking) {

        Train train = trainRepository
                .findByTrainNumber(booking.getTrainNumber())
                .orElseThrow(() ->
                        new RuntimeException("Train Not Found"));

        booking.setPnr(
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 10)
                        .toUpperCase()
        );

        booking.setClassType("SL");

        // CONFIRMED
        if (train.getAvailableSeats() > 0) {

            booking.setStatus("CONFIRMED");

            long confirmedCount =
                    bookingRepository.countByTrainNumberAndStatus(
                            booking.getTrainNumber(),
                            "CONFIRMED"
                    );

            int seatNo = (int) confirmedCount + 1;

            booking.setSeatNumber(seatNo);

            booking.setBerthType(
                    sleeperPattern[(seatNo - 1) % 8]
            );

            int coachNo = ((seatNo - 1) / 72) + 1;

            booking.setCoachNumber("S" + coachNo);

            train.setAvailableSeats(
                    train.getAvailableSeats() - 1
            );
        }

        // RAC / WL
        else {

            long racCount =
                    bookingRepository
                            .countByTrainNumberAndStatusStartingWith(
                                    booking.getTrainNumber(),
                                    "RAC"
                            );

            if (racCount < train.getRacLimit()) {

                booking.setStatus("RAC");

                booking.setRacNumber(
                        (int) racCount + 1
                );

                booking.setSeatNumber(null);
                booking.setCoachNumber(null);
                booking.setBerthType("RAC");
            }

            else {

                long wlCount =
                        bookingRepository
                                .countByTrainNumberAndStatusStartingWith(
                                        booking.getTrainNumber(),
                                        "WL"
                                );

                if (wlCount < train.getWaitingLimit()) {

                    booking.setStatus("WL");

                    booking.setWaitingNumber(
                            (int) wlCount + 1
                    );

                    booking.setSeatNumber(null);
                    booking.setCoachNumber(null);
                    booking.setBerthType("WL");
                }

                else {

                    throw new RuntimeException(
                            "Train Fully Booked"
                    );
                }
            }
        }

        trainRepository.save(train);

        return bookingRepository.save(booking);
    }

    public Booking cancelTicket(String pnr) {

        Booking booking = bookingRepository
                .findByPnr(pnr)
                .orElseThrow(() ->
                        new RuntimeException("PNR Not Found"));

        if ("CANCELLED".equals(booking.getStatus())) {
            return booking;
        }

        String trainNumber = booking.getTrainNumber();

        booking.setStatus("CANCELLED");

        bookingRepository.save(booking);

        List<Booking> racList =
                bookingRepository
                        .findByTrainNumberAndStatusOrderByRacNumberAsc(
                                trainNumber,
                                "RAC"
                        );

        List<Booking> wlList =
                bookingRepository
                        .findByTrainNumberAndStatusOrderByWaitingNumberAsc(
                                trainNumber,
                                "WL"
                        );

        if (!racList.isEmpty()) {

            Booking promotedPassenger = racList.get(0);

            promotedPassenger.setStatus("CONFIRMED");

            long confirmedCount =
                    bookingRepository.countByTrainNumberAndStatus(
                            trainNumber,
                            "CONFIRMED"
                    );

            int seatNo = (int) confirmedCount;

            promotedPassenger.setSeatNumber(seatNo);

            promotedPassenger.setBerthType(
                    sleeperPattern[(seatNo - 1) % 8]
            );

            int coachNo = ((seatNo - 1) / 72) + 1;

            promotedPassenger.setCoachNumber("S" + coachNo);

            promotedPassenger.setRacNumber(null);

            bookingRepository.save(promotedPassenger);

            // Shift RAC numbers
            for (int i = 1; i < racList.size(); i++) {

                Booking racPassenger = racList.get(i);

                racPassenger.setRacNumber(i);

                bookingRepository.save(racPassenger);
            }

            // Promote WL1 to RAC
            if (!wlList.isEmpty()) {

                Booking wlPassenger = wlList.get(0);

                wlPassenger.setStatus("RAC");

                wlPassenger.setRacNumber(racList.size());

                wlPassenger.setWaitingNumber(null);

                bookingRepository.save(wlPassenger);

                // Shift WL numbers
                for (int i = 1; i < wlList.size(); i++) {

                    Booking waitingPassenger = wlList.get(i);

                    waitingPassenger.setWaitingNumber(i);

                    bookingRepository.save(waitingPassenger);
                }
            }

        } else {

            Train train = trainRepository
                    .findByTrainNumber(trainNumber)
                    .orElseThrow(() ->
                            new RuntimeException("Train Not Found"));

            train.setAvailableSeats(
                    train.getAvailableSeats() + 1
            );

            trainRepository.save(train);
        }

        return booking;
    }


}
