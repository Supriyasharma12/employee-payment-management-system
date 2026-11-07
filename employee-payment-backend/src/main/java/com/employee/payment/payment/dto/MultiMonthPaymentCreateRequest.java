package com.employee.payment.payment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.util.List;

public record MultiMonthPaymentCreateRequest(

        @NotNull
        Long employeeId,

        @NotNull
        @Positive
        Long paymentBatchId,

        @NotNull
        LocalDate paymentDate,

        @NotEmpty
        List<@NotNull @Valid PaymentMonthlyDetailRequest> monthlyDetails

) {
}