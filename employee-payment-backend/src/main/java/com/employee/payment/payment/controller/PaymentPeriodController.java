package com.employee.payment.payment.controller;

import com.employee.payment.payment.dto.PaymentPeriodCreateRequest;
import com.employee.payment.payment.dto.PaymentPeriodResponse;
import com.employee.payment.payment.service.PaymentPeriodService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payment-periods")
public class PaymentPeriodController {

    private final PaymentPeriodService paymentPeriodService;

    public PaymentPeriodController(
            PaymentPeriodService paymentPeriodService) {
        this.paymentPeriodService = paymentPeriodService;
    }

    @PostMapping
    public ResponseEntity<PaymentPeriodResponse> createPaymentPeriod(
            @Valid @RequestBody PaymentPeriodCreateRequest request) {

        PaymentPeriodResponse response =
                paymentPeriodService.createPaymentPeriod(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public List<PaymentPeriodResponse> getAllPaymentPeriods() {

        return paymentPeriodService.getAllPaymentPeriods();
    }

    @GetMapping("/{id}")
    public PaymentPeriodResponse getPaymentPeriod(
            @PathVariable Long id) {

        return paymentPeriodService.getPaymentPeriod(id);
    }
}