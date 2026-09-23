package com.employee.payment.admin.dto;

public record LoginResponse(

//        String token,
        String message,
        Long adminId,
        String name,
        String username,
        String role

) {
}