package com.irctc.irctcbackend.dto;

public record AdminEmailOutboxItem(
        long id,
        String pnr,
        String recipient,
        String eventType,
        String statusSnapshot,
        String status,
        int attempts,
        long createdAt,
        String lastError
) {}
