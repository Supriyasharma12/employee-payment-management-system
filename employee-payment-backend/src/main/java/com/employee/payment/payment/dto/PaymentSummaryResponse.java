package com.employee.payment.payment.dto;

import java.math.BigDecimal;

public record PaymentSummaryResponse(

        Long paymentId,

        Long employeeId,
        String employeeCode,
        String employeeName,
        String panNumber,

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

        BigDecimal netPayment,

        String status
) {
}