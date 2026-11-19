package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentAdvicePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentAdvicePaymentRepository
        extends JpaRepository<PaymentAdvicePayment, Long> {

    List<PaymentAdvicePayment> findByPaymentAdvice_Id(Long paymentAdviceId);

    boolean existsByPaymentAdvice_IdAndPayment_Id(
            Long paymentAdviceId,
            Long paymentId
    );

    long countByPaymentAdvice_Id(Long paymentAdviceId);

    // Check whether a payment already belongs to an active finalized advice.
    @Query("""
        SELECT CASE WHEN COUNT(ap) > 0 THEN true ELSE false END
        FROM PaymentAdvicePayment ap
        WHERE ap.payment.id = :paymentId
          AND ap.paymentAdvice.status = 'FINALIZED'
        """)
    boolean existsInFinalizedAdvice(
            @Param("paymentId") Long paymentId
    );
}
