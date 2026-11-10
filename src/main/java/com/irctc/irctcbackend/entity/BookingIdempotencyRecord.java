package com.irctc.irctcbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "booking_idempotency_records", uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_idempotency_user_key", columnNames = {"user_email", "idempotency_key"}),
        @UniqueConstraint(name = "uk_booking_idempotency_booking", columnNames = "booking_id")
}, indexes = @Index(name = "idx_booking_idempotency_created", columnList = "created_at"))
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingIdempotencyRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;
}
