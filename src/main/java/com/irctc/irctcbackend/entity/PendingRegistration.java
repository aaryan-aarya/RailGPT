
package com.irctc.irctcbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "pending_registrations",
        indexes = {
                @Index(
                        name = "idx_pending_registrations_expiry",
                        columnList = "expires_at"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 255)
    private String phone;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Long expiresAt;

    @Builder.Default
    @Column(nullable = false)
    private Integer attempts = 0;

    @Column(name = "last_sent_at", nullable = false)
    private Long lastSentAt;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;
}
