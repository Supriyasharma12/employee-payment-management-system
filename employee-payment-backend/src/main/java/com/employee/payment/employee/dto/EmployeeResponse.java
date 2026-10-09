package com.employee.payment.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmployeeResponse(

        Long id,
        String employeeCode,
        String name,
        String panNumber,
        String accountNumber,
        String ifscCode,

        // ============================================================
        // EMPLOYEE DETAILS
        // ============================================================

        String department,
        String medicalCardId,
        String uan,
        String aadhaar,
        LocalDate dateOfBirth,
        LocalDate dateOfJoining,

        // ============================================================
        // EXISTING EMPLOYEE DETAILS
        // ============================================================

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