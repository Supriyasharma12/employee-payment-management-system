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
import com.employee.payment.payment.dto.MultiMonthPaymentCreateRequest;
import com.employee.payment.payment.dto.MultiMonthPaymentCreateResponse;
import com.employee.payment.payment.dto.MonthlyPaymentSummaryResponse;
import com.employee.payment.payment.dto.EligiblePaymentPeriodResponse;
import java.util.List;
import java.io.IOException;
import org.springframework.web.bind.annotation.RequestParam;
import com.employee.payment.payment.dto.MultiMonthPaymentUpdateRequest;
import com.employee.payment.payment.dto.PaymentAdviceFinalizeRequest;
import com.employee.payment.payment.dto.PaymentAdviceCancelRequest;
import com.employee.payment.payment.dto.PaymentAdviceFinalizationResponse;
import com.employee.payment.payment.entity.PaymentAdvice;
import com.employee.payment.payment.service.PaymentAdviceFinalizationService;
import com.employee.payment.payment.repository.PaymentAdvicePaymentRepository;
import com.employee.payment.payment.dto.PaymentAdviceFinalizedResponse;


@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentAdviceExcelExporter excelExporter;
    private final PaymentSummaryExcelExporter summaryExcelExporter;
    private final PaymentAdviceFinalizationService paymentAdviceFinalizationService;
    private final PaymentAdvicePaymentRepository paymentAdvicePaymentRepository;

    public PaymentController(
            PaymentService paymentService,
            PaymentAdviceExcelExporter excelExporter,
            PaymentSummaryExcelExporter summaryExcelExporter,
            PaymentAdviceFinalizationService paymentAdviceFinalizationService,
            PaymentAdvicePaymentRepository paymentAdvicePaymentRepository

    ) {
        this.paymentService = paymentService;
        this.excelExporter = excelExporter;
        this.summaryExcelExporter = summaryExcelExporter;
        this.paymentAdviceFinalizationService = paymentAdviceFinalizationService;
        this.paymentAdvicePaymentRepository = paymentAdvicePaymentRepository;
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



    @GetMapping("/eligible-periods")
    public ResponseEntity<List<EligiblePaymentPeriodResponse>> getEligiblePaymentPeriods(
            @RequestParam Long employeeId,
            @RequestParam(required = false) Long paymentId) {

        return ResponseEntity.ok(
                paymentService.getEligiblePaymentPeriods(employeeId, paymentId));
    }




    // ============================================================
// GET PAYMENT BY ID
// ============================================================

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPaymentById(
            @PathVariable("id") Long id) {

        PaymentResponse response = paymentService.getPaymentById(id);

        return ResponseEntity.ok(response);
    }

    // ============================================================
// CREATE MULTI-MONTH PAYMENT (V2)
// ============================================================

    @PostMapping("/multi-month")
    public ResponseEntity<MultiMonthPaymentCreateResponse>
    createMultiMonthPayment(
            @Valid @RequestBody MultiMonthPaymentCreateRequest request
    ) {
        MultiMonthPaymentCreateResponse response =
                paymentService.createMultiMonthPayment(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    // ============================================================
    // UPDATE EXISTING MULTI-MONTH DRAFT
    // ============================================================

    @PutMapping("/multi-month/{id}")
    public ResponseEntity<MultiMonthPaymentCreateResponse>
    updateMultiMonthPayment(
            @PathVariable Long id,
            @Valid @RequestBody MultiMonthPaymentUpdateRequest request
    ) {
        MultiMonthPaymentCreateResponse response =
                paymentService.updateMultiMonthPayment(id, request);

        return ResponseEntity.ok(response);
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

    @GetMapping("/employee/{employeeId}/multi-month-drafts")
    public ResponseEntity<List<PaymentResponse>> getMultiMonthDraftsForEmployee(
            @PathVariable Long employeeId) {

        return ResponseEntity.ok(
                paymentService.getMultiMonthDraftsForEmployee(employeeId));
    }

    @GetMapping("/multi-month-drafts")
    public ResponseEntity<List<PaymentResponse>> getAllMultiMonthDrafts() {
        return ResponseEntity.ok(
                paymentService.getAllMultiMonthDrafts()
        );
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


    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelDraftPayment(
            @PathVariable Long id
    ) {
        paymentService.cancelDraftPayment(id);
        return ResponseEntity.noContent().build();
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

            @RequestParam(required = false)
            Long paymentBatchId,

            Pageable pageable
    ) {

        return paymentService.getPaymentSummary(
                paymentPeriodId,
                employeeId,
                categoryId,
                bankId,
                employeeCode,
                employeeName,
                paymentBatchId,
                pageable
        );
    }


    // ============================================================
    // MONTH-WISE PAYMENT SUMMARY (V2)
    // ============================================================

    @GetMapping("/monthly-summary")
    public List<MonthlyPaymentSummaryResponse> getMonthlyPaymentSummary(
            @RequestParam(required = false) Long paymentPeriodId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long bankId,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String employeeName,
            @RequestParam(required = false) Long paymentBatchId
    ) {
        return paymentService.getMonthlyPaymentSummary(
                paymentPeriodId,
                employeeId,
                categoryId,
                bankId,
                employeeCode,
                employeeName,
                paymentBatchId
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
            String employeeName,

            @RequestParam(required = false)
            Long paymentBatchId
    ) throws IOException {


        Page<PaymentSummaryResponse> page =
                paymentService.getPaymentSummary(
                        paymentPeriodId,
                        employeeId,
                        categoryId,
                        bankId,
                        employeeCode,
                        employeeName,
                        paymentBatchId,
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

            @RequestParam(required = false)
            Long paymentBatchId,


            Pageable pageable
    ) {

        return paymentService.getPaymentAdvice(
                paymentBatchId,
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
            String employeeName,

            @RequestParam(required = false)
            Long paymentBatchId

    ) throws IOException {

        Page<PaymentAdviceResponse> page =
                paymentService.getPaymentAdvice(
                        paymentBatchId,
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

    // ============================================================
// FINALIZE PAYMENT ADVICE
// ============================================================

    @PostMapping("/advice/finalize")
    public ResponseEntity<PaymentAdviceFinalizationResponse> finalizePaymentAdvice(
            @Valid @RequestBody PaymentAdviceFinalizeRequest request
    ) {

        PaymentAdvice advice =
                paymentAdviceFinalizationService.finalizeAdvice(
                        request.paymentBatchId(),
                        request.bankId()
                );

        long paymentCount =
                paymentAdvicePaymentRepository.countByPaymentAdvice_Id(
                        advice.getId()
                );

        PaymentAdviceFinalizationResponse response =
                new PaymentAdviceFinalizationResponse(
                        advice.getId(),
                        advice.getReferenceNo(),
                        advice.getPaymentBatch().getId(),
                        advice.getBank().getId(),
                        advice.getBank().getBankName(),
                        advice.getAdviceDate(),
                        advice.getStatus(),
                        paymentCount
                );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }


// ============================================================
// CANCEL FINALIZED PAYMENT ADVICE
// ============================================================

    @PostMapping("/advice/{id}/cancel")
    public ResponseEntity<PaymentAdviceFinalizationResponse> cancelPaymentAdvice(
            @PathVariable Long id,
            @Valid @RequestBody PaymentAdviceCancelRequest request
    ) {

        PaymentAdvice advice =
                paymentAdviceFinalizationService.cancelAdvice(
                        id,
                        request.cancellationReason()
                );

        long paymentCount =
                paymentAdvicePaymentRepository.countByPaymentAdvice_Id(
                        advice.getId()
                );

        PaymentAdviceFinalizationResponse response =
                new PaymentAdviceFinalizationResponse(
                        advice.getId(),
                        advice.getReferenceNo(),
                        advice.getPaymentBatch().getId(),
                        advice.getBank().getId(),
                        advice.getBank().getBankName(),
                        advice.getAdviceDate(),
                        advice.getStatus(),
                        paymentCount
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/advice/finalized")
    public ResponseEntity<PaymentAdviceFinalizedResponse>
    getFinalizedAdviceByBatchAndBank(
            @RequestParam Long paymentBatchId,
            @RequestParam Long bankId
    ) {

        PaymentAdviceFinalizedResponse response =
                paymentAdviceFinalizationService
                        .getFinalizedAdviceByBatchAndBank(
                                paymentBatchId,
                                bankId
                        );

        if (response == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/advice/finalized/{id}")
    public ResponseEntity<PaymentAdviceFinalizedResponse> getFinalizedAdvice(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                paymentAdviceFinalizationService.getFinalizedAdvice(id)
        );
    }

}