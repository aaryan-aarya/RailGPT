package com.irctc.irctcbackend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_email", columnList = "email", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    /** USER or ADMIN. Defaults to USER; never trusted from client input. */
    @Builder.Default
    @Column(nullable = false)
    private String role = "USER";

    private String phone;

    @Builder.Default
    @Column(nullable = false)
    private Long createdAt = System.currentTimeMillis();
}
