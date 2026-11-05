package com.irctc.irctcbackend.dto;

public record AdminStats(
        long users,
        long trains,
        long bookings,
        long confirmed,
        long rac,
        long wl,
        long cancelled,
        long revenue
) {}
