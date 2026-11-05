package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.config.JwtUtil;
import com.irctc.irctcbackend.dto.AuthResponse;
import com.irctc.irctcbackend.dto.LoginRequest;
import com.irctc.irctcbackend.dto.RegisterRequest;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired private UserService userService;
    @Autowired private JwtUtil jwtUtil;

    @Value("${railgpt.cookie.secure:false}")
    private boolean cookieSecure;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        User user = userService.register(request);
        return issueSession(user, response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        User user = userService.authenticate(request.email(), request.password());
        return issueSession(user, response, HttpStatus.OK);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, User>> me(Authentication authentication) {
        User user = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(Map.of("user", user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Boolean>> logout(HttpServletResponse response) {
        ResponseCookie cookie = baseCookie("").maxAge(Duration.ZERO).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private ResponseEntity<AuthResponse> issueSession(User user, HttpServletResponse response, HttpStatus status) {
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        ResponseCookie cookie = baseCookie(token)
                .maxAge(Duration.ofMillis(jwtUtil.getExpirationMs()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        AuthResponse body = new AuthResponse(token, jwtUtil.getExpirationMs() / 1000, user);
        return ResponseEntity.status(status).body(body);
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from("token", value)
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .secure(cookieSecure);
    }
}
