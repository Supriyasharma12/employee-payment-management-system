package com.employee.payment.payment.dto;

import java.math.BigDecimal;

public record PaymentAdviceResponse(

        Long paymentId,

        String employeeCode,

        String employeeName,

        String bankName,

        String accountNumber,

        String ifscCode,

        String categoryName,

        Integer month,

        Integer year,

        BigDecimal netPayment,

        String status

) {
}