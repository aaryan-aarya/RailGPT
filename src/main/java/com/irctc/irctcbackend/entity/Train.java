package com.irctc.irctcbackend.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.irctc.irctcbackend.dto.ClassAvailability;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "trains", indexes = {
        @Index(name = "idx_trains_number", columnList = "trainNumber", unique = true),
        @Index(name = "idx_trains_route", columnList = "source,destination")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Train {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String trainNumber;

    @Column(nullable = false)
    private String trainName;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String destination;

    private String departureTime;
    private String arrivalTime;
    private Integer durationMinutes;
    private Integer distanceKm;
    private String trainType;

    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "train_days_of_run", joinColumns = @JoinColumn(name = "train_id"))
    @Column(name = "day_of_run")
    private List<String> daysOfRun = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "train", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<TrainClass> classes = new ArrayList<>();

    /** Computed per-date availability; not persisted, omitted from JSON when null. */
    @Transient
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Map<String, ClassAvailability> availability;

    public void addClass(TrainClass tc) {
        classes.add(tc);
        tc.setTrain(this);
    }

    public void replaceClasses(List<TrainClass> newClasses) {
        classes.clear();
        if (newClasses != null) {
            for (TrainClass tc : newClasses) {
                addClass(tc);
            }
        }
    }
}
