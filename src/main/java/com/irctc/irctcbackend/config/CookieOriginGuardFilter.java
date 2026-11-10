package com.irctc.irctcbackend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Same-origin protection for unsafe requests authenticated by the ambient
 * httpOnly session cookie. Cookie-authenticated writes are checked even when
 * an Authorization header is present, so an invalid bearer token cannot
 * downgrade to cookie auth and bypass this check.
 */
@Component
public class CookieOriginGuardFilter extends OncePerRequestFilter {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final Set<String> allowedOrigins;
    private final ObjectMapper objectMapper;

    public CookieOriginGuardFilter(
            @Value("${railgpt.cors.allowed-origins:http://localhost:5173}") String configuredOrigins,
            ObjectMapper objectMapper
    ) {
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim).filter(value -> !value.isEmpty()).collect(Collectors.toUnmodifiableSet());
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!SAFE_METHODS.contains(request.getMethod().toUpperCase())
                && hasSessionCookie(request)) {
            String origin = request.getHeader("Origin");
            if (origin == null || !allowedOrigins.contains(origin)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), Map.of(
                        "code", "ORIGIN_REJECTED",
                        "message", "Cookie-authenticated requests must come from an allowed browser origin."
                ));
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean hasSessionCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return false;
        return Arrays.stream(cookies).anyMatch(cookie -> "token".equals(cookie.getName()));
    }
}
