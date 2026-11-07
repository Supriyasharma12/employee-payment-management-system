package com.employee.payment.payment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentCreateRequest(

        @NotNull
        Long employeeId,

        @NotNull
        Long paymentPeriodId,

        @NotNull
        @Positive
        Long paymentBatchId,

        @NotNull
        LocalDate paymentDate,

        @NotNull
        @PositiveOrZero
        BigDecimal runningTa,

        @NotNull
        @PositiveOrZero
        BigDecimal fixedTa,

        @NotNull
        @PositiveOrZero
        BigDecimal other,

        @NotNull
        @PositiveOrZero
        BigDecimal miscellaneous,

        @NotNull
        @PositiveOrZero
        BigDecimal advanceTa,

        @NotNull
        @PositiveOrZero
        BigDecimal advanceOther
) {
}