package com.employee.payment.payment.dto;

import jakarta.validation.constraints.NotNull;

public record PaymentAdviceFinalizeRequest(

        @NotNull(message = "Payment Batch ID is required")
        Long paymentBatchId,

        @NotNull(message = "Bank ID is required")
        Long bankId

) {
}