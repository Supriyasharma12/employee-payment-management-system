package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentAdvice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentAdviceRepository
        extends JpaRepository<PaymentAdvice, Long> {

    Optional<PaymentAdvice> findByPaymentBatch_IdAndBank_IdAndStatus(
            Long paymentBatchId,
            Long bankId,
            String status
    );

    List<PaymentAdvice> findByPaymentBatch_IdAndBank_IdOrderByCreatedAtDesc(
            Long paymentBatchId,
            Long bankId
    );
}