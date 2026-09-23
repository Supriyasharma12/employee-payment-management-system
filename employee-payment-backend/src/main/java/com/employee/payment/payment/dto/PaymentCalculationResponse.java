package com.employee.payment.payment.dto;

import java.math.BigDecimal;

public record PaymentCalculationResponse(
        BigDecimal runningTa,
        BigDecimal fixedTa,
        BigDecimal other,
        BigDecimal grossTotal,

        BigDecimal miscellaneous,
        BigDecimal advanceTa,
        BigDecimal advanceOther,
        BigDecimal deductionTotal,

        BigDecimal netPayment
) {
}