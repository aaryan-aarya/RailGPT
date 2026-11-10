package com.irctc.irctcbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "booking_audit_events", indexes = {
        @Index(name = "idx_booking_audit_pnr_created", columnList = "pnr,created_at"),
        @Index(name = "idx_booking_audit_created", columnList = "created_at")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingAuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String pnr;

    @Column(nullable = false, length = 40)
    private String eventType;

    @Column(length = 255)
    private String actorEmail;

    @Column(nullable = false, length = 1000)
    private String details;

    @Column(nullable = false)
    private Long createdAt;
}
