package com.irctc.irctcbackend.config;

import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** One-time, opt-in bootstrap for an initial production administrator. */
@Component
@ConditionalOnProperty(name = "railgpt.bootstrap-admin.enabled", havingValue = "true")
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder passwordEncoder,
                          @Value("${ADMIN_BOOTSTRAP_EMAIL:}") String email,
                          @Value("${ADMIN_BOOTSTRAP_PASSWORD:}") String password) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.email = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        this.password = password == null ? "" : password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.length() < 14) {
            throw new IllegalStateException("Admin bootstrap requires ADMIN_BOOTSTRAP_EMAIL and a 14+ character ADMIN_BOOTSTRAP_PASSWORD.");
        }
        if (users.existsByEmail(email)) {
            log.info("Configured bootstrap administrator already exists; no account changes made.");
            return;
        }
        users.save(User.builder()
                .name("Administrator")
                .email(email)
                .password(passwordEncoder.encode(password))
                .role("ADMIN")
                .build());
        log.info("Created the configured initial administrator account.");
    }
}
