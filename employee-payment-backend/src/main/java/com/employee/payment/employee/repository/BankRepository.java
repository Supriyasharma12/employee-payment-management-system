package com.employee.payment.employee.repository;

import com.employee.payment.employee.entity.Bank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BankRepository extends JpaRepository<Bank, Long> {

    Optional<Bank> findByBankNameIgnoreCase(String bankName);

    boolean existsByBankNameIgnoreCase(String bankName);
}