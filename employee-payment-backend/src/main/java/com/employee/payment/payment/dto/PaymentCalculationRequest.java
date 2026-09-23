package com.employee.payment.payment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record PaymentCalculationRequest(

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