package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentRepository
        extends JpaRepository<Payment, Long>,
        JpaSpecificationExecutor<Payment> {

    Optional<Payment> findByEmployeeIdAndPaymentPeriodId(
            Long employeeId,
            Long paymentPeriodId
    );


    List<Payment> findByEmployeeIdAndPaymentPeriodIsNullAndStatusOrderByUpdatedAtDesc(
            Long employeeId,
            String status
    );

    List<Payment> findByPaymentPeriodIsNullAndStatusOrderByUpdatedAtDesc(
            String status
    );

    boolean existsByEmployeeIdAndPaymentPeriodId(
            Long employeeId,
            Long paymentPeriodId
    );

    Page<Payment> findByPaymentPeriodId(
            Long paymentPeriodId,
            Pageable pageable
    );

    Page<Payment> findByPaymentDate(
            LocalDate paymentDate,
            Pageable pageable
    );

    Page<Payment> findByEmployeeId(
            Long employeeId,
            Pageable pageable
    );

    boolean existsByEmployeeIdAndPaymentBatchIdAndPaymentPeriodIsNullAndStatusIgnoreCase(
            Long employeeId,
            Long paymentBatchId,
            String status
    );

    @Query("""
        SELECT p
        FROM Payment p
        JOIN p.employee e
        WHERE p.paymentBatch.id = :paymentBatchId
          AND e.bank.id = :bankId
          AND UPPER(p.status) = 'APPROVED'
        ORDER BY e.employeeCode ASC, p.id ASC
        """)
    List<Payment> findApprovedPaymentsForAdvice(
            @Param("paymentBatchId") Long paymentBatchId,
            @Param("bankId") Long bankId
    );
}