package com.employee.payment.payment.service;

import com.employee.payment.employee.entity.Bank;
import com.employee.payment.employee.repository.BankRepository;
import com.employee.payment.payment.entity.Payment;
import com.employee.payment.payment.entity.PaymentAdvice;
import com.employee.payment.payment.entity.PaymentAdvicePayment;
import com.employee.payment.payment.entity.PaymentBatch;
import com.employee.payment.payment.repository.PaymentAdvicePaymentRepository;
import com.employee.payment.payment.repository.PaymentAdviceRepository;
import com.employee.payment.payment.repository.PaymentBatchRepository;
import com.employee.payment.payment.repository.PaymentRepository;
import com.employee.payment.payment.dto.PaymentAdviceFinalizedResponse;
import com.employee.payment.payment.dto.PaymentAdviceResponse;
import com.employee.payment.employee.entity.Employee;
import com.employee.payment.payment.entity.PaymentPeriod;
import com.employee.payment.payment.entity.PaymentMonthlyDetail;
import com.employee.payment.payment.repository.PaymentMonthlyDetailRepository;


import java.util.Comparator;
import java.util.Objects;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;

@Service
public class PaymentAdviceFinalizationService {

    private final PaymentAdviceRepository paymentAdviceRepository;
    private final PaymentAdvicePaymentRepository paymentAdvicePaymentRepository;
    private final PaymentBatchRepository paymentBatchRepository;
    private final BankRepository bankRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentAdviceNumberService paymentAdviceNumberService;
    private final PaymentMonthlyDetailRepository monthlyDetailRepository;

    public PaymentAdviceFinalizationService(
            PaymentAdviceRepository paymentAdviceRepository,
            PaymentAdvicePaymentRepository paymentAdvicePaymentRepository,
            PaymentBatchRepository paymentBatchRepository,
            BankRepository bankRepository,
            PaymentRepository paymentRepository,
            PaymentAdviceNumberService paymentAdviceNumberService,
            PaymentMonthlyDetailRepository monthlyDetailRepository
    ) {
        this.paymentAdviceRepository = paymentAdviceRepository;
        this.paymentAdvicePaymentRepository = paymentAdvicePaymentRepository;
        this.paymentBatchRepository = paymentBatchRepository;
        this.bankRepository = bankRepository;
        this.paymentRepository = paymentRepository;
        this.paymentAdviceNumberService = paymentAdviceNumberService;
        this.monthlyDetailRepository = monthlyDetailRepository;
    }

    @Transactional
    public PaymentAdvice finalizeAdvice(
            Long paymentBatchId,
            Long bankId
    ) {

        // 1. Lock and validate the selected batch.
        PaymentBatch batch = paymentBatchRepository
                .findByIdForUpdate(paymentBatchId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment batch not found."
                        )
                );

        // 2. Validate the selected bank.
        Bank bank = bankRepository.findById(bankId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Bank not found."
                        )
                );

        // 3. Check whether an active advice already exists.
        var existingAdvice = paymentAdviceRepository
                .findByPaymentBatch_IdAndBank_IdAndStatus(
                        paymentBatchId,
                        bankId,
                        "FINALIZED"
                );

        if (existingAdvice.isPresent()) {
            throw new IllegalStateException(
                    "Payment Advice has already been finalized for this batch and bank. "
                            + "Reference: "
                            + existingAdvice.get().getReferenceNo()
            );
        }

        // 4. Retrieve all approved payments for this batch and bank.
        // No payment-month filter is applied.
        List<Payment> payments = paymentRepository
                .findApprovedPaymentsForAdvice(
                        paymentBatchId,
                        bankId
                );

        if (payments.isEmpty()) {
            throw new IllegalStateException(
                    "No approved payments are available for this batch and bank."
            );
        }

        // 5. Generate the permanent reference number.
        String referenceNo =
                paymentAdviceNumberService.generateReferenceNo();

        // 6. Create the Payment Advice.
        PaymentAdvice advice = new PaymentAdvice();

        advice.setReferenceNo(referenceNo);
        advice.setPaymentBatch(batch);
        advice.setBank(bank);
        advice.setAdviceDate(
                LocalDate.now(ZoneId.of("Asia/Kolkata"))
        );
        advice.setStatus("FINALIZED");

        advice = paymentAdviceRepository.saveAndFlush(advice);

        // 7. Save the exact payment records included in this advice.
        List<PaymentAdvicePayment> advicePayments =
                new ArrayList<>();

        for (Payment payment : payments) {

            PaymentAdvicePayment advicePayment =
                    new PaymentAdvicePayment();

            advicePayment.setPaymentAdvice(advice);
            advicePayment.setPayment(payment);

            advicePayments.add(advicePayment);
        }

        paymentAdvicePaymentRepository.saveAll(advicePayments);

        return advice;
    }

    @Transactional
    public PaymentAdvice cancelAdvice(
            Long adviceId,
            String cancellationReason
    ) {

        // 1. Validate cancellation reason.
        if (cancellationReason == null ||
                cancellationReason.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Cancellation reason is mandatory."
            );
        }

        if (cancellationReason.trim().length() > 500) {
            throw new IllegalArgumentException(
                    "Cancellation reason cannot exceed 500 characters."
            );
        }

        // 2. Find the original advice.
        PaymentAdvice advice = paymentAdviceRepository
                .findById(adviceId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment Advice not found."
                        )
                );

        // 3. Prevent repeated cancellation.
        if (!"FINALIZED".equalsIgnoreCase(advice.getStatus())) {
            throw new IllegalStateException(
                    "Only a finalized Payment Advice can be cancelled."
            );
        }

        // 4. Mark the advice as cancelled.
        advice.setStatus("CANCELLED");
        advice.setCancelledAt(LocalDateTime.now());
        advice.setCancellationReason(cancellationReason.trim());

        // 5. Save without deleting the original advice or its payments.
        return paymentAdviceRepository.save(advice);
    }

    @Transactional(readOnly = true)
    public PaymentAdviceFinalizedResponse getFinalizedAdviceByBatchAndBank(
            Long paymentBatchId,
            Long bankId
    ) {

        return paymentAdviceRepository
                .findByPaymentBatch_IdAndBank_IdAndStatus(
                        paymentBatchId,
                        bankId,
                        "FINALIZED"
                )
                .map(advice -> getFinalizedAdvice(advice.getId()))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public PaymentAdviceFinalizedResponse getFinalizedAdvice(Long adviceId) {

        PaymentAdvice advice = paymentAdviceRepository.findById(adviceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Payment Advice not found.")
                );

        List<PaymentAdvicePayment> linkedPayments =
                paymentAdvicePaymentRepository.findByPaymentAdvice_Id(adviceId);

        List<PaymentAdviceResponse> rows = linkedPayments.stream()
                .map(linked -> {

                    Payment payment = linked.getPayment();
                    Employee employee = payment.getEmployee();

                    PaymentPeriod period = payment.getPaymentPeriod();

                    if (period == null) {
                        period = monthlyDetailRepository
                                .findByPaymentId(payment.getId())
                                .stream()
                                .map(PaymentMonthlyDetail::getPaymentPeriod)
                                .filter(Objects::nonNull)
                                .min(
                                        Comparator.comparing(PaymentPeriod::getYear)
                                                .thenComparing(PaymentPeriod::getMonth)
                                )
                                .orElse(null);
                    }

                    String bankName = employee.getBank() != null
                            ? employee.getBank().getBankName()
                            : null;

                    String categoryName = employee.getCategory() != null
                            ? employee.getCategory().getName()
                            : null;

                    return new PaymentAdviceResponse(
                            payment.getId(),
                            employee.getEmployeeCode(),
                            employee.getName(),
                            bankName,
                            employee.getAccountNumber(),
                            employee.getPanNumber(),
                            employee.getIfscCode(),
                            categoryName,
                            period != null ? period.getMonth() : null,
                            period != null ? period.getYear() : null,
                            payment.getNetPayment(),
                            payment.getStatus()
                    );
                })
                .toList();

        return new PaymentAdviceFinalizedResponse(
                advice.getId(),
                advice.getReferenceNo(),
                advice.getPaymentBatch().getId(),
                advice.getBank().getId(),
                advice.getBank().getBankName(),
                advice.getAdviceDate(),
                advice.getStatus(),
                advice.getCancellationReason(),
                rows
        );
    }

}