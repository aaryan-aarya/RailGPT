package com.irctc.irctcbackend.dto;

import jakarta.validation.constraints.Pattern;

public record AdminRoleUpdateRequest(
        @Pattern(regexp = "USER|ADMIN", message = "Role must be USER or ADMIN.") String role
) {}
