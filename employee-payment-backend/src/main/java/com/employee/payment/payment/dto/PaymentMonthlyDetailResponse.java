package com.employee.payment.payment.dto;

import java.math.BigDecimal;

public record PaymentMonthlyDetailResponse(
        Long id,
        Long paymentPeriodId,
        Integer month,
        Integer year,
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