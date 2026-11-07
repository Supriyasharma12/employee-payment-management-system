package com.employee.payment.payment.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "payment_advice_payments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_payment_advice_payment",
                        columnNames = {"payment_advice_id", "payment_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_payment_advice_payment_id",
                        columnList = "payment_id"
                )
        }
)
public class PaymentAdvicePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_advice_id", nullable = false)
    private PaymentAdvice paymentAdvice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PaymentAdvice getPaymentAdvice() {
        return paymentAdvice;
    }

    public void setPaymentAdvice(PaymentAdvice paymentAdvice) {
        this.paymentAdvice = paymentAdvice;
    }

    public Payment getPayment() {
        return payment;
    }

    public void setPayment(Payment payment) {
        this.payment = payment;
    }
}