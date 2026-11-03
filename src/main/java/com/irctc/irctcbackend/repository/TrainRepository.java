package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.Train;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainRepository extends JpaRepository<Train, Long> {

    List<Train> findBySourceIgnoreCaseAndDestinationIgnoreCase(
            String source,
            String destination
    );

    Optional<Train> findByTrainNumber(String trainNumber);

    List<Train> findBySourceContainingIgnoreCaseOrDestinationContainingIgnoreCase(
            String source,
            String destination
    );
}