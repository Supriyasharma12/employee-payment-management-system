package com.employee.payment.employee.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
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

    @Column(name = "ifsc_code", nullable = false, length = 20)
    private String ifscCode;

    @Column(length = 100)
    private String position;

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