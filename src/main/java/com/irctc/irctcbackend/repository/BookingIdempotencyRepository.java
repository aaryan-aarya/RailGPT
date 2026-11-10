package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.BookingIdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingIdempotencyRepository extends JpaRepository<BookingIdempotencyRecord, Long> {
    Optional<BookingIdempotencyRecord> findByUserEmailAndIdempotencyKey(String userEmail, String idempotencyKey);
}
