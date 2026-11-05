package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.dto.ChangePasswordRequest;
import com.irctc.irctcbackend.dto.ProfileUpdateRequest;
import com.irctc.irctcbackend.dto.RegisterRequest;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.exception.ApiException;
import com.irctc.irctcbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public User register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("EMAIL_EXISTS", "An account with this email already exists.");
        }
        User user = User.builder()
                .name(request.name().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role("USER") // never trust a client-supplied role
                .phone(request.phone())
                .build();
        return userRepository.save(user);
    }

    /** Enumeration-safe: identical error for unknown email and wrong password. */
    public User authenticate(String email, String password) {
        User user = userRepository.findByEmail(email == null ? "" : email.trim().toLowerCase())
                .orElseThrow(() -> ApiException.unauthorized("INVALID_CREDENTIALS", "Invalid email or password."));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw ApiException.unauthorized("INVALID_CREDENTIALS", "Invalid email or password.");
        }
        return user;
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found."));
    }

    @Transactional
    public User updateProfile(String email, ProfileUpdateRequest request) {
        User user = getByEmail(email);
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone().isBlank() ? null : request.phone().trim());
        }
        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getByEmail(email);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw ApiException.badRequest("VALIDATION", "Current password is incorrect.");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
