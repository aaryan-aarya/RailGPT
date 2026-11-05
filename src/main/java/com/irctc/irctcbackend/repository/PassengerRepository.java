package com.irctc.irctcbackend.repository;

import com.irctc.irctcbackend.entity.Passenger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PassengerRepository extends JpaRepository<Passenger, Long> {

    /**
     * All passengers for a train/date/class, ordered by booking creation then id.
     * Inventory (confirmed/RAC/WL counts and occupied seats) is derived from this,
     * so it can never drift out of sync with the actual passenger rows.
     */
    @Query("SELECT p FROM Passenger p JOIN FETCH p.booking " +
            "WHERE p.booking.trainNumber = :tn AND p.booking.journeyDate = :date AND p.booking.classType = :cls " +
            "ORDER BY p.booking.createdAt ASC, p.id ASC")
    List<Passenger> findForInventory(@Param("tn") String trainNumber,
                                     @Param("date") String journeyDate,
                                     @Param("cls") String classType);

    long countByStatus(String status);
}
