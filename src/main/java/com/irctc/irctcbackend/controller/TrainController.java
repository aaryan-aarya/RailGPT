package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.service.TrainService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/train")
public class TrainController {

    @Autowired
    private TrainService trainService;

    @PostMapping("/add")
    public Train addTrain(@RequestBody Train train) {
        return trainService.addTrain(train);
    }

    @PostMapping("/addAll")
    public List<Train> addAllTrains(@RequestBody List<Train> trains) {
        return trainService.addAllTrains(trains);
    }

    @GetMapping("/all")
    public List<Train> getAllTrains() {
        return trainService.getAllTrains();
    }

    @GetMapping("/search")
    public List<Train> searchTrains(
            @RequestParam String source,
            @RequestParam String destination) {

        return trainService.searchTrains(
                source,
                destination
        );
    }

    @GetMapping("/seats/{trainNumber}")
    public Train getSeatAvailability(
            @PathVariable String trainNumber) {

        return trainService.getTrainByNumber(
                trainNumber
        );
    }
}