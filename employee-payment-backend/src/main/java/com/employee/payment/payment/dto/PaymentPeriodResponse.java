package com.employee.payment.payment.dto;

import java.time.LocalDate;

public record PaymentPeriodResponse(

        Long id,
        Integer month,
        Integer year,
        LocalDate startDate,
        LocalDate endDate,
        String status
) {
}