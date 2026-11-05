package com.irctc.irctcbackend.dto;

import jakarta.validation.constraints.*;

public record PassengerInput(
        @NotBlank(message = "Passenger name is required")
        @Size(min = 2, max = 100, message = "Enter the passenger's full name")
        String name,

        @NotNull(message = "Age is required")
        @Min(value = 1, message = "Age must be at least 1")
        @Max(value = 120, message = "Age must be 120 or under")
        Integer age,

        @NotBlank(message = "Gender is required")
        @Pattern(regexp = "M|F|O", message = "Gender must be M, F or O")
        String gender,

        String berthPreference
) {}
