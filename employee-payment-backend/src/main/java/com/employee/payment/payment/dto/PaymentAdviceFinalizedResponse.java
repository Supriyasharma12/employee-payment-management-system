package com.employee.payment.payment.dto;

import java.time.LocalDate;
import java.util.List;

public record PaymentAdviceFinalizedResponse(
        Long id,
        String referenceNo,
        Long paymentBatchId,
        Long bankId,
        String bankName,
        LocalDate adviceDate,
        String status,
        String cancellationReason,
        List<PaymentAdviceResponse> payments
) {
}