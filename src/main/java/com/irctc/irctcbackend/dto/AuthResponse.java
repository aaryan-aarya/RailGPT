package com.irctc.irctcbackend.dto;

import com.irctc.irctcbackend.entity.User;

public record AuthResponse(String token, long expiresIn, User user) {}
