package com.employee.payment.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeCreateRequest(

        @NotBlank(message = "Employee code is required")
        @Pattern(
                regexp = "^[0-9]+$",
                message = "Employee code must contain numbers only"
        )
        @Size(max = 30, message = "Employee code cannot exceed 30 characters")
        String employeeCode,

        @NotBlank(message = "Employee name is required")
        @Size(max = 150, message = "Employee name cannot exceed 150 characters")
        String name,

        // PAN NUMBER - OPTIONAL
        @Pattern(
                regexp = "^$|^[A-Z]{5}[0-9]{4}[A-Z]$",
                message = "Please enter a valid PAN number"
        )
        String panNumber,

        @NotBlank(message = "Account number is required")
        @Size(max = 50, message = "Account number cannot exceed 50 characters")
        String accountNumber,

        @Size(max = 20, message = "IFSC code cannot exceed 20 characters")
        String ifscCode,

        // ============================================================
        // EMPLOYEE DETAILS
        // ============================================================

        @NotBlank(message = "Department is required")
        @Size(max = 50, message = "Department cannot exceed 50 characters")
        String department,

        // Medical Card ID / UHID - OPTIONAL
        @Size(max = 50, message = "Medical Card ID cannot exceed 50 characters")
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

        @Size(max = 20, message = "Phone number cannot exceed 20 characters")
        String phoneNumber,

        @Email(message = "Please enter a valid email address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @PositiveOrZero(message = "Grade pay cannot be negative")
        BigDecimal gradePay,

        @Size(max = 100, message = "Scale cannot exceed 100 characters")
        String scale,

        @Size(max = 150, message = "Headquarters cannot exceed 150 characters")
        String headquarters,

        @Size(max = 150, message = "Designation cannot exceed 150 characters")
        String designation,

        @NotNull(message = "Employee category is required")
        Long categoryId,

        Long bankId
) {
}