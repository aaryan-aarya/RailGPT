package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.Station;
import com.irctc.irctcbackend.repository.TrainRepository;
import com.irctc.irctcbackend.service.StationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
public class MetaController {

    @Autowired private StationService stationService;
    @Autowired private TrainRepository trainRepository;

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mode", "demo");
        m.put("name", "RailGPT API");
        m.put("version", "1.0.0");
        m.put("disclaimer", "Illustrative catalog — not a live Indian Railways integration.");
        m.put("stations", stationService.all().size());
        m.put("trains", trainRepository.count());
        return m;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/stations")
    public List<Station> stations(@RequestParam(required = false) String q) {
        return stationService.search(q);
    }
}
