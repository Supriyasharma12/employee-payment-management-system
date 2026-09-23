package com.employee.payment.admin.dto;

import java.time.LocalDateTime;

public record AdminResponse(

        Long id,
        String name,
        String username,
        String role,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime lastLoginAt
) {
}