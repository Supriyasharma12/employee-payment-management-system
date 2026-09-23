package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentPeriodRepository
        extends JpaRepository<PaymentPeriod, Long> {

    Optional<PaymentPeriod> findByMonthAndYear(
            Integer month,
            Integer year
    );

    boolean existsByMonthAndYear(
            Integer month,
            Integer year
    );
}