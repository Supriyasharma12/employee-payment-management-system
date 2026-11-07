
package com.employee.payment.payment.dto;

import java.math.BigDecimal;
import java.util.List;

public record MultiMonthPaymentCreateResponse(

        PaymentResponse payment,

        List<MonthlyPaymentResult> monthlyResults,

        List<String> warnings

) {

    public record MonthlyPaymentResult(
            Long paymentPeriodId,
            Integer month,
            Integer year,
            String status,
            String message,
            BigDecimal netPayment
    ) {
    }
}
