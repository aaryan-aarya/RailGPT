package com.irctc.irctcbackend.dto;

import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @Size(min = 2, max = 100, message = "Name must be 2–100 characters")
        String name,

        @Size(max = 20, message = "Phone number is too long")
        String phone
) {}
