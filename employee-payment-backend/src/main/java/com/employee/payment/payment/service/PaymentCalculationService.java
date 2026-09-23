package com.employee.payment.payment.service;

import com.employee.payment.payment.dto.PaymentCalculationRequest;
import com.employee.payment.payment.dto.PaymentCalculationResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PaymentCalculationService {

    public PaymentCalculationResponse calculate(
            PaymentCalculationRequest request) {

        BigDecimal grossTotal = request.runningTa()
                .add(request.fixedTa())
                .add(request.other());

        BigDecimal deductionTotal = request.miscellaneous()
                .add(request.advanceTa())
                .add(request.advanceOther());

        BigDecimal netPayment = grossTotal.subtract(deductionTotal);

        if (netPayment.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(
                    "Deduction Total cannot be greater than Gross Total"
            );
        }

        return new PaymentCalculationResponse(
                request.runningTa(),
                request.fixedTa(),
                request.other(),
                grossTotal,
                request.miscellaneous(),
                request.advanceTa(),
                request.advanceOther(),
                deductionTotal,
                netPayment
        );
    }
}