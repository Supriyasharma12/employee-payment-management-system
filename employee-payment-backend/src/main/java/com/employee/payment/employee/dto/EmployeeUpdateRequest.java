package com.employee.payment.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record EmployeeUpdateRequest(

        @NotBlank(message = "Employee name is required")
        @Size(max = 150)
        String name,

        @NotBlank(message = "Account number is required")
        @Size(max = 50)
        String accountNumber,

        @NotBlank(message = "IFSC code is required")
        @Size(max = 20)
        String ifscCode,

        @Size(max = 100)
        String position,

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