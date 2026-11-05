package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.Train;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrainRepository extends JpaRepository<Train, Long> {

    Optional<Train> findByTrainNumber(String trainNumber);

    boolean existsByTrainNumber(String trainNumber);

    /** Pessimistic write lock serializes bookings/cancellations per train. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Train t WHERE t.trainNumber = :tn")
    Optional<Train> findByTrainNumberForUpdate(@Param("tn") String tn);

    List<Train> findBySourceContainingIgnoreCaseAndDestinationContainingIgnoreCase(String source, String destination);

    List<Train> findBySourceContainingIgnoreCase(String source);

    List<Train> findByDestinationContainingIgnoreCase(String destination);
}
