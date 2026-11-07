
package com.employee.payment.payment.entity;

import com.employee.payment.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment_month_reservations",
        indexes = {
                @Index(
                        name = "idx_month_reservation_employee_period",
                        columnList = "employee_id,payment_period_id"
                ),
                @Index(
                        name = "idx_month_reservation_payment",
                        columnList = "payment_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class PaymentMonthReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_period_id", nullable = false)
    private PaymentPeriod paymentPeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(nullable = false, length = 20)
    private String status = "RESERVED";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
