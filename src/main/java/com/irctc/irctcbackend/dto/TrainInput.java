package com.irctc.irctcbackend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record TrainInput(
        @NotBlank(message = "Train number is required")
        @Size(min = 4, max = 10)
        String trainNumber,

        @NotBlank(message = "Train name is required")
        String trainName,

        @NotBlank(message = "Source is required")
        String source,

        @NotBlank(message = "Destination is required")
        String destination,

        String departureTime,
        String arrivalTime,
        Integer durationMinutes,
        Integer distanceKm,
        String trainType,
        List<String> daysOfRun,

        @NotEmpty(message = "At least one class is required")
        List<@Valid TrainClassInput> classes
) {}
