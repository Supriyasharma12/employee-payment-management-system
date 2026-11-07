
package com.employee.payment.payment.service;

import com.employee.payment.payment.dto.PaymentCalculationRequest;
import com.employee.payment.payment.dto.PaymentCalculationResponse;
import com.employee.payment.payment.dto.PaymentMonthlyDetailRequest;
import com.employee.payment.payment.entity.Payment;
import com.employee.payment.payment.entity.PaymentMonthlyDetail;
import com.employee.payment.payment.entity.PaymentPeriod;
import com.employee.payment.payment.repository.PaymentPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class PaymentMonthlyDetailService {

    private final PaymentCalculationService calculationService;
    private final PaymentPeriodRepository paymentPeriodRepository;

    public PaymentMonthlyDetail buildMonthlyDetail(
            Payment payment,
            PaymentMonthlyDetailRequest request) {

        PaymentPeriod period = paymentPeriodRepository
                .findById(request.paymentPeriodId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment period not found: "
                                + request.paymentPeriodId()));

        PaymentCalculationRequest calculationRequest =
                new PaymentCalculationRequest(
                        request.runningTa(),
                        request.fixedTa(),
                        request.other(),
                        request.miscellaneous(),
                        request.advanceTa(),
                        request.advanceOther()
                );

        PaymentCalculationResponse calculation =
                calculationService.calculate(calculationRequest);

        if (calculation.netPayment() == null
                || calculation.netPayment().signum() < 0) {
            throw new IllegalArgumentException(
                    "Monthly net payment cannot be negative.");
        }

        PaymentMonthlyDetail detail = new PaymentMonthlyDetail();

        detail.setPayment(payment);
        detail.setPaymentPeriod(period);

        detail.setRunningTa(calculation.runningTa());
        detail.setFixedTa(calculation.fixedTa());
        detail.setOther(calculation.other());
        detail.setGrossTotal(calculation.grossTotal());

        detail.setMiscellaneous(calculation.miscellaneous());
        detail.setAdvanceTa(calculation.advanceTa());
        detail.setAdvanceOther(calculation.advanceOther());
        detail.setDeductionTotal(calculation.deductionTotal());

        detail.setNetPayment(calculation.netPayment());

        return detail;
    }

    public BigDecimal sumMonthlyNetPayments(
            Iterable<PaymentMonthlyDetail> details) {

        BigDecimal total = BigDecimal.ZERO;

        for (PaymentMonthlyDetail detail : details) {
            total = total.add(detail.getNetPayment());
        }

        return total;
    }
}
