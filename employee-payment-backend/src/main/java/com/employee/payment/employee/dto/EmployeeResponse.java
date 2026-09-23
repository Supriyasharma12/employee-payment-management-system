package com.employee.payment.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EmployeeResponse(

        Long id,
        String employeeCode,
        String name,
        String accountNumber,
        String ifscCode,
        String position,
        String phoneNumber,
        String email,
        BigDecimal gradePay,
        String scale,
        String headquarters,
        String designation,

        Long categoryId,
        String categoryName,

        Long bankId,
        String bankName,

        Boolean active,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}