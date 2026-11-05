package com.irctc.irctcbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.irctc.irctcbackend.dto.Station;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class StationService {

    @Autowired private ResourceLoader resourceLoader;
    @Autowired private ObjectMapper objectMapper;

    private final List<Station> stations = new ArrayList<>();

    @PostConstruct
    void load() {
        try {
            Resource resource = resourceLoader.getResource("classpath:seed-data.json");
            try (InputStream in = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(in);
                for (JsonNode s : root.get("stations")) {
                    stations.add(new Station(s.get("code").asText(), s.get("name").asText(),
                            s.get("city").asText(), s.get("state").asText()));
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Unable to load station catalog from seed-data.json", e);
        }
    }

    public List<Station> all() {
        return stations;
    }

    public List<Station> search(String q) {
        if (q == null || q.isBlank()) return stations;
        String needle = q.toLowerCase(Locale.ROOT);
        List<Station> result = new ArrayList<>();
        for (Station s : stations) {
            if (s.name().toLowerCase(Locale.ROOT).contains(needle)
                    || s.code().toLowerCase(Locale.ROOT).contains(needle)
                    || s.city().toLowerCase(Locale.ROOT).contains(needle)) {
                result.add(s);
            }
        }
        return result;
    }
}
