
package com.employee.payment.payment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record MultiMonthPaymentUpdateRequest(

        @NotNull
        LocalDate paymentDate,

        @NotEmpty
        List<@NotNull @Valid PaymentMonthlyDetailRequest> monthlyDetails

) {
}
