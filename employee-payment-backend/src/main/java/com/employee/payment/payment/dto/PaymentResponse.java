package com.employee.payment.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PaymentResponse(

        Long id,

        Long employeeId,
        String employeeCode,
        String employeeName,

        Long paymentPeriodId,
        Integer month,
        Integer year,

        LocalDate paymentDate,

        BigDecimal runningTa,
        BigDecimal fixedTa,
        BigDecimal other,
        BigDecimal grossTotal,

        BigDecimal miscellaneous,
        BigDecimal advanceTa,
        BigDecimal advanceOther,
        BigDecimal deductionTotal,

        BigDecimal netPayment,

        String status,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}