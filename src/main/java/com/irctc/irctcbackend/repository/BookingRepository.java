package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByPnr(String pnr);

    boolean existsByPnr(String pnr);

    boolean existsByTrainNumberAndStatusNot(String trainNumber, String status);

    List<Booking> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    List<Booking> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COALESCE(SUM(b.totalFare), 0) FROM Booking b WHERE b.status <> 'CANCELLED'")
    long sumActiveFare();
}
