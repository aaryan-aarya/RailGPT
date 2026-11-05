package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.TrainInput;
import com.irctc.irctcbackend.entity.Train;
import com.irctc.irctcbackend.service.TrainService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/train")
public class TrainController {

    @Autowired private TrainService trainService;

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
    public ResponseEntity<Train> add(@Valid @RequestBody TrainInput input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(trainService.addTrain(input));
    }

    @PostMapping("/addAll")
    public ResponseEntity<Map<String, Object>> addAll(@RequestBody List<TrainInput> inputs) {
        int added = trainService.addAllTrains(inputs);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("added", added));
    }

    @PutMapping("/{trainNumber}")
    public Train update(@PathVariable String trainNumber, @Valid @RequestBody TrainInput input) {
        return trainService.updateTrain(trainNumber, input);
    }

    @DeleteMapping("/{trainNumber}")
    public ResponseEntity<Map<String, Boolean>> delete(@PathVariable String trainNumber) {
        trainService.deleteTrain(trainNumber);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
