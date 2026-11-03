package com.irctc.irctcbackend.controller;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.service.UserService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserService userService;


    // REGISTER API
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {

        User registeredUser = userService.registerUser(user);

        String token = userService.generateToken(
                registeredUser.getEmail()
        );

        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true)
                .secure(false) // true in production with HTTPS
                .path("/")
                .maxAge(Duration.ofHours(24))
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(registeredUser);
    }

    // LOGIN API
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {

        String token = userService.loginUser(
                user.getEmail(),
                user.getPassword()
        );

        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(Duration.ofHours(24))
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body("Login successful");
    }
}