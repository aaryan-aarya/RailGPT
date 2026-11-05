package com.irctc.irctcbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_classes", indexes = {
        @Index(name = "idx_train_classes_train", columnList = "train_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_id", nullable = false)
    @JsonIgnore
    private Train train;

    @Column(nullable = false)
    private String classType;

    @Column(nullable = false)
    private Integer totalSeats;

    @Column(nullable = false)
    private Integer fare;

    @Builder.Default
    @Column(nullable = false)
    private Integer racLimit = 18;

    @Builder.Default
    @Column(nullable = false)
    private Integer waitingLimit = 40;
}
