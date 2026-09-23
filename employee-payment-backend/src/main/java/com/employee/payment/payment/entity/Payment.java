package com.employee.payment.payment.entity;

import com.employee.payment.admin.entity.Admin;
import com.employee.payment.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_employee_payment_period",
                        columnNames = {
                                "employee_id",
                                "payment_period_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_payment_employee",
                        columnList = "employee_id"
                ),
                @Index(
                        name = "idx_payment_period",
                        columnList = "payment_period_id"
                ),
                @Index(
                        name = "idx_payment_date",
                        columnList = "payment_date"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ============================================================
    // EMPLOYEE
    // ============================================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "employee_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_payment_employee"
            )
    )
    private Employee employee;

    // ============================================================
    // PAYMENT PERIOD
    // ============================================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "payment_period_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_payment_period"
            )
    )
    private PaymentPeriod paymentPeriod;

    // ============================================================
    // PAYMENT DATE
    // ============================================================

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    // ============================================================
    // GROSS
    // ============================================================

    @Column(
            name = "running_ta",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal runningTa = BigDecimal.ZERO;

    @Column(
            name = "fixed_ta",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal fixedTa = BigDecimal.ZERO;

    @Column(
            name = "other",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal other = BigDecimal.ZERO;

    @Column(
            name = "gross_total",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal grossTotal = BigDecimal.ZERO;

    // ============================================================
    // DEDUCTIONS
    // ============================================================

    @Column(
            name = "miscellaneous",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal miscellaneous = BigDecimal.ZERO;

    @Column(
            name = "advance_ta",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal advanceTa = BigDecimal.ZERO;

    @Column(
            name = "advance_other",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal advanceOther = BigDecimal.ZERO;

    @Column(
            name = "deduction_total",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal deductionTotal = BigDecimal.ZERO;

    // ============================================================
    // FINAL PAYMENT
    // ============================================================

    @Column(
            name = "net_payment",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal netPayment = BigDecimal.ZERO;

    // ============================================================
    // STATUS
    // ============================================================

    @Column(nullable = false, length = 30)
    private String status = "DRAFT";

    // ============================================================
    // AUDIT INFORMATION
    // ============================================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "created_by",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_payment_created_by"
            )
    )
    private Admin createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "updated_by",
            foreignKey = @ForeignKey(
                    name = "fk_payment_updated_by"
            )
    )
    private Admin updatedBy;

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