package com.employee.payment.employee.repository;

import com.employee.payment.employee.entity.EmployeeCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeCategoryRepository
        extends JpaRepository<EmployeeCategory, Long> {

    Optional<EmployeeCategory> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}