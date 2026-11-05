package com.irctc.irctcbackend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record BookingRequest(
        @NotBlank(message = "Train number is required")
        String trainNumber,

        @NotBlank(message = "Journey date is required")
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Journey date must be YYYY-MM-DD")
        String journeyDate,

        @NotBlank(message = "Class is required")
        String classType,

        @NotEmpty(message = "At least one passenger is required")
        @Size(max = 6, message = "Up to 6 passengers per booking")
        List<@Valid PassengerInput> passengers,

        String boarding,
        String reservation
) {}
