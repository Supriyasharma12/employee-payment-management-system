
package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentMonthReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface PaymentMonthReservationRepository
        extends JpaRepository<PaymentMonthReservation, Long> {

    List<PaymentMonthReservation> findByPaymentId(Long paymentId);

    List<PaymentMonthReservation> findByPaymentIdAndStatus(
            Long paymentId,
            String status
    );

    // Lock reservations belonging to a payment before changing their status.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    SELECT r
    FROM PaymentMonthReservation r
    WHERE r.payment.id = :paymentId
      AND r.status = :status
    ORDER BY r.id ASC
    """)
    List<PaymentMonthReservation> findByPaymentIdAndStatusForUpdate(
            @Param("paymentId") Long paymentId,
            @Param("status") String status
    );

    List<PaymentMonthReservation> findByEmployeeIdAndPaymentPeriodId(
            Long employeeId,
            Long paymentPeriodId
    );

    Optional<PaymentMonthReservation>
    findByEmployeeIdAndPaymentPeriodIdAndStatusIn(
            Long employeeId,
            Long paymentPeriodId,
            List<String> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT r
        FROM PaymentMonthReservation r
        WHERE r.employee.id = :employeeId
          AND r.paymentPeriod.id = :periodId
          AND r.status IN :statuses
        """)
    List<PaymentMonthReservation> findActiveReservationsForUpdate(
            @Param("employeeId") Long employeeId,
            @Param("periodId") Long periodId,
            @Param("statuses") List<String> statuses
    );
}
