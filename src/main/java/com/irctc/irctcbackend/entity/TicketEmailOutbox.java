package com.irctc.irctcbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ticket_email_outbox", indexes = {
        @Index(name = "idx_ticket_email_due", columnList = "status,next_attempt_at,created_at"),
        @Index(name = "idx_ticket_email_event_type", columnList = "event_type,created_at")
}, uniqueConstraints = @UniqueConstraint(name = "uk_ticket_email_dedupe", columnNames = "dedupe_key"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketEmailOutbox {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pnr", nullable = false, length = 10)
    private String pnr;

    @Column(name = "recipient", nullable = false, length = 255)
    private String recipient;

    @Column(name = "event_type", nullable = false, length = 24)
    @Builder.Default
    private String eventType = "BOOKED";

    @Column(name = "status_snapshot", nullable = false, length = 16)
    @Builder.Default
    private String statusSnapshot = "CONFIRMED";

    @Column(name = "dedupe_key", nullable = false, length = 100)
    private String dedupeKey;

    @Column(name = "status", nullable = false, length = 16)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private long nextAttemptAt;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    @Column(name = "sent_at")
    private Long sentAt;

    @Column(name = "last_error", length = 500)
    private String lastError;
}
