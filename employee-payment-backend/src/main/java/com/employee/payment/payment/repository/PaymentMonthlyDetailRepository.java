
package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentMonthlyDetail;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface PaymentMonthlyDetailRepository
        extends JpaRepository<PaymentMonthlyDetail, Long> {

    @EntityGraph(attributePaths = {"paymentPeriod"})
    List<PaymentMonthlyDetail> findByPaymentId(
            Long paymentId,
            Sort sort
    );

    List<PaymentMonthlyDetail> findByPaymentId(Long paymentId);

    List<PaymentMonthlyDetail>
    findByPaymentEmployeeIdAndPaymentPeriodId(
            Long employeeId,
            Long paymentPeriodId
    );

    Optional<PaymentMonthlyDetail>
    findByPaymentIdAndPaymentPeriodId(
            Long paymentId,
            Long paymentPeriodId
    );

    boolean existsByPaymentEmployeeIdAndPaymentPeriodId(
            Long employeeId,
            Long paymentPeriodId
    );



    @EntityGraph(attributePaths = {
            "payment",
            "payment.employee",
            "payment.employee.category",
            "payment.employee.bank",
            "paymentPeriod"
    })
    Page<PaymentMonthlyDetail> findAllByOrderByPaymentPeriodYearAscPaymentPeriodMonthAsc(
            Pageable pageable
    );

    @EntityGraph(attributePaths = {
            "payment",
            "payment.employee",
            "payment.employee.category",
            "payment.employee.bank",
            "paymentPeriod"
    })
    List<PaymentMonthlyDetail> findAllByOrderByPaymentPeriodYearAscPaymentPeriodMonthAsc();
}
