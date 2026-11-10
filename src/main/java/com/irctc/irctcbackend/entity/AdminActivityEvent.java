package com.irctc.irctcbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admin_activity_events", indexes = {
        @Index(name = "idx_admin_activity_created", columnList = "created_at"),
        @Index(name = "idx_admin_activity_target", columnList = "target_type,target_id")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminActivityEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_email", nullable = false, length = 255)
    private String actorEmail;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(name = "target_type", nullable = false, length = 40)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 255)
    private String targetId;

    @Column(nullable = false, length = 1000)
    private String details;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;
}
