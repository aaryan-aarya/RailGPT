package com.irctc.irctcbackend.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_bookings_pnr", columnList = "pnr", unique = true),
        @Index(name = "idx_bookings_user", columnList = "userEmail"),
        @Index(name = "idx_bookings_train_date_class", columnList = "trainNumber,journeyDate,classType")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String pnr;

    @Column(nullable = false)
    private String trainNumber;

    @Column(nullable = false)
    private String trainName;

    @Column(nullable = false)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String userEmail;

    /** ISO date YYYY-MM-DD. */
    @Column(nullable = false)
    private String journeyDate;

    @Column(nullable = false)
    private String classType;

    private String boarding;
    private String reservation;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String destination;

    @Column(nullable = false)
    private String status;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalFare = 0;

    @Builder.Default
    @Column(nullable = false)
    private Long createdAt = System.currentTimeMillis();

    private Long cancelledAt;

    @Builder.Default
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Passenger> passengers = new ArrayList<>();

    public void addPassenger(Passenger p) {
        passengers.add(p);
        p.setBooking(this);
    }
}
