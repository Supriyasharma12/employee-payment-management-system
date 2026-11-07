
package com.employee.payment.payment.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment_monthly_details",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_payment_monthly_detail",
                        columnNames = {"payment_id", "payment_period_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_monthly_detail_period",
                        columnList = "payment_period_id"
                ),
                @Index(
                        name = "idx_monthly_detail_payment",
                        columnList = "payment_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class PaymentMonthlyDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_period_id", nullable = false)
    private PaymentPeriod paymentPeriod;

    @Column(name = "running_ta", nullable = false, precision = 15, scale = 2)
    private BigDecimal runningTa = BigDecimal.ZERO;

    @Column(name = "fixed_ta", nullable = false, precision = 15, scale = 2)
    private BigDecimal fixedTa = BigDecimal.ZERO;

    @Column(name = "other", nullable = false, precision = 15, scale = 2)
    private BigDecimal other = BigDecimal.ZERO;

    @Column(name = "gross_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossTotal = BigDecimal.ZERO;

    @Column(name = "miscellaneous", nullable = false, precision = 15, scale = 2)
    private BigDecimal miscellaneous = BigDecimal.ZERO;

    @Column(name = "advance_ta", nullable = false, precision = 15, scale = 2)
    private BigDecimal advanceTa = BigDecimal.ZERO;

    @Column(name = "advance_other", nullable = false, precision = 15, scale = 2)
    private BigDecimal advanceOther = BigDecimal.ZERO;

    @Column(name = "deduction_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal deductionTotal = BigDecimal.ZERO;

    @Column(name = "net_payment", nullable = false, precision = 15, scale = 2)
    private BigDecimal netPayment = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
