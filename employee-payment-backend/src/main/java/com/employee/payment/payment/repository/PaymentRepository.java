package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentRepository
        extends JpaRepository<Payment, Long>,
        JpaSpecificationExecutor<Payment> {

    Optional<Payment> findByEmployeeIdAndPaymentPeriodId(
            Long employeeId,
            Long paymentPeriodId
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
}