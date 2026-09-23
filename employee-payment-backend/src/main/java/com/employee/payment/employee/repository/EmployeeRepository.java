//package com.employee.payment.employee.repository;
//
//import com.employee.payment.employee.entity.Employee;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.jpa.repository.JpaRepository;
//
//import java.util.Optional;
//
//public interface EmployeeRepository extends JpaRepository<Employee, Long> {
//
//    Optional<Employee> findByEmployeeCodeIgnoreCase(String employeeCode);
//
//    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);
//
//    Page<Employee> findByNameContainingIgnoreCase(
//            String name,
//            Pageable pageable
//    );
//
//    Page<Employee> findByEmployeeCodeContainingIgnoreCase(
//            String employeeCode,
//            Pageable pageable
//    );
//
//    Page<Employee> findByCategoryId(
//            Long categoryId,
//            Pageable pageable
//    );
//
//    Page<Employee> findByBankId(
//            Long bankId,
//            Pageable pageable
//    );
//}
//


package com.employee.payment.employee.repository;

import com.employee.payment.employee.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

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
}