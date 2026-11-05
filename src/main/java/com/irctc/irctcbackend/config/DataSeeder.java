package com.irctc.irctcbackend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.irctc.irctcbackend.dto.TrainInput;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.repository.TrainRepository;
import com.irctc.irctcbackend.repository.UserRepository;
import com.irctc.irctcbackend.service.TrainService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;

/**
 * Seeds the illustrative catalog + demo accounts on first run (empty DB only).
 * This is sample data, NOT a live Indian Railways feed.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired private ResourceLoader resourceLoader;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TrainRepository trainRepository;
    @Autowired private TrainService trainService;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        Resource resource = resourceLoader.getResource("classpath:seed-data.json");
        JsonNode root;
        try (InputStream in = resource.getInputStream()) {
            root = objectMapper.readTree(in);
        }

        if (userRepository.count() == 0) {
            for (JsonNode u : root.get("users")) {
                User user = User.builder()
                        .name(u.get("name").asText())
                        .email(u.get("email").asText().toLowerCase())
                        .password(passwordEncoder.encode(u.get("password").asText()))
                        .role(u.get("role").asText())
                        .phone(u.has("phone") ? u.get("phone").asText() : null)
                        .build();
                userRepository.save(user);
            }
            log.info("Seeded {} demo accounts.", root.get("users").size());
        }

        if (trainRepository.count() == 0) {
            int count = 0;
            for (JsonNode t : root.get("trains")) {
                TrainInput input = objectMapper.treeToValue(t, TrainInput.class);
                trainService.addTrain(input);
                count++;
            }
            log.info("Seeded {} trains (illustrative catalog).", count);
        }
    }
}
