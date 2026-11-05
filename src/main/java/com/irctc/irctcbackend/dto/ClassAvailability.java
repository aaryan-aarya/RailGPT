package com.irctc.irctcbackend.dto;

public record ClassAvailability(
        String classType,
        int totalSeats,
        int fare,
        int racLimit,
        int waitingLimit,
        long confirmedCount,
        long availableSeats,
        long racCount,
        long waitingCount,
        long racAvailable,
        long waitingAvailable,
        String status
) {}
