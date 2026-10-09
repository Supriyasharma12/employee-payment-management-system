package com.employee.payment.employee.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "employees",
        indexes = {
                @Index(name = "idx_employee_name", columnList = "name"),
                @Index(name = "idx_employee_category", columnList = "category_id"),
                @Index(name = "idx_employee_bank", columnList = "bank_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_code", nullable = false, unique = true, length = 30)
    private String employeeCode;

    @Column(name = "employee_code_sort", insertable = false, updatable = false)
    private BigDecimal employeeCodeSort;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "account_number", nullable = false, length = 50)
    private String accountNumber;

    @Column(name = "pan_number", length = 10)
    private String panNumber;

    @Column(name = "ifsc_code", length = 20)
    private String ifscCode;

    // ============================================================
    // EMPLOYEE DETAILS
    // ============================================================

    /**
     * Department is compulsory for new/updated employees.
     * Currently, stored directly as a String because there is
     * no Department master table yet.
     */
    @Column(nullable = false, length = 50)
    private String department;

    /**
     * Medical Card ID / UHID
     * Optional
     */
    @Column(name = "medical_card_id", length = 50)
    private String medicalCardId;

    /**
     * Universal Account Number
     * Optional
     */
    @Column(length = 12)
    private String uan;

    /**
     * Aadhaar number
     * Optional
     */
    @Column(length = 12)
    private String aadhaar;

    /**
     * Date of Birth
     * Optional
     */
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    /**
     * Date of Joining
     * Optional
     */
    @Column(name = "date_of_joining")
    private LocalDate dateOfJoining;

    // ============================================================
    // EXISTING EMPLOYEE DETAILS
    // ============================================================

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(length = 150)
    private String email;

    @Column(name = "grade_pay", precision = 15, scale = 2)
    private BigDecimal gradePay;

    @Column(length = 100)
    private String scale;

    @Column(length = 150)
    private String headquarters;

    /**
     * Designation is retained.
     *
     * Position has been removed as requested.
     */
    @Column(length = 150)
    private String designation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "category_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_employee_category")
    )
    private EmployeeCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "bank_id",
            foreignKey = @ForeignKey(name = "fk_employee_bank")
    )
    private Bank bank;

    @Column(nullable = false)
    private Boolean active = true;

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