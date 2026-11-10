package com.irctc.irctcbackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Fails startup when production would otherwise run with unsafe or incomplete settings. */
@Component
@Profile("prod")
public class ProductionConfigurationValidator implements ApplicationRunner {
    private final String jwtSecret;
    private final String otpSecret;
    private final String allowedOrigins;
    private final boolean secureCookie;
    private final String smtpHost;
    private final int smtpPort;
    private final String smtpUsername;
    private final String smtpPassword;

    public ProductionConfigurationValidator(
            @Value("${railgpt.jwt.secret:}") String jwtSecret,
            @Value("${railgpt.otp.hash-secret:}") String otpSecret,
            @Value("${railgpt.cors.allowed-origins:}") String allowedOrigins,
            @Value("${railgpt.cookie.secure:false}") boolean secureCookie,
            @Value("${spring.mail.host:}") String smtpHost,
            @Value("${spring.mail.port:0}") int smtpPort,
            @Value("${spring.mail.username:}") String smtpUsername,
            @Value("${spring.mail.password:}") String smtpPassword) {
        this.jwtSecret = jwtSecret;
        this.otpSecret = otpSecret;
        this.allowedOrigins = allowedOrigins;
        this.secureCookie = secureCookie;
        this.smtpHost = smtpHost;
        this.smtpPort = smtpPort;
        this.smtpUsername = smtpUsername;
        this.smtpPassword = smtpPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        requireSecret(jwtSecret, "JWT_SECRET");
        requireSecret(otpSecret, "OTP_HASH_SECRET");
        requireHttpsOrigins(allowedOrigins);
        if (!secureCookie) {
            throw new IllegalStateException("Production requires COOKIE_SECURE=true.");
        }
        if (smtpHost == null || smtpHost.isBlank() || smtpPort < 1 || smtpPort > 65535
                || isPlaceholder(smtpUsername) || isPlaceholder(smtpPassword)) {
            throw new IllegalStateException("Production requires valid SMTP host, port, username, and password settings.");
        }
    }

    private void requireSecret(String value, String variable) {
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length < 32 || isPlaceholder(value)) {
            throw new IllegalStateException(variable + " must be a real secret of at least 32 bytes in production.");
        }
    }

    private boolean isPlaceholder(String value) {
        if (value == null || value.isBlank()) return true;
        String normalized = value.trim().toLowerCase();
        return normalized.contains("change-me") || normalized.contains("replace-with")
                || normalized.contains("your-sender") || normalized.contains("your-smtp");
    }

    private void requireHttpsOrigins(String configuredOrigins) {
        if (configuredOrigins == null || configuredOrigins.isBlank()) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS must contain the public HTTPS site origin.");
        }
        Arrays.stream(configuredOrigins.split(",")).map(String::trim).forEach(origin -> {
            try {
                URI uri = URI.create(origin);
                if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                        || uri.getRawUserInfo() != null || (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath()))
                        || uri.getQuery() != null || uri.getFragment() != null) {
                    throw new IllegalArgumentException();
                }
            } catch (IllegalArgumentException ex) {
                throw new IllegalStateException("CORS_ALLOWED_ORIGINS must be a comma-separated list of HTTPS origins without paths.");
            }
        });
    }
}
