package com.employee.payment.payment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PaymentPeriodCreateRequest(

        @NotNull
        @Min(1)
        @Max(12)
        Integer month,

        @NotNull
        @Min(2000)
        Integer year,

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate endDate
) {
}