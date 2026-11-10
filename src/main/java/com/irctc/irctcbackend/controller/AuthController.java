
package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.config.JwtUtil;
import com.irctc.irctcbackend.dto.AuthResponse;
import com.irctc.irctcbackend.dto.LoginRequest;
import com.irctc.irctcbackend.dto.RegisterRequest;
import com.irctc.irctcbackend.dto.VerifyOtpRequest;
import com.irctc.irctcbackend.dto.ResendOtpRequest;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.service.UserService;
import com.irctc.irctcbackend.service.RegistrationOtpService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

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

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final RegistrationOtpService registrationOtpService;

    @Value("${railgpt.cookie.secure:false}")
    private boolean cookieSecure;

    public AuthController(
            UserService userService,
            JwtUtil jwtUtil,
            RegistrationOtpService registrationOtpService
    ) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.registrationOtpService = registrationOtpService;
    }

    // Step 1: Start registration and send OTP
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        registrationOtpService.startRegistration(request);

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of(
                        "message", "Verification OTP sent successfully.",
                        "email", request.email().trim().toLowerCase()
                ));
    }

    // Step 2: Verify OTP, create account and issue JWT
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletResponse response
    ) {
        User user = registrationOtpService.verifyOtp(
                request.email(),
                request.otp()
        );

        return issueSession(user, response, HttpStatus.CREATED);
    }

    // Resend registration OTP
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request
    ) {
        registrationOtpService.resendOtp(request.email());

        return ResponseEntity.ok(
                Map.of("message", "A new verification OTP has been sent.")
        );
    }

    // Existing login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        User user = userService.authenticate(
                request.email(),
                request.password()
        );

        return issueSession(user, response, HttpStatus.OK);
    }

    // Existing current-user endpoint
    @GetMapping("/me")
    public ResponseEntity<Map<String, User>> me(
            Authentication authentication
    ) {
        User user = userService.getByEmail(authentication.getName());

        return ResponseEntity.ok(Map.of("user", user));
    }

    // Existing logout
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Boolean>> logout(
            HttpServletResponse response
    ) {
        ResponseCookie cookie = baseCookie("")
                .maxAge(Duration.ZERO)
                .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                cookie.toString()
        );

        return ResponseEntity.ok(Map.of("ok", true));
    }

    // Shared JWT session creation
    private ResponseEntity<AuthResponse> issueSession(
            User user,
            HttpServletResponse response,
            HttpStatus status
    ) {
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole()
        );

        ResponseCookie cookie = baseCookie(token)
                .maxAge(Duration.ofMillis(jwtUtil.getExpirationMs()))
                .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                cookie.toString()
        );

        AuthResponse body = new AuthResponse(
                token,
                jwtUtil.getExpirationMs() / 1000,
                user
        );

        return ResponseEntity.status(status).body(body);
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(
            String value
    ) {
        return ResponseCookie.from("token", value)
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .secure(cookieSecure);
    }
}
