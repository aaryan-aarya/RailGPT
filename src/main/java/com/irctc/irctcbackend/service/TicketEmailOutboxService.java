package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.email.EmailService;
import com.irctc.irctcbackend.dto.AdminEmailOutboxItem;
import com.irctc.irctcbackend.entity.TicketEmailOutbox;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.TicketEmailOutboxRepository;
import com.irctc.irctcbackend.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class TicketEmailOutboxService {
    private static final Logger log = LoggerFactory.getLogger(TicketEmailOutboxService.class);
    private static final int BATCH_SIZE = 20;
    private static final int MAX_ATTEMPTS = 8;

    private final TicketEmailOutboxRepository outboxRepository;
    private final BookingRepository bookingRepository;
    private final TicketPdfService ticketPdfService;
    private final EmailService emailService;

    public TicketEmailOutboxService(TicketEmailOutboxRepository outboxRepository,
                                    BookingRepository bookingRepository,
                                    TicketPdfService ticketPdfService,
                                    EmailService emailService) {
        this.outboxRepository = outboxRepository;
        this.bookingRepository = bookingRepository;
        this.ticketPdfService = ticketPdfService;
        this.emailService = emailService;
    }

    /** Call from the booking transaction so a committed booking cannot lose its email job. */
    @Transactional
    public void enqueueForBooking(String pnr, String recipient, String status) {
        enqueue(pnr, recipient, "BOOKED", status, "booking:" + pnr);
    }

    @Transactional
    public void enqueueForCancellation(String pnr, String recipient) {
        enqueue(pnr, recipient, "CANCELLED", "CANCELLED", "cancelled:" + pnr);
    }

    @Transactional
    public void enqueueStatusChange(String pnr, String recipient, String status) {
        enqueue(pnr, recipient, "STATUS_CHANGE", status,
                "status:" + pnr + ":" + status + ":" + UUID.randomUUID());
    }

    @Transactional
    public void enqueueResend(String pnr, String recipient) {
        enqueue(pnr, recipient, "BOOKED", "CURRENT", "resend:" + UUID.randomUUID());
    }

    private void enqueue(String pnr, String recipient, String eventType, String status, String dedupeKey) {
        if (outboxRepository.existsByDedupeKey(dedupeKey)) return;
        long now = System.currentTimeMillis();
        outboxRepository.save(TicketEmailOutbox.builder()
                .pnr(pnr)
                .recipient(recipient)
                .eventType(eventType)
                .statusSnapshot(status)
                .dedupeKey(dedupeKey)
                .status("PENDING")
                .attempts(0)
                .nextAttemptAt(now)
                .createdAt(now)
                .build());
    }

    /** Called by the scheduled dispatcher; row locks make multiple instances serialize safely. */
    @Transactional
    public int dispatchDueMessages() {
        var jobs = outboxRepository.findByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
                "PENDING", System.currentTimeMillis(), PageRequest.of(0, BATCH_SIZE));
        int processed = 0;
        for (TicketEmailOutbox job : jobs) {
            try {
                var booking = bookingRepository.findByPnr(job.getPnr())
                        .orElseThrow(() -> new IllegalStateException("Booking no longer exists."));
                byte[] ticketPdf = "BOOKED".equals(job.getEventType())
                        ? ticketPdfService.createTicket(booking) : null;
                emailService.sendBookingEventEmail(booking, job.getRecipient(), job.getEventType(), job.getStatusSnapshot(), ticketPdf);
                job.setStatus("SENT");
                job.setSentAt(System.currentTimeMillis());
                job.setLastError(null);
            } catch (RuntimeException ex) {
                int attempts = job.getAttempts() + 1;
                job.setAttempts(attempts);
                job.setLastError(safeError(ex));
                if (attempts >= MAX_ATTEMPTS) {
                    job.setStatus("DEAD");
                    log.error("Ticket email job {} exhausted retries for PNR {}", job.getId(), job.getPnr());
                } else {
                    long backoff = Math.min(6 * 60 * 60 * 1000L, 30_000L * (1L << Math.min(attempts - 1, 10)));
                    job.setNextAttemptAt(System.currentTimeMillis() + backoff);
                    log.warn("Ticket email delivery attempt {} failed for PNR {}", attempts, job.getPnr());
                }
            }
            processed++;
        }
        return processed;
    }

    @Transactional(readOnly = true)
    public java.util.List<AdminEmailOutboxItem> recent(String status) {
        if (!java.util.Set.of("PENDING", "SENT", "DEAD").contains(status)) {
            throw ApiException.badRequest("INVALID_STATUS", "Status must be PENDING, SENT or DEAD.");
        }
        return outboxRepository.findTop100ByStatusOrderByCreatedAtDesc(status).stream()
                .map(job -> new AdminEmailOutboxItem(job.getId(), job.getPnr(), job.getRecipient(),
                        job.getEventType(), job.getStatusSnapshot(),
                        job.getStatus(), job.getAttempts(), job.getCreatedAt(), job.getLastError()))
                .toList();
    }

    @Transactional
    public void retry(long id) {
        TicketEmailOutbox job = outboxRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("EMAIL_JOB_NOT_FOUND", "Email job not found."));
        job.setStatus("PENDING");
        job.setAttempts(0);
        job.setNextAttemptAt(System.currentTimeMillis());
        job.setLastError(null);
    }

    private String safeError(RuntimeException ex) {
        // Provider errors can include recipient addresses or message metadata.
        return ex.getClass().getSimpleName();
    }
}
