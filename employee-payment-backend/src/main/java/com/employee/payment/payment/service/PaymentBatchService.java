package com.employee.payment.payment.service;

import com.employee.payment.payment.entity.PaymentBatch;
import com.employee.payment.payment.repository.PaymentBatchRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.List;

@Service
public class PaymentBatchService {

    private static final LocalDate OPERATIONAL_START_MONTH =
            LocalDate.of(2026, 11, 1);

    private final PaymentBatchRepository paymentBatchRepository;

    public PaymentBatchService(
            PaymentBatchRepository paymentBatchRepository
    ) {
        this.paymentBatchRepository = paymentBatchRepository;
    }

    /**
     * Create a new batch in OPEN status.
     */
    @Transactional
    public PaymentBatch createBatch(LocalDate batchMonth) {

        if (batchMonth == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment batch month is required."
            );
        }

        // Normalize the selected date to the first day of its month.
        LocalDate normalizedMonth =
                batchMonth.withDayOfMonth(1);

        if (normalizedMonth.isBefore(OPERATIONAL_START_MONTH)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment batches can only be created from November 2026 onward."
            );
        }

        // Prevent duplicate batches for the same calendar month.
        if (paymentBatchRepository.existsByBatchMonth(normalizedMonth)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A payment batch already exists for "
                            + normalizedMonth.format(
                            DateTimeFormatter.ofPattern(
                                    "MMMM yyyy",
                                    Locale.ENGLISH
                            )
                    ) + "."
            );
        }

        // Generate the batch name automatically.
        String generatedBatchName =
                normalizedMonth.format(
                        DateTimeFormatter.ofPattern(
                                "MMMM yyyy",
                                Locale.ENGLISH
                        )
                ) + " Payment Batch";

        PaymentBatch batch = new PaymentBatch();

        batch.setBatchName(generatedBatchName);
        batch.setBatchMonth(normalizedMonth);
        batch.setStatus("OPEN");

        return paymentBatchRepository.save(batch);
    }
    /**
     * Retrieve all batches, including closed historical batches.
     */
    @Transactional(readOnly = true)
    public List<PaymentBatch> getAllBatches() {
        return paymentBatchRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Retrieve only batches that can accept payment entries.
     */
    @Transactional(readOnly = true)
    public List<PaymentBatch> getOpenBatches() {
        return paymentBatchRepository
                .findByStatusOrderByCreatedAtDesc("OPEN")
                .stream()
                .filter(batch ->
                        batch.getBatchMonth() != null
                                && !batch.getBatchMonth()
                                .isBefore(OPERATIONAL_START_MONTH)
                )
                .toList();
    }

    /**
     * Retrieve a batch by ID.
     * Closed batches remain available for historical viewing.
     */
    @Transactional(readOnly = true)
    public PaymentBatch getBatchById(Long batchId) {

        if (batchId == null || batchId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid batch ID is required."
            );
        }

        return paymentBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Payment batch not found: " + batchId
                ));
    }

    /**
     * Retrieve a batch only when its status is OPEN.
     * Payment creation must use this method.
     */
    @Transactional
    public PaymentBatch getOpenBatchForPayment(Long batchId) {

        if (batchId == null || batchId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No batch selected. Please select a batch before payment entry."
            );
        }


        PaymentBatch batch = paymentBatchRepository
                .findByIdForUpdate(batchId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Payment batch not found."
                        )
                );

        if (!"OPEN".equals(batch.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This payment batch is CLOSED. Payment entries cannot be changed."
            );
        }

        if (batch.getBatchMonth() == null
                || batch.getBatchMonth().isBefore(OPERATIONAL_START_MONTH)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This is a PRE-LAUNCH batch. New payment entries are allowed only from November 2026 onward."
            );
        }

        return batch;
    }

    /**
     * Manually close an OPEN batch.
     * The in-charge is responsible for confirming payment completion first.
     */
    @Transactional
    public PaymentBatch closeBatch(Long batchId) {

        PaymentBatch batch = paymentBatchRepository
                .findByIdForUpdate(batchId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Payment batch not found.")
                );

        if ("CLOSED".equals(batch.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This payment batch is already CLOSED."
            );
        }

        if (!"OPEN".equals(batch.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only an OPEN payment batch can be closed."
            );
        }

        batch.setStatus("CLOSED");

        return paymentBatchRepository.save(batch);
    }

    /**
     * Validate that a payment's associated batch is still OPEN.
     * Payments without a batch cannot be changed through this workflow.
     */
    @Transactional(readOnly = true)
    public void validatePaymentBatchIsOpen(PaymentBatch batch) {

        if (batch == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This payment has no associated batch and cannot be modified."
            );
        }

        if (!"OPEN".equals(batch.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This payment belongs to a CLOSED batch and cannot be modified."
            );
        }

        if (batch.getBatchMonth() == null
                || batch.getBatchMonth().isBefore(OPERATIONAL_START_MONTH)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This payment belongs to a PRE-LAUNCH batch and cannot be modified through the operational payment workflow."
            );
        }
    }
}