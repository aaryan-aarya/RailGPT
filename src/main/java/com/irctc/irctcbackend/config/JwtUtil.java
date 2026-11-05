package com.irctc.irctcbackend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.SecureRandom;
import java.util.Date;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${railgpt.jwt.secret:}")
    private String configuredSecret;

    @Value("${railgpt.jwt.expiration-ms:3600000}")
    private long expirationMs;

    private Key key;

    @PostConstruct
    void init() {
        if (configuredSecret != null && configuredSecret.getBytes(StandardCharsets.UTF_8).length >= 32) {
            key = Keys.hmacShaKeyFor(configuredSecret.getBytes(StandardCharsets.UTF_8));
            log.info("JWT signing key loaded from configuration.");
        } else {
            // No hardcoded secret: generate an ephemeral 256-bit key. Set JWT_SECRET
            // (railgpt.jwt.secret) in production so tokens survive restarts.
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            key = Keys.hmacShaKeyFor(random);
            log.warn("railgpt.jwt.secret not set (or < 32 bytes); using an ephemeral signing key. "
                    + "Set JWT_SECRET in production for stable sessions.");
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public String generateToken(String email, String role) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims getClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extractRole(String token) {
        Object role = getClaims(token).get("role");
        return role == null ? "USER" : role.toString();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = getClaims(token);
            return claims.getExpiration() != null && claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
