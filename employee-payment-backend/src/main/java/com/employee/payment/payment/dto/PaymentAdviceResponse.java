
package com.employee.payment.payment.dto;

import java.math.BigDecimal;
import java.util.List;

public record PaymentAdviceResponse(

        Long paymentId,

        String employeeCode,

        String employeeName,

        String bankName,

        String accountNumber,
        String panNumber,

        String ifscCode,

        String categoryName,

        Integer month,

        Integer year,

        BigDecimal netPayment,

        String status,

        List<MonthlyDetailResponse> monthlyDetails

) {

    // Retain compatibility with existing V1 response construction.
    public PaymentAdviceResponse(
            Long paymentId,
            String employeeCode,
            String employeeName,
            String bankName,
            String accountNumber,
            String panNumber,
            String ifscCode,
            String categoryName,
            Integer month,
            Integer year,
            BigDecimal netPayment,
            String status
    ) {
        this(
                paymentId,
                employeeCode,
                employeeName,
                bankName,
                accountNumber,
                panNumber,
                ifscCode,
                categoryName,
                month,
                year,
                netPayment,
                status,
                List.of()
        );
    }

    public record MonthlyDetailResponse(
            Integer month,
            Integer year,
            BigDecimal netPayment,
            String status
    ) {
    }
}
