package com.employee.payment.payment.controller;

import com.employee.payment.payment.entity.PaymentBatch;
import com.employee.payment.payment.service.PaymentBatchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment-batches")
public class PaymentBatchController {

    private final PaymentBatchService paymentBatchService;

    public PaymentBatchController(
            PaymentBatchService paymentBatchService
    ) {
        this.paymentBatchService = paymentBatchService;
    }

    /**
     * Create a batch with OPEN status.
     */
    @PostMapping
    public ResponseEntity<PaymentBatch> createBatch(
            @RequestBody Map<String, String> request
    ) {
        String batchMonthValue = request.get("batchMonth");

        if (batchMonthValue == null || batchMonthValue.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment batch month is required."
            );
        }

        LocalDate batchMonth;

        try {
            batchMonth = LocalDate.parse(batchMonthValue);
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid batch month. Expected format: YYYY-MM-DD."
            );
        }

        PaymentBatch batch =
                paymentBatchService.createBatch(batchMonth);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(batch);
    }

    /**
     * Retrieve all batches, including CLOSED batches.
     */
    @GetMapping
    public ResponseEntity<List<PaymentBatch>> getAllBatches() {
        return ResponseEntity.ok(
                paymentBatchService.getAllBatches()
        );
    }

    /**
     * Retrieve only OPEN batches.
     */
    @GetMapping("/open")
    public ResponseEntity<List<PaymentBatch>> getOpenBatches() {
        return ResponseEntity.ok(
                paymentBatchService.getOpenBatches()
        );
    }

    /**
     * Retrieve a batch by ID, including historical CLOSED batches.
     */
    @GetMapping("/{batchId}")
    public ResponseEntity<PaymentBatch> getBatchById(
            @PathVariable Long batchId
    ) {
        return ResponseEntity.ok(
                paymentBatchService.getBatchById(batchId)
        );
    }

    /**
     * Manually close a batch.
     */
    @PatchMapping("/{batchId}/close")
    public ResponseEntity<PaymentBatch> closeBatch(
            @PathVariable Long batchId
    ) {
        return ResponseEntity.ok(
                paymentBatchService.closeBatch(batchId)
        );
    }
}