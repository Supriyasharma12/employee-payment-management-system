package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentAdvice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM PaymentAdvice a WHERE a.id = :adviceId")
    Optional<PaymentAdvice> findByIdForUpdate(
            @Param("adviceId") Long adviceId
    );
}