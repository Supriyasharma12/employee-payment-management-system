package com.employee.payment.payment.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;

@Service
public class PaymentAdviceNumberService {

    private final JdbcTemplate jdbcTemplate;

    public PaymentAdviceNumberService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public String generateReferenceNo() {

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

        int year = today.getYear();
        int month = today.getMonthValue();

        Integer serialNumber = jdbcTemplate.queryForObject(
                """
                INSERT INTO payment_advice_sequence
                    (sequence_year, sequence_month, last_number)
                VALUES (?, ?, 1)
                ON CONFLICT (sequence_year, sequence_month)
                DO UPDATE SET
                    last_number = payment_advice_sequence.last_number + 1
                RETURNING last_number
                """,
                Integer.class,
                year,
                month
        );

        if (serialNumber == null) {
            throw new IllegalStateException(
                    "Unable to generate Payment Advice reference number."
            );
        }

        return String.format(
                Locale.ROOT,
                "PA/%04d/%02d/%04d",
                year,
                month,
                serialNumber
        );
    }
}