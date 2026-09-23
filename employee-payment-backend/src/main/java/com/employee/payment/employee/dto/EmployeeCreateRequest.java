package com.employee.payment.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

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

        @NotBlank(message = "Account number is required")
        @Size(max = 50, message = "Account number cannot exceed 50 characters")
        String accountNumber,

        @NotBlank(message = "IFSC code is required")
        @Size(max = 20, message = "IFSC code cannot exceed 20 characters")
        String ifscCode,

        @Size(max = 100, message = "Position cannot exceed 100 characters")
        String position,

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