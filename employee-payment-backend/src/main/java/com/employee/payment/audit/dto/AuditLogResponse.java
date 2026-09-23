package com.employee.payment.audit.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        Long adminId,
        String adminName,
        String adminUsername,
        String action,
        String entityType,
        Long entityId,
        String description,
        LocalDateTime createdAt
) {
}