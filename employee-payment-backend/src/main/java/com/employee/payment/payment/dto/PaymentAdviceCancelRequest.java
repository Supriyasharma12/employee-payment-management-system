package com.employee.payment.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentAdviceCancelRequest(

        @NotBlank(message = "Cancellation reason is mandatory")
        @Size(max = 500, message = "Cancellation reason cannot exceed 500 characters")
        String cancellationReason

) {
}