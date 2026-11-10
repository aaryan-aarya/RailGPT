package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.TicketEmailOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;

public interface TicketEmailOutboxRepository extends JpaRepository<TicketEmailOutbox, Long> {
    boolean existsByDedupeKey(String dedupeKey);

    List<TicketEmailOutbox> findTop100ByStatusOrderByCreatedAtDesc(String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<TicketEmailOutbox> findByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status, long now, Pageable pageable);
}
