package com.employee.payment.auth.dto;

public record LoginResponse(

        String token,
        String message,
        Long adminId,
        String name,
        String username,
        String role
) {
}