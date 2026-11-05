package com.irctc.irctcbackend.dto;

import jakarta.validation.constraints.*;

public record TrainClassInput(
        @NotBlank(message = "Class type is required")
        String classType,

        @NotNull @Min(value = 1, message = "Total seats must be at least 1")
        Integer totalSeats,

        @NotNull @Min(value = 0, message = "Fare cannot be negative")
        Integer fare,

        @NotNull @Min(0) Integer racLimit,
        @NotNull @Min(0) Integer waitingLimit
) {}
