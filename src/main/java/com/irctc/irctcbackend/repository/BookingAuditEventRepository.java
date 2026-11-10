package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.BookingAuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingAuditEventRepository extends JpaRepository<BookingAuditEvent, Long> {
    Page<BookingAuditEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<BookingAuditEvent> findAllByPnrOrderByCreatedAtDesc(String pnr, Pageable pageable);
}
