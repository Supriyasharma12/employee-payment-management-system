package com.employee.payment.payment.dto;

import java.time.LocalDate;

public record PaymentAdviceFinalizationResponse(

        Long id,
        String referenceNo,
        Long paymentBatchId,
        Long bankId,
        String bankName,
        LocalDate adviceDate,
        String status,
        long paymentCount

) {
}