package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.repository.TrainRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TrainService {

    @Autowired
    private TrainRepository trainRepository;

    public Train addTrain(Train train) {
        return trainRepository.save(train);
    }

    public List<Train> addAllTrains(List<Train> trains) {
        return trainRepository.saveAll(trains);
    }

    public List<Train> getAllTrains() {
        return trainRepository.findAll();
    }

    public List<Train> searchTrains(String source, String destination) {
        return trainRepository
                .findBySourceIgnoreCaseAndDestinationIgnoreCase(
                        source,
                        destination
                );
    }

    public Train getTrainByNumber(String trainNumber) {

        return trainRepository
                .findByTrainNumber(trainNumber)
                .orElseThrow(() ->
                        new RuntimeException("Train Not Found"));
    }
}