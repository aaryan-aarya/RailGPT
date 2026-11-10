package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.entity.BookingAuditEvent;
import com.irctc.irctcbackend.repository.BookingAuditEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingAuditService {
    private final BookingAuditEventRepository repository;

    public BookingAuditService(BookingAuditEventRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(String pnr, String eventType, String actorEmail, String details) {
        repository.save(BookingAuditEvent.builder()
                .pnr(pnr)
                .eventType(eventType)
                .actorEmail(actorEmail)
                .details(details)
                .createdAt(System.currentTimeMillis())
                .build());
    }

    @Transactional(readOnly = true)
    public Page<BookingAuditEvent> search(String pnr, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return pnr == null || pnr.isBlank()
                ? repository.findAllByOrderByCreatedAtDesc(pageable)
                : repository.findAllByPnrOrderByCreatedAtDesc(pnr.trim(), pageable);
    }
}
