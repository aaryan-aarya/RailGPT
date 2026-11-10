package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.TrainInput;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.service.TrainService;
import com.irctc.irctcbackend.service.AdminActivityService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/train")
public class TrainController {

    @Autowired private TrainService trainService;
    @Autowired private AdminActivityService adminActivityService;

    @GetMapping("/all")
    public List<Train> all() {
        return trainService.getAll();
    }

    @GetMapping("/search")
    public List<Train> search(@RequestParam(required = false) String source,
                              @RequestParam(required = false) String destination,
                              @RequestParam(required = false) String date) {
        return trainService.search(source, destination, date);
    }

    @GetMapping("/seats/{trainNumber}")
    public Train seats(@PathVariable String trainNumber, @RequestParam(required = false) String date) {
        return trainService.getByNumber(trainNumber, date);
    }

    @GetMapping("/{trainNumber}")
    public Train byNumber(@PathVariable String trainNumber, @RequestParam(required = false) String date) {
        return trainService.getByNumber(trainNumber, date);
    }

    @PostMapping("/add")
    @Transactional
    public ResponseEntity<Train> add(@Valid @RequestBody TrainInput input, Authentication authentication) {
        Train train = trainService.addTrain(input);
        adminActivityService.record(authentication.getName(), "TRAIN_CREATED", "TRAIN", train.getTrainNumber(),
                "Added train " + train.getTrainName() + ".");
        return ResponseEntity.status(HttpStatus.CREATED).body(train);
    }

    @PostMapping("/addAll")
    @Transactional
    public ResponseEntity<Map<String, Object>> addAll(@RequestBody List<TrainInput> inputs, Authentication authentication) {
        int added = trainService.addAllTrains(inputs);
        adminActivityService.record(authentication.getName(), "TRAINS_IMPORTED", "TRAIN_CATALOG", "bulk",
                "Imported " + added + " train(s).");
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("added", added));
    }

    @PutMapping("/{trainNumber}")
    @Transactional
    public Train update(@PathVariable String trainNumber, @Valid @RequestBody TrainInput input, Authentication authentication) {
        Train train = trainService.updateTrain(trainNumber, input);
        adminActivityService.record(authentication.getName(), "TRAIN_UPDATED", "TRAIN", trainNumber,
                "Updated train " + train.getTrainName() + ".");
        return train;
    }

    @DeleteMapping("/{trainNumber}")
    @Transactional
    public ResponseEntity<Map<String, Boolean>> delete(@PathVariable String trainNumber, Authentication authentication) {
        trainService.deleteTrain(trainNumber);
        adminActivityService.record(authentication.getName(), "TRAIN_REMOVED", "TRAIN", trainNumber,
                "Removed train from the catalog.");
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
