package com.employee.payment.payment.service;

import com.employee.payment.payment.dto.PaymentCalculationRequest;
import com.employee.payment.payment.dto.PaymentCalculationResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PaymentCalculationServiceTest {

    private final PaymentCalculationService service =
            new PaymentCalculationService();


    @Test
    void shouldRejectNegativeNetPayment() {

        PaymentCalculationRequest request =
                new PaymentCalculationRequest(
                        new BigDecimal("1000.00"),
                        new BigDecimal("500.00"),
                        new BigDecimal("200.00"),
                        new BigDecimal("1000.00"),
                        new BigDecimal("500.00"),
                        new BigDecimal("500.00")
                );

        IllegalArgumentException exception =
                org.junit.jupiter.api.Assertions.assertThrows(
                        IllegalArgumentException.class,
                        () -> service.calculate(request)
                );

        assertEquals(
                "Deduction Total cannot be greater than Gross Total",
                exception.getMessage()
        );
    }


    @Test
    void shouldCalculateGrossDeductionAndNetPayment() {

        PaymentCalculationRequest request =
                new PaymentCalculationRequest(
                        new BigDecimal("1000.00"), // Running TA
                        new BigDecimal("500.00"),  // Fixed TA
                        new BigDecimal("200.00"),  // Other
                        new BigDecimal("100.00"),  // Miscellaneous
                        new BigDecimal("50.00"),   // Advance TA
                        new BigDecimal("50.00")    // Advance Other
                );

        PaymentCalculationResponse response =
                service.calculate(request);

        assertEquals(
                new BigDecimal("1700.00"),
                response.grossTotal()
        );

        assertEquals(
                new BigDecimal("200.00"),
                response.deductionTotal()
        );

        assertEquals(
                new BigDecimal("1500.00"),
                response.netPayment()
        );
    }
}