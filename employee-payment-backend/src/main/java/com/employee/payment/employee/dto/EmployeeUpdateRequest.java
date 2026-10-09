package com.employee.payment.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeUpdateRequest(

        @NotBlank(message = "Employee name is required")
        @Size(max = 150)
        String name,

        // PAN NUMBER - OPTIONAL
        @Pattern(
                regexp = "^$|^[A-Z]{5}[0-9]{4}[A-Z]$",
                message = "Please enter a valid PAN number"
        )
        String panNumber,

        @NotBlank(message = "Account number is required")
        @Size(max = 50)
        String accountNumber,

        @Size(max = 20)
        String ifscCode,

        // ============================================================
        // EMPLOYEE DETAILS
        // ============================================================

        @NotBlank(message = "Department is required")
        @Size(max = 50)
        String department,

        // Medical Card ID / UHID - OPTIONAL
        @Size(max = 50)
        String medicalCardId,

        // UAN - OPTIONAL
        @Pattern(
                regexp = "^$|^[0-9]{12}$",
                message = "UAN must be exactly 12 digits"
        )
        String uan,

// Aadhaar - OPTIONAL
        @Pattern(
                regexp = "^$|^[0-9]{12}$",
                message = "Aadhaar must be exactly 12 digits"
        )
        String aadhaar,

        // Date of Birth - OPTIONAL
        LocalDate dateOfBirth,

        // Date of Joining - OPTIONAL
        LocalDate dateOfJoining,

        // ============================================================
        // EXISTING EMPLOYEE DETAILS
        // ============================================================

        @Size(max = 20)
        String phoneNumber,

        @Email(message = "Please enter a valid email address")
        @Size(max = 150)
        String email,

        @PositiveOrZero(message = "Grade pay cannot be negative")
        BigDecimal gradePay,

        @Size(max = 100)
        String scale,

        @Size(max = 150)
        String headquarters,

        @Size(max = 150)
        String designation,

        @NotNull(message = "Employee category is required")
        Long categoryId,

        Long bankId
) {
}