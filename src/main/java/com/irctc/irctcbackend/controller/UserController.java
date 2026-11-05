package com.irctc.irctcbackend.controller;

import com.irctc.irctcbackend.dto.ChangePasswordRequest;
import com.irctc.irctcbackend.dto.ProfileUpdateRequest;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired private UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<Map<String, User>> profile(Authentication authentication) {
        User user = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(Map.of("user", user));
    }

    @PatchMapping("/profile")
    public ResponseEntity<Map<String, User>> updateProfile(@Valid @RequestBody ProfileUpdateRequest request,
                                                           Authentication authentication) {
        User user = userService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(Map.of("user", user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Boolean>> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                               Authentication authentication) {
        userService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
