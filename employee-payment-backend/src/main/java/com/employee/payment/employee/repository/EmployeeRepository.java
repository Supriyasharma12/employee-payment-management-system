package com.employee.payment.employee.repository;

import com.employee.payment.employee.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
public interface EmployeeRepository
        extends JpaRepository<Employee, Long>,
        JpaSpecificationExecutor<Employee> {

    Optional<Employee> findByEmployeeCodeIgnoreCase(String employeeCode);

    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    Page<Employee> findByNameContainingIgnoreCase(
            String name,
            Pageable pageable
    );

    Page<Employee> findByEmployeeCodeContainingIgnoreCase(
            String employeeCode,
            Pageable pageable
    );

    Page<Employee> findByCategoryId(
            Long categoryId,
            Pageable pageable
    );

    Page<Employee> findByBankId(
            Long bankId,
            Pageable pageable
    );


    @Query("""
        SELECT e
        FROM Employee e
        WHERE
            (:categoryId IS NULL OR e.category.id = :categoryId)
            AND
            (:bankId IS NULL OR e.bank.id = :bankId)
            AND
            (
                CAST(:search AS string) IS NULL
                OR TRIM(CAST(:search AS string)) = ''
                OR LOWER(e.name) LIKE CONCAT(
                    '%',
                    LOWER(CAST(:search AS string)),
                    '%'
                )
                OR LOWER(e.employeeCode) LIKE CONCAT(
                    '%',
                    LOWER(CAST(:search AS string)),
                    '%'
                )
            )
        """)


    Page<Employee> findByFilters(
            @Param("categoryId") Long categoryId,
            @Param("bankId") Long bankId,
            @Param("search") String search,
            Pageable pageable
    );
}