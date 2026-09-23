package com.employee.payment.payment.controller;

import com.employee.payment.payment.dto.PaymentAdviceResponse;
import com.employee.payment.payment.dto.PaymentCreateRequest;
import com.employee.payment.payment.dto.PaymentResponse;
import com.employee.payment.payment.dto.PaymentSummaryResponse;
import com.employee.payment.payment.dto.PaymentUpdateRequest;
import com.employee.payment.payment.export.PaymentAdviceExcelExporter;
import com.employee.payment.payment.export.PaymentSummaryExcelExporter;
import com.employee.payment.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentAdviceExcelExporter excelExporter;
    private final PaymentSummaryExcelExporter summaryExcelExporter;

    public PaymentController(
            PaymentService paymentService,
            PaymentAdviceExcelExporter excelExporter,
            PaymentSummaryExcelExporter summaryExcelExporter
    ) {
        this.paymentService = paymentService;
        this.excelExporter = excelExporter;
        this.summaryExcelExporter = summaryExcelExporter;
    }

    // ============================================================
    // CREATE PAYMENT
    // ============================================================

    @PostMapping
    public ResponseEntity<PaymentResponse> createPayment(
            @Valid @RequestBody PaymentCreateRequest request
    ) {

        PaymentResponse response =
                paymentService.createPayment(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // ============================================================
    // UPDATE DRAFT PAYMENT
    // ============================================================

    @PutMapping("/{id}")
    public ResponseEntity<PaymentResponse> updateDraftPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentUpdateRequest request
    ) {

        PaymentResponse response =
                paymentService.updateDraftPayment(
                        id,
                        request
                );

        return ResponseEntity.ok(response);
    }

    // ============================================================
    // APPROVE PAYMENT
    // ============================================================

    @PatchMapping("/{id}/approve")
    public ResponseEntity<PaymentResponse> approvePayment(
            @PathVariable Long id
    ) {

        PaymentResponse response =
                paymentService.approvePayment(id);

        return ResponseEntity.ok(response);
    }

    // ============================================================
    // PAYMENT SUMMARY
    // ============================================================

    @GetMapping("/summary")
    public Page<PaymentSummaryResponse> getPaymentSummary(

            @RequestParam(required = false)
            Long paymentPeriodId,

            @RequestParam(required = false)
            Long employeeId,

            @RequestParam(required = false)
            Long bankId,

            @RequestParam(required = false)
            Long categoryId,

            @RequestParam(required = false)
            String employeeCode,

            @RequestParam(required = false)
            String employeeName,

            Pageable pageable
    ) {

        return paymentService.getPaymentSummary(
                paymentPeriodId,
                employeeId,
                categoryId,
                bankId,
                employeeCode,
                employeeName,
                pageable
        );
    }

    // ============================================================
    // PAYMENT SUMMARY EXPORT
    // ============================================================

    @GetMapping("/summary/export")
    public ResponseEntity<byte[]> exportPaymentSummary(

            @RequestParam(required = false)
            Long paymentPeriodId,

            @RequestParam(required = false)
            Long employeeId,

            @RequestParam(required = false)
            Long bankId,

            @RequestParam(required = false)
            Long categoryId,

            @RequestParam(required = false)
            String employeeCode,

            @RequestParam(required = false)
            String employeeName
    ) throws IOException {

        Page<PaymentSummaryResponse> page =
                paymentService.getPaymentSummary(
                        paymentPeriodId,
                        employeeId,
                        categoryId,
                        bankId,
                        employeeCode,
                        employeeName,
                        Pageable.unpaged()
                );

        byte[] excelFile =
                summaryExcelExporter.export(
                        page.getContent()
                );

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=payment-summary.xlsx"
                )
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                )
                .body(excelFile);
    }

    // ============================================================
    // PAYMENT ADVICE
    // ============================================================

    @GetMapping("/advice")
    public Page<PaymentAdviceResponse> getPaymentAdvice(

            @RequestParam(required = false)
            Long paymentPeriodId,

            @RequestParam(required = false)
            Long employeeId,

            @RequestParam(required = false)
            Long categoryId,

            @RequestParam(required = false)
            Long bankId,

            @RequestParam(required = false)
            String employeeCode,

            @RequestParam(required = false)
            String employeeName,

            Pageable pageable
    ) {

        return paymentService.getPaymentAdvice(
                paymentPeriodId,
                employeeId,
                categoryId,
                bankId,
                employeeCode,
                employeeName,
                pageable
        );
    }

    // ============================================================
    // PAYMENT ADVICE EXPORT
    // ============================================================

    @GetMapping("/advice/export")
    public ResponseEntity<byte[]> exportPaymentAdvice(

            @RequestParam(required = false)
            Long paymentPeriodId,

            @RequestParam(required = false)
            Long employeeId,

            @RequestParam(required = false)
            Long categoryId,

            @RequestParam(required = false)
            Long bankId,

            @RequestParam(required = false)
            String employeeCode,

            @RequestParam(required = false)
            String employeeName
    ) throws IOException {

        Page<PaymentAdviceResponse> page =
                paymentService.getPaymentAdvice(
                        paymentPeriodId,
                        employeeId,
                        categoryId,
                        bankId,
                        employeeCode,
                        employeeName,
                        Pageable.unpaged()
                );

        byte[] excelFile =
                excelExporter.export(
                        page.getContent()
                );

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=payment-advice.xlsx"
                )
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                )
                .body(excelFile);
    }
}