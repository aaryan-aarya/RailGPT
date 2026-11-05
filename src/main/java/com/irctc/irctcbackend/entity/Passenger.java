package com.irctc.irctcbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "passengers", indexes = {
        @Index(name = "idx_passengers_booking", columnList = "booking_id"),
        @Index(name = "idx_passengers_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Passenger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @JsonIgnore
    private Booking booking;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false)
    private String gender;

    private String berthPreference;

    @Column(nullable = false)
    private String status;

    private Integer seatNumber;
    private String coachNumber;
    private String berthType;
    private Integer racNumber;
    private Integer waitingNumber;
}
