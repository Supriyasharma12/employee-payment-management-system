
package com.employee.payment.payment.dto;

public record EligiblePaymentPeriodResponse(
        Long id,
        Integer month,
        Integer year,
        String status,
        boolean eligible,
        String reason
) {}
