package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByPnr(String pnr);

    long countByTrainNumberAndStatusStartingWith(
            String trainNumber,
            String status
    );

    long countByTrainNumberAndStatus(
            String trainNumber,
            String status
    );

    List<Booking> findByTrainNumberAndStatusOrderByRacNumberAsc(
            String trainNumber,
            String status
    );

    List<Booking> findByTrainNumberAndStatusOrderByWaitingNumberAsc(
            String trainNumber,
            String status
    );

    List<Booking> findByStatusStartingWithOrderByIdAsc(
            String status
    );

    List<Booking> findByUserEmail(
            String userEmail
    );

    List<Booking> findByTrainNumber(
            String trainNumber
    );
}