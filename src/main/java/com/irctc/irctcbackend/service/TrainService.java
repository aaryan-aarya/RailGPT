package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.ClassAvailability;
import com.irctc.irctcbackend.dto.TrainClassInput;
import com.irctc.irctcbackend.dto.TrainInput;
import com.irctc.irctcbackend.entity.Passenger;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.entity.TrainClass;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.repository.BookingRepository;
import com.irctc.irctcbackend.repository.PassengerRepository;
import com.irctc.irctcbackend.repository.TrainRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TrainService {

    @Autowired
    private TrainRepository trainRepository;

    @Autowired
    private PassengerRepository passengerRepository;

    @Autowired
    private BookingRepository bookingRepository;

    public List<Train> getAll() {
        return trainRepository.findAll();
    }

    public List<Train> search(String source, String destination, String date) {
        boolean hasSource = source != null && !source.isBlank();
        boolean hasDestination = destination != null && !destination.isBlank();
        List<Train> trains;
        if (hasSource && hasDestination) {
            trains = trainRepository.findBySourceContainingIgnoreCaseAndDestinationContainingIgnoreCase(source.trim(), destination.trim());
        } else if (hasSource) {
            trains = trainRepository.findBySourceContainingIgnoreCase(source.trim());
        } else if (hasDestination) {
            trains = trainRepository.findByDestinationContainingIgnoreCase(destination.trim());
        } else {
            trains = trainRepository.findAll();
        }
        if (date != null && isValidDate(date)) {
            for (Train t : trains) {
                t.setAvailability(computeAvailability(t, date));
            }
        }
        return trains;
    }

    public Train getByNumber(String trainNumber, String date) {
        Train train = trainRepository.findByTrainNumber(trainNumber)
                .orElseThrow(() -> ApiException.notFound("TRAIN_NOT_FOUND", "Train not found."));
        String effectiveDate = (date != null && isValidDate(date)) ? date : LocalDate.now().toString();
        train.setAvailability(computeAvailability(train, effectiveDate));
        return train;
    }

    /** Derive class-wise availability from actual passenger rows (never a drifting counter). */
    public Map<String, ClassAvailability> computeAvailability(Train train, String date) {
        Map<String, ClassAvailability> result = new LinkedHashMap<>();
        for (TrainClass cls : train.getClasses()) {
            List<Passenger> rows = passengerRepository.findForInventory(train.getTrainNumber(), date, cls.getClassType());
            long confirmed = rows.stream().filter(p -> "CONFIRMED".equals(p.getStatus())).count();
            long rac = rows.stream().filter(p -> "RAC".equals(p.getStatus())).count();
            long wl = rows.stream().filter(p -> "WL".equals(p.getStatus())).count();
            long available = Math.max(0, cls.getTotalSeats() - confirmed);
            long racAvailable = Math.max(0, cls.getRacLimit() - rac);
            long waitingAvailable = Math.max(0, cls.getWaitingLimit() - wl);
            String status = available > 0 ? "AVAILABLE" : racAvailable > 0 ? "RAC" : waitingAvailable > 0 ? "WL" : "FULL";
            result.put(cls.getClassType(), new ClassAvailability(
                    cls.getClassType(), cls.getTotalSeats(), cls.getFare(), cls.getRacLimit(), cls.getWaitingLimit(),
                    confirmed, available, rac, wl, racAvailable, waitingAvailable, status));
        }
        return result;
    }

    @Transactional
    public Train addTrain(TrainInput input) {
        if (trainRepository.existsByTrainNumber(input.trainNumber())) {
            throw ApiException.conflict("TRAIN_EXISTS", "A train with this number already exists.");
        }
        Train train = Train.builder()
                .trainNumber(input.trainNumber().trim())
                .trainName(input.trainName().trim())
                .source(input.source().trim())
                .destination(input.destination().trim())
                .departureTime(input.departureTime())
                .arrivalTime(input.arrivalTime())
                .durationMinutes(input.durationMinutes())
                .distanceKm(input.distanceKm())
                .trainType(input.trainType())
                .daysOfRun(input.daysOfRun() == null ? List.of() : input.daysOfRun())
                .build();
        applyClasses(train, input.classes());
        return trainRepository.save(train);
    }

    @Transactional
    public int addAllTrains(List<TrainInput> inputs) {
        int added = 0;
        for (TrainInput input : inputs) {
            addTrain(input);
            added++;
        }
        return added;
    }

    @Transactional
    public Train updateTrain(String trainNumber, TrainInput input) {
        Train train = trainRepository.findByTrainNumber(trainNumber)
                .orElseThrow(() -> ApiException.notFound("TRAIN_NOT_FOUND", "Train not found."));
        train.setTrainName(input.trainName().trim());
        train.setSource(input.source().trim());
        train.setDestination(input.destination().trim());
        train.setDepartureTime(input.departureTime());
        train.setArrivalTime(input.arrivalTime());
        train.setDurationMinutes(input.durationMinutes());
        train.setDistanceKm(input.distanceKm());
        train.setTrainType(input.trainType());
        if (input.daysOfRun() != null) train.setDaysOfRun(input.daysOfRun());
        train.replaceClasses(null);
        applyClasses(train, input.classes());
        return trainRepository.save(train);
    }

    @Transactional
    public void deleteTrain(String trainNumber) {
        Train train = trainRepository.findByTrainNumber(trainNumber)
                .orElseThrow(() -> ApiException.notFound("TRAIN_NOT_FOUND", "Train not found."));
        if (bookingRepository.existsByTrainNumberAndStatusNot(trainNumber, "CANCELLED")) {
            throw ApiException.conflict("TRAIN_HAS_BOOKINGS",
                    "This train has active bookings and cannot be deleted. Cancel them first.");
        }
        trainRepository.delete(train);
    }

    private void applyClasses(Train train, List<TrainClassInput> classes) {
        if (classes == null) return;
        for (TrainClassInput c : classes) {
            train.addClass(TrainClass.builder()
                    .classType(c.classType())
                    .totalSeats(c.totalSeats())
                    .fare(c.fare())
                    .racLimit(c.racLimit())
                    .waitingLimit(c.waitingLimit())
                    .build());
        }
    }

    private boolean isValidDate(String s) {
        try {
            LocalDate.parse(s);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
