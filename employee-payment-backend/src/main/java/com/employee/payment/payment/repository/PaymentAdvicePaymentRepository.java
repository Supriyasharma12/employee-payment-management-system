package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentAdvicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentAdvicePaymentRepository
        extends JpaRepository<PaymentAdvicePayment, Long> {

    List<PaymentAdvicePayment> findByPaymentAdvice_Id(Long paymentAdviceId);

    boolean existsByPaymentAdvice_IdAndPayment_Id(
            Long paymentAdviceId,
            Long paymentId
    );

    long countByPaymentAdvice_Id(Long paymentAdviceId);
}