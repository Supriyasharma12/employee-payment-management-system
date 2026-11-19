
package com.employee.payment.payment.service;

import com.employee.payment.payment.dto.MultiMonthPaymentCreateRequest;
import com.employee.payment.payment.dto.PaymentMonthlyDetailRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import com.employee.payment.payment.dto.MultiMonthPaymentUpdateRequest;
import com.employee.payment.payment.entity.PaymentAdvice;
import com.employee.payment.payment.repository.PaymentAdviceRepository;
import com.employee.payment.payment.repository.PaymentAdvicePaymentRepository;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import com.employee.payment.payment.entity.Payment;
import java.util.concurrent.CyclicBarrier;

import static org.mockito.ArgumentMatchers.any;
import org.springframework.test.util.AopTestUtils;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;


import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class MultiMonthPaymentIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PaymentAdviceFinalizationService adviceService;

    @Autowired
    private PaymentAdviceRepository adviceRepository;

    @Autowired
    private PaymentAdvicePaymentRepository advicePaymentRepository;

    @MockitoSpyBean
    private PaymentMonthReservationService reservationService;

    @Test
    void shouldCreateMultiMonthPaymentAndReserveEverySelectedMonth() {

        Long employeeId = null;
        Long batchId = null;
        Long firstPeriodId = null;
        Long secondPeriodId = null;
        Long paymentId = null;

        SecurityContext previousContext =
                SecurityContextHolder.getContext();

        try {
            // 1. Get existing master records.

            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long categoryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM employee_categories WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long adminId = jdbcTemplate.queryForObject(
                    "SELECT id FROM admins WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);
            assertNotNull(categoryId);
            assertNotNull(adminId);

            String adminUsername = jdbcTemplate.queryForObject(
                    "SELECT username FROM admins WHERE id = ?",
                    String.class,
                    adminId
            );

            assertNotNull(adminUsername);

            // 2. Generate two historical, consecutive payment months.
            // Both must be on or before the current month.

            int year = ThreadLocalRandom.current().nextInt(2000, 2025);
            int month = ThreadLocalRandom.current().nextInt(1, 12);

            YearMonth firstMonth = YearMonth.of(year, month);
            YearMonth secondMonth = firstMonth.plusMonths(1);

            // 3. Create the first payment period.

            firstPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    firstMonth.getMonthValue(),
                    firstMonth.getYear(),
                    firstMonth.atDay(1),
                    firstMonth.atEndOfMonth()
            );

            // 4. Create the second payment period.

            secondPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    secondMonth.getMonthValue(),
                    secondMonth.getYear(),
                    secondMonth.atDay(1),
                    secondMonth.atEndOfMonth()
            );

            // 5. Create an OPEN payment batch.
            // A separate random year avoids batch_month conflicts.

            LocalDate batchMonth = LocalDate.of(
                    ThreadLocalRandom.current().nextInt(2200, 2500),
                    ThreadLocalRandom.current().nextInt(1, 13),
                    1
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Multi Month Test " + UUID.randomUUID(),
                    batchMonth
            );

            // 6. Create a test employee.

            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         department, category_id, bank_id,
                         payment_tracking_start_month, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    "MULTIMONTH-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Multi Month Test Employee",
                    "999900002222",
                    "IT",
                    categoryId,
                    bankId,
                    firstMonth.atDay(1)
            );

            // 7. Set the authenticated administrator.

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                    )
            );

            SecurityContextHolder.setContext(context);

            // 8. Prepare two monthly payment details.

            PaymentMonthlyDetailRequest firstDetail =
                    new PaymentMonthlyDetailRequest(
                            firstPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest secondDetail =
                    new PaymentMonthlyDetailRequest(
                            secondPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            MultiMonthPaymentCreateRequest request =
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            batchId,
                            LocalDate.now(),
                            List.of(firstDetail, secondDetail)
                    );

            // 9. Create the actual multi-month payment.

            paymentService.createMultiMonthPayment(request);

            // 10. Find the newly created parent payment.

            paymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    batchId
            );

            assertNotNull(paymentId);

            // 11. Verify the parent payment.

            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            assertEquals("DRAFT", paymentStatus);

            BigDecimal parentNetPayment = jdbcTemplate.queryForObject(
                    "SELECT net_payment FROM payments WHERE id = ?",
                    BigDecimal.class,
                    paymentId
            );

            assertEquals(
                    0,
                    new BigDecimal("3000.00").compareTo(parentNetPayment),
                    "Parent net payment should equal the sum of both months."
            );

            // 12. Verify that both monthly details were saved.

            Integer detailCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_monthly_details
                    WHERE payment_id = ?
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, detailCount);

            // 13. Verify that both selected months were RESERVED.

            Integer reservedCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(
                    2,
                    reservedCount,
                    "Both selected months must be reserved."
            );

            // 14. Verify the exact reserved payment periods.

            Integer firstReservationCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND payment_period_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    paymentId,
                    firstPeriodId
            );

            Integer secondReservationCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND payment_period_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    paymentId,
                    secondPeriodId
            );

            assertEquals(1, firstReservationCount);
            assertEquals(1, secondReservationCount);

        } finally {

            // Restore the original security context.

            SecurityContextHolder.setContext(previousContext);

            // Delete only records created by this test.

            if (paymentId != null) {

                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        paymentId
                );
            }

            if (employeeId != null) {
                jdbcTemplate.update(
                        "DELETE FROM employees WHERE id = ?",
                        employeeId
                );
            }

            if (batchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        batchId
                );
            }

            if (firstPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        firstPeriodId
                );
            }

            if (secondPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        secondPeriodId
                );
            }
        }
    }


    @Test
    void shouldUpdateMultiMonthDraftAndAdjustReservations() {

        Long employeeId = null;
        Long batchId = null;
        Long firstPeriodId = null;
        Long secondPeriodId = null;
        Long thirdPeriodId = null;
        Long paymentId = null;

        SecurityContext previousContext =
                SecurityContextHolder.getContext();

        try {
            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long categoryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM employee_categories WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long adminId = jdbcTemplate.queryForObject(
                    "SELECT id FROM admins WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);
            assertNotNull(categoryId);
            assertNotNull(adminId);

            String adminUsername = jdbcTemplate.queryForObject(
                    "SELECT username FROM admins WHERE id = ?",
                    String.class,
                    adminId
            );

            // Use three consecutive historical months.
            int year = ThreadLocalRandom.current().nextInt(2000, 2025);
            int month = ThreadLocalRandom.current().nextInt(1, 11);

            YearMonth firstMonth = YearMonth.of(year, month);
            YearMonth secondMonth = firstMonth.plusMonths(1);
            YearMonth thirdMonth = firstMonth.plusMonths(2);

            firstPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    firstMonth.getMonthValue(),
                    firstMonth.getYear(),
                    firstMonth.atDay(1),
                    firstMonth.atEndOfMonth()
            );

            secondPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    secondMonth.getMonthValue(),
                    secondMonth.getYear(),
                    secondMonth.atDay(1),
                    secondMonth.atEndOfMonth()
            );

            thirdPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    thirdMonth.getMonthValue(),
                    thirdMonth.getYear(),
                    thirdMonth.atDay(1),
                    thirdMonth.atEndOfMonth()
            );

            LocalDate batchMonth = LocalDate.of(
                    ThreadLocalRandom.current().nextInt(2200, 2500),
                    ThreadLocalRandom.current().nextInt(1, 13),
                    1
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Multi Month Update Test " + UUID.randomUUID(),
                    batchMonth
            );

            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         department, category_id, bank_id,
                         payment_tracking_start_month, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    "MMUPDATE-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Multi Month Update Test Employee",
                    "999900003333",
                    "IT",
                    categoryId,
                    bankId,
                    firstMonth.atDay(1)
            );

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                    )
            );

            SecurityContextHolder.setContext(context);

            // Initial draft: Month 1 + Month 2.
            PaymentMonthlyDetailRequest firstDetail =
                    new PaymentMonthlyDetailRequest(
                            firstPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest secondDetail =
                    new PaymentMonthlyDetailRequest(
                            secondPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            paymentService.createMultiMonthPayment(
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            batchId,
                            LocalDate.now(),
                            List.of(firstDetail, secondDetail)
                    )
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    batchId
            );

            assertNotNull(paymentId);

            // Update: keep Month 1, remove Month 2, add Month 3.
            // Change Month 1's amount to verify recalculation.
            PaymentMonthlyDetailRequest updatedFirstDetail =
                    new PaymentMonthlyDetailRequest(
                            firstPeriodId,
                            new BigDecimal("2000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest thirdDetail =
                    new PaymentMonthlyDetailRequest(
                            thirdPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            LocalDate updatedPaymentDate = LocalDate.now().minusDays(1);

            paymentService.updateMultiMonthPayment(
                    paymentId,
                    new MultiMonthPaymentUpdateRequest(
                            updatedPaymentDate,
                            List.of(updatedFirstDetail, thirdDetail)
                    )
            );

            // 1. Payment remains DRAFT.
            String status = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            assertEquals("DRAFT", status);

            // 2. Updated payment date was saved.
            LocalDate savedDate = jdbcTemplate.queryForObject(
                    "SELECT payment_date FROM payments WHERE id = ?",
                    LocalDate.class,
                    paymentId
            );

            assertEquals(updatedPaymentDate, savedDate);

            // 3. Net amount: 2500 + 1500 = 4000.
            BigDecimal net = jdbcTemplate.queryForObject(
                    "SELECT net_payment FROM payments WHERE id = ?",
                    BigDecimal.class,
                    paymentId
            );

            assertEquals(
                    0,
                    new BigDecimal("4000.00").compareTo(net)
            );

            // 4. Exactly two monthly details remain.
            Integer detailCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*) FROM payment_monthly_details
                    WHERE payment_id = ?
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, detailCount);

            // 5. Month 1 detail is retained and updated.
            BigDecimal firstMonthNet = jdbcTemplate.queryForObject(
                    """
                    SELECT net_payment FROM payment_monthly_details
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    BigDecimal.class,
                    paymentId,
                    firstPeriodId
            );

            assertEquals(
                    0,
                    new BigDecimal("2500.00").compareTo(firstMonthNet)
            );

            // 6. Month 2 detail was deleted.
            Integer removedDetailCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*) FROM payment_monthly_details
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    Integer.class,
                    paymentId,
                    secondPeriodId
            );

            assertEquals(0, removedDetailCount);

            // 7. Month 3 detail was added.
            Integer addedDetailCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*) FROM payment_monthly_details
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    Integer.class,
                    paymentId,
                    thirdPeriodId
            );

            assertEquals(1, addedDetailCount);

            // 8. Verify all three reservation statuses.
            String firstReservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status FROM payment_month_reservations
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    String.class,
                    paymentId,
                    firstPeriodId
            );

            String secondReservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status FROM payment_month_reservations
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    String.class,
                    paymentId,
                    secondPeriodId
            );

            String thirdReservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status FROM payment_month_reservations
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    String.class,
                    paymentId,
                    thirdPeriodId
            );

            assertEquals("RESERVED", firstReservationStatus);
            assertEquals("RELEASED", secondReservationStatus);
            assertEquals("RESERVED", thirdReservationStatus);

            // 9. Removed month must have a release timestamp.
            LocalDate releasedDate = jdbcTemplate.queryForObject(
                    """
                    SELECT CAST(released_at AS DATE)
                    FROM payment_month_reservations
                    WHERE payment_id = ? AND payment_period_id = ?
                    """,
                    LocalDate.class,
                    paymentId,
                    secondPeriodId
            );

            assertNotNull(releasedDate);

        } finally {

            SecurityContextHolder.setContext(previousContext);

            if (paymentId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT' AND entity_id = ?
                        """,
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        paymentId
                );
            }

            if (employeeId != null) {
                jdbcTemplate.update(
                        "DELETE FROM employees WHERE id = ?",
                        employeeId
                );
            }

            if (batchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        batchId
                );
            }

            if (firstPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        firstPeriodId
                );
            }

            if (secondPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        secondPeriodId
                );
            }

            if (thirdPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        thirdPeriodId
                );
            }
        }
    }



    @Test
    void shouldApproveMultiMonthPaymentAndMarkAllMonthsPaid() {

        Long employeeId = null;
        Long batchId = null;
        Long firstPeriodId = null;
        Long secondPeriodId = null;
        Long paymentId = null;

        SecurityContext previousContext =
                SecurityContextHolder.getContext();

        try {
            // 1. Use existing test master records.
            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long categoryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM employee_categories WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long adminId = jdbcTemplate.queryForObject(
                    "SELECT id FROM admins WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);
            assertNotNull(categoryId);
            assertNotNull(adminId);

            String adminUsername = jdbcTemplate.queryForObject(
                    "SELECT username FROM admins WHERE id = ?",
                    String.class,
                    adminId
            );

            // 2. Create two consecutive historical periods.
            int year = ThreadLocalRandom.current().nextInt(2000, 2025);
            int month = ThreadLocalRandom.current().nextInt(1, 12);

            YearMonth firstMonth = YearMonth.of(year, month);
            YearMonth secondMonth = firstMonth.plusMonths(1);

            firstPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    firstMonth.getMonthValue(),
                    firstMonth.getYear(),
                    firstMonth.atDay(1),
                    firstMonth.atEndOfMonth()
            );

            secondPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    secondMonth.getMonthValue(),
                    secondMonth.getYear(),
                    secondMonth.atDay(1),
                    secondMonth.atEndOfMonth()
            );

            // 3. Create an OPEN test batch.
            LocalDate batchMonth = LocalDate.of(
                    ThreadLocalRandom.current().nextInt(2200, 2500),
                    ThreadLocalRandom.current().nextInt(1, 13),
                    1
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Multi Month Approval Test " + UUID.randomUUID(),
                    batchMonth
            );

            // 4. Create a test employee.
            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         department, category_id, bank_id,
                         payment_tracking_start_month, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    "MMAPPROVE-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Multi Month Approval Test Employee",
                    "999900004444",
                    "IT",
                    categoryId,
                    bankId,
                    firstMonth.atDay(1)
            );

            // 5. Authenticate as an administrator.
            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                    )
            );

            SecurityContextHolder.setContext(context);

            // 6. Prepare both monthly payment details.
            PaymentMonthlyDetailRequest firstDetail =
                    new PaymentMonthlyDetailRequest(
                            firstPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest secondDetail =
                    new PaymentMonthlyDetailRequest(
                            secondPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            // 7. Create the multi-month DRAFT payment.
            paymentService.createMultiMonthPayment(
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            batchId,
                            LocalDate.now(),
                            List.of(firstDetail, secondDetail)
                    )
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    batchId
            );

            assertNotNull(paymentId);

            // 8. Confirm the initial DRAFT state.
            String initialStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            assertEquals("DRAFT", initialStatus);

            Integer initiallyReserved = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, initiallyReserved);

            // 9. Approve the payment.
            paymentService.approvePayment(paymentId);

            // 10. Parent payment must become APPROVED.
            String approvedStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            assertEquals("APPROVED", approvedStatus);

            // 11. Both months must become PAID.
            Integer paidCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'PAID'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(
                    2,
                    paidCount,
                    "Both selected months must become PAID."
            );

            // 12. No RESERVED months should remain.
            Integer reservedCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(0, reservedCount);

            // 13. Verify the exact PAID periods.
            Integer firstPaid = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND payment_period_id = ?
                      AND status = 'PAID'
                    """,
                    Integer.class,
                    paymentId,
                    firstPeriodId
            );

            Integer secondPaid = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND payment_period_id = ?
                      AND status = 'PAID'
                    """,
                    Integer.class,
                    paymentId,
                    secondPeriodId
            );

            assertEquals(1, firstPaid);
            assertEquals(1, secondPaid);

            // 14. Monthly details must remain unchanged.
            Integer detailCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_monthly_details
                    WHERE payment_id = ?
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, detailCount);

            // 15. Parent net payment must remain 3000.
            BigDecimal net = jdbcTemplate.queryForObject(
                    "SELECT net_payment FROM payments WHERE id = ?",
                    BigDecimal.class,
                    paymentId
            );

            assertNotNull(net);

            assertEquals(
                    0,
                    new BigDecimal("3000.00").compareTo(net)
            );

            // 16. Approved payment cannot be approved again.
            Long approvedPaymentId = paymentId;

            assertThrows(
                    IllegalStateException.class,
                    () -> paymentService.approvePayment(approvedPaymentId)
            );

            // 17. Failed second approval must not alter the state.
            Integer paidAfterSecondAttempt = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'PAID'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, paidAfterSecondAttempt);

        } finally {

            SecurityContextHolder.setContext(previousContext);

            // Remove only the records created by this test.
            if (paymentId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        paymentId
                );
            }

            if (employeeId != null) {
                jdbcTemplate.update(
                        "DELETE FROM employees WHERE id = ?",
                        employeeId
                );
            }

            if (batchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        batchId
                );
            }

            if (firstPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        firstPeriodId
                );
            }

            if (secondPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        secondPeriodId
                );
            }
        }
    }



    @Test
    void shouldPreservePaidMonthsAfterAdviceCancellationAndAllowReplacement() {

        Long employeeId = null;
        Long batchId = null;
        Long firstPeriodId = null;
        Long secondPeriodId = null;
        Long paymentId = null;
        Long originalAdviceId = null;
        Long replacementAdviceId = null;

        SecurityContext previousContext =
                SecurityContextHolder.getContext();

        try {
            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long categoryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM employee_categories WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long adminId = jdbcTemplate.queryForObject(
                    "SELECT id FROM admins WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);
            assertNotNull(categoryId);
            assertNotNull(adminId);

            String adminUsername = jdbcTemplate.queryForObject(
                    "SELECT username FROM admins WHERE id = ?",
                    String.class,
                    adminId
            );

            // Create two consecutive historical months.
            int year = ThreadLocalRandom.current().nextInt(2000, 2025);
            int month = ThreadLocalRandom.current().nextInt(1, 12);

            YearMonth firstMonth = YearMonth.of(year, month);
            YearMonth secondMonth = firstMonth.plusMonths(1);

            firstPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    firstMonth.getMonthValue(),
                    firstMonth.getYear(),
                    firstMonth.atDay(1),
                    firstMonth.atEndOfMonth()
            );

            secondPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    secondMonth.getMonthValue(),
                    secondMonth.getYear(),
                    secondMonth.atDay(1),
                    secondMonth.atEndOfMonth()
            );

            LocalDate batchMonth = LocalDate.of(
                    ThreadLocalRandom.current().nextInt(2200, 2500),
                    ThreadLocalRandom.current().nextInt(1, 13),
                    1
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Advice Cancellation Test " + UUID.randomUUID(),
                    batchMonth
            );

            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         department, category_id, bank_id,
                         payment_tracking_start_month, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    "MMADVICE-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Advice Cancellation Test Employee",
                    "999900005555",
                    "IT",
                    categoryId,
                    bankId,
                    firstMonth.atDay(1)
            );

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                    )
            );

            SecurityContextHolder.setContext(context);

            PaymentMonthlyDetailRequest firstDetail =
                    new PaymentMonthlyDetailRequest(
                            firstPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest secondDetail =
                    new PaymentMonthlyDetailRequest(
                            secondPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            // 1. Create and approve the multi-month payment.
            paymentService.createMultiMonthPayment(
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            batchId,
                            LocalDate.now(),
                            List.of(firstDetail, secondDetail)
                    )
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    ORDER BY id DESC LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    batchId
            );

            assertNotNull(paymentId);

            paymentService.approvePayment(paymentId);

            // 2. Finalize the original advice.
            PaymentAdvice originalAdvice =
                    adviceService.finalizeAdvice(batchId, bankId);

            originalAdviceId = originalAdvice.getId();

            assertEquals("FINALIZED", originalAdvice.getStatus());
            assertTrue(
                    advicePaymentRepository.existsByPaymentAdvice_IdAndPayment_Id(
                            originalAdviceId, paymentId
                    )
            );

            // 3. A second active advice must be rejected.
            Long testBatchId = batchId;
            Long testBankId = bankId;

            assertThrows(
                    IllegalStateException.class,
                    () -> adviceService.finalizeAdvice(
                            testBatchId, testBankId
                    )
            );

            // 4. Cancel the original advice.
            adviceService.cancelAdvice(
                    originalAdviceId,
                    "Integration test cancellation"
            );

            PaymentAdvice cancelledAdvice =
                    adviceRepository.findById(originalAdviceId)
                            .orElseThrow();

            assertEquals("CANCELLED", cancelledAdvice.getStatus());
            assertEquals(
                    "Integration test cancellation",
                    cancelledAdvice.getCancellationReason()
            );
            assertNotNull(cancelledAdvice.getCancelledAt());

            // 5. Original advice must retain its payment link.
            assertTrue(
                    advicePaymentRepository.existsByPaymentAdvice_IdAndPayment_Id(
                            originalAdviceId, paymentId
                    )
            );

            // 6. Payment must remain APPROVED.
            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            assertEquals("APPROVED", paymentStatus);

            // 7. Both monthly reservations must remain PAID.
            Integer paidCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'PAID'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, paidCount);

            Integer releasedCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RELEASED'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(0, releasedCount);

            // 8. Create a replacement advice.
            PaymentAdvice replacementAdvice =
                    adviceService.finalizeAdvice(batchId, bankId);

            replacementAdviceId = replacementAdvice.getId();

            assertNotEquals(originalAdviceId, replacementAdviceId);
            assertEquals("FINALIZED", replacementAdvice.getStatus());

            assertTrue(
                    advicePaymentRepository.existsByPaymentAdvice_IdAndPayment_Id(
                            replacementAdviceId, paymentId
                    )
            );

            assertNotEquals(
                    originalAdvice.getReferenceNo(),
                    replacementAdvice.getReferenceNo()
            );

            // 9. Original advice must remain CANCELLED.
            assertEquals(
                    "CANCELLED",
                    adviceRepository.findById(originalAdviceId)
                            .orElseThrow()
                            .getStatus()
            );

            // 10. Replacement must not change payment or reservations.
            assertEquals(
                    "APPROVED",
                    jdbcTemplate.queryForObject(
                            "SELECT status FROM payments WHERE id = ?",
                            String.class,
                            paymentId
                    )
            );

            assertEquals(
                    2,
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)
                            FROM payment_month_reservations
                            WHERE payment_id = ? AND status = 'PAID'
                            """,
                            Integer.class,
                            paymentId
                    )
            );

        } finally {
            SecurityContextHolder.setContext(previousContext);

            // Delete advice links before deleting advice or payment.
            if (replacementAdviceId != null) {
                advicePaymentRepository.deleteAll(
                        advicePaymentRepository.findByPaymentAdvice_Id(
                                replacementAdviceId
                        )
                );
                adviceRepository.deleteById(replacementAdviceId);
            }

            if (originalAdviceId != null) {
                advicePaymentRepository.deleteAll(
                        advicePaymentRepository.findByPaymentAdvice_Id(
                                originalAdviceId
                        )
                );
                adviceRepository.deleteById(originalAdviceId);
            }

            if (paymentId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT' AND entity_id = ?
                        """,
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        paymentId
                );
            }

            if (employeeId != null) {
                jdbcTemplate.update(
                        "DELETE FROM employees WHERE id = ?",
                        employeeId
                );
            }

            if (batchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        batchId
                );
            }

            if (firstPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        firstPeriodId
                );
            }

            if (secondPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        secondPeriodId
                );
            }
        }
    }



    @Test
    void shouldPreventOverlappingMultiMonthDraftReservationsAndAllowReclaimAfterCancellation() {

        Long employeeId = null;
        Long firstBatchId = null;
        Long secondBatchId = null;
        Long firstPeriodId = null;
        Long secondPeriodId = null;
        Long thirdPeriodId = null;
        Long firstPaymentId = null;
        Long secondPaymentId = null;

        SecurityContext previousContext = SecurityContextHolder.getContext();

        try {
            // 1. Get existing master records.
            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long categoryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM employee_categories WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long adminId = jdbcTemplate.queryForObject(
                    "SELECT id FROM admins WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);
            assertNotNull(categoryId);
            assertNotNull(adminId);

            String adminUsername = jdbcTemplate.queryForObject(
                    "SELECT username FROM admins WHERE id = ?",
                    String.class,
                    adminId
            );

            assertNotNull(adminUsername);

            // 2. Create three consecutive historical payment periods.
            int year = ThreadLocalRandom.current().nextInt(2000, 2025);
            int month = ThreadLocalRandom.current().nextInt(1, 11);

            YearMonth firstMonth = YearMonth.of(year, month);
            YearMonth secondMonth = firstMonth.plusMonths(1);
            YearMonth thirdMonth = firstMonth.plusMonths(2);

            firstPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    firstMonth.getMonthValue(),
                    firstMonth.getYear(),
                    firstMonth.atDay(1),
                    firstMonth.atEndOfMonth()
            );

            secondPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    secondMonth.getMonthValue(),
                    secondMonth.getYear(),
                    secondMonth.atDay(1),
                    secondMonth.atEndOfMonth()
            );

            thirdPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    thirdMonth.getMonthValue(),
                    thirdMonth.getYear(),
                    thirdMonth.atDay(1),
                    thirdMonth.atEndOfMonth()
            );

            // 3. Create two different OPEN batches.
            LocalDate firstBatchMonth = LocalDate.of(
                    ThreadLocalRandom.current().nextInt(2200, 2500),
                    ThreadLocalRandom.current().nextInt(1, 13),
                    1
            );

            LocalDate secondBatchMonth = firstBatchMonth.plusMonths(1);

            firstBatchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Overlap Test Batch 1 " + UUID.randomUUID(),
                    firstBatchMonth
            );

            secondBatchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Overlap Test Batch 2 " + UUID.randomUUID(),
                    secondBatchMonth
            );

            // 4. Create one test employee.
            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         department, category_id, bank_id,
                         payment_tracking_start_month, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    "MMOVERLAP-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Multi Month Overlap Test Employee",
                    "999900005555",
                    "IT",
                    categoryId,
                    bankId,
                    firstMonth.atDay(1)
            );

            // 5. Authenticate as an administrator.
            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                    )
            );

            SecurityContextHolder.setContext(context);

            // 6. Prepare the monthly details.
            PaymentMonthlyDetailRequest firstDetail =
                    new PaymentMonthlyDetailRequest(
                            firstPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest secondDetail =
                    new PaymentMonthlyDetailRequest(
                            secondPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            PaymentMonthlyDetailRequest thirdDetail =
                    new PaymentMonthlyDetailRequest(
                            thirdPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            // 7. First draft claims Month 1 + Month 2.
            paymentService.createMultiMonthPayment(
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            firstBatchId,
                            LocalDate.now(),
                            List.of(firstDetail, secondDetail)
                    )
            );

            firstPaymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    firstBatchId
            );

            assertNotNull(firstPaymentId);

            // 8. Verify that Month 1 and Month 2 are RESERVED.
            Integer initialReservedCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    firstPaymentId
            );

            assertEquals(2, initialReservedCount);

            // 9. Second draft attempts Month 2 + Month 3.
            // Month 2 is already reserved by the first draft.
            MultiMonthPaymentCreateRequest overlappingRequest =
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            secondBatchId,
                            LocalDate.now(),
                            List.of(secondDetail, thirdDetail)
                    );

            assertThrows(
                    IllegalStateException.class,
                    () -> paymentService.createMultiMonthPayment(
                            overlappingRequest
                    ),
                    "The overlapping claim must be rejected."
            );

            // 10. The failed request must not create a payment.
            Integer secondBatchPaymentCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    """,
                    Integer.class,
                    employeeId,
                    secondBatchId
            );

            assertEquals(
                    0,
                    secondBatchPaymentCount,
                    "A rejected request must not leave behind a payment."
            );

            // 11. Month 3 must remain completely unreserved.
            Integer thirdMonthReservationCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_period_id = ?
                      AND status IN ('RESERVED', 'PAID')
                    """,
                    Integer.class,
                    thirdPeriodId
            );

            assertEquals(
                    0,
                    thirdMonthReservationCount,
                    "The non-overlapping month must not be partially reserved."
            );

            // 12. Cancel the first draft.
            paymentService.cancelDraftPayment(firstPaymentId);

            String firstPaymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    firstPaymentId
            );

            assertEquals("CANCELLED", firstPaymentStatus);

            // 13. Both reservations from the first draft must be RELEASED.
            Integer releasedCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RELEASED'
                    """,
                    Integer.class,
                    firstPaymentId
            );

            assertEquals(2, releasedCount);

            // 14. Retry the second draft after cancellation.
            // Both Month 2 and Month 3 should now be available.
            paymentService.createMultiMonthPayment(overlappingRequest);

            secondPaymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND payment_period_id IS NULL
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    secondBatchId
            );

            assertNotNull(secondPaymentId);

            // 15. Verify the second draft was created successfully.
            String secondPaymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    secondPaymentId
            );

            assertEquals("DRAFT", secondPaymentStatus);

            // 16. Verify Month 2 and Month 3 are now RESERVED by the second draft.
            Integer secondDraftReservedCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    secondPaymentId
            );

            assertEquals(2, secondDraftReservedCount);

            Integer secondMonthReserved = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND payment_period_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    secondPaymentId,
                    secondPeriodId
            );

            Integer thirdMonthReserved = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                      AND payment_period_id = ?
                      AND status = 'RESERVED'
                    """,
                    Integer.class,
                    secondPaymentId,
                    thirdPeriodId
            );

            assertEquals(1, secondMonthReserved);
            assertEquals(1, thirdMonthReserved);

        } finally {
            SecurityContextHolder.setContext(previousContext);

            // Remove only records created by this test.
            List<Long> testPaymentIds = new ArrayList<>();

            if (firstPaymentId != null) {
                testPaymentIds.add(firstPaymentId);
            }

            if (secondPaymentId != null) {
                testPaymentIds.add(secondPaymentId);
            }

            for (Long testPaymentId : testPaymentIds) {
                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
                        testPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        testPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        testPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        testPaymentId
                );
            }

            if (employeeId != null) {
                jdbcTemplate.update(
                        "DELETE FROM employees WHERE id = ?",
                        employeeId
                );
            }

            if (firstBatchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        firstBatchId
                );
            }

            if (secondBatchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        secondBatchId
                );
            }

            if (firstPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        firstPeriodId
                );
            }

            if (secondPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        secondPeriodId
                );
            }

            if (thirdPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        thirdPeriodId
                );
            }
        }
    }


    @Test
    void shouldAllowOnlyOneConcurrentReservationForSameEmployeeMonth()
            throws Exception {

        Long employeeId = null;
        Long paymentPeriodId = null;
        Long firstBatchId = null;
        Long secondBatchId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            // 1. Get existing master records.

            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long categoryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM employee_categories WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            Long adminId = jdbcTemplate.queryForObject(
                    "SELECT id FROM admins WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);
            assertNotNull(categoryId);
            assertNotNull(adminId);

            String adminUsername = jdbcTemplate.queryForObject(
                    "SELECT username FROM admins WHERE id = ?",
                    String.class,
                    adminId
            );

            assertNotNull(adminUsername);

            // 2. Create one unique payment period.

            YearMonth testMonth = YearMonth.of(
                    ThreadLocalRandom.current().nextInt(2000, 2025),
                    ThreadLocalRandom.current().nextInt(1, 13)
            );

            paymentPeriodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    testMonth.getMonthValue(),
                    testMonth.getYear(),
                    testMonth.atDay(1),
                    testMonth.atEndOfMonth()
            );

            // 3. Create two different OPEN batches.

            LocalDate firstBatchMonth = LocalDate.of(
                    ThreadLocalRandom.current().nextInt(2200, 2499),
                    ThreadLocalRandom.current().nextInt(1, 13),
                    1
            );

            LocalDate secondBatchMonth =
                    firstBatchMonth.plusMonths(1);

            firstBatchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Concurrent Reservation A " + UUID.randomUUID(),
                    firstBatchMonth
            );

            secondBatchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Concurrent Reservation B " + UUID.randomUUID(),
                    secondBatchMonth
            );

            // 4. Create one test employee.

            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         department, category_id, bank_id,
                         payment_tracking_start_month, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    "MMCONC-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Concurrent Reservation Test Employee",
                    "ACCT-" + UUID.randomUUID()
                            .toString().replace("-", "").substring(0, 16),
                    "IT",
                    categoryId,
                    bankId,
                    testMonth.atDay(1)
            );

            // 5. Both requests will claim exactly the same month.

            PaymentMonthlyDetailRequest sharedDetail =
                    new PaymentMonthlyDetailRequest(
                            paymentPeriodId,
                            new BigDecimal("1000.00"),
                            new BigDecimal("500.00"),
                            new BigDecimal("200.00"),
                            new BigDecimal("100.00"),
                            new BigDecimal("50.00"),
                            new BigDecimal("50.00")
                    );

            MultiMonthPaymentCreateRequest firstRequest =
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            firstBatchId,
                            LocalDate.now(),
                            List.of(sharedDetail)
                    );

            MultiMonthPaymentCreateRequest secondRequest =
                    new MultiMonthPaymentCreateRequest(
                            employeeId,
                            secondBatchId,
                            LocalDate.now(),
                            List.of(sharedDetail)
                    );

            // 6. Synchronize both transactions immediately before
            //    the actual reservation operation.

            PaymentMonthReservationService reservationSpy =
                    AopTestUtils.getUltimateTargetObject(
                            reservationService
                    );

            CyclicBarrier reservationBarrier =
                    new CyclicBarrier(2);

            doAnswer(invocation -> {

                reservationBarrier.await(
                        20,
                        TimeUnit.SECONDS
                );

                return invocation.callRealMethod();

            }).when(reservationSpy).reserveMonths(
                    anyLong(),
                    any(Payment.class),
                    anyList()
            );

            // 7. Submit both requests on separate threads.
            //    Each thread gets its own authenticated security context.

            CompletableFuture<RuntimeException> firstFuture =
                    CompletableFuture.supplyAsync(
                            () -> runMultiMonthPaymentAsAdmin(
                                    adminUsername,
                                    firstRequest
                            ),
                            executor
                    );

            CompletableFuture<RuntimeException> secondFuture =
                    CompletableFuture.supplyAsync(
                            () -> runMultiMonthPaymentAsAdmin(
                                    adminUsername,
                                    secondRequest
                            ),
                            executor
                    );

            RuntimeException firstFailure =
                    firstFuture.get(40, TimeUnit.SECONDS);

            RuntimeException secondFailure =
                    secondFuture.get(40, TimeUnit.SECONDS);

            // 8. Exactly one request must succeed.

            int successfulRequests =
                    (firstFailure == null ? 1 : 0)
                            + (secondFailure == null ? 1 : 0);

            assertEquals(
                    1,
                    successfulRequests,
                    "Exactly one concurrent request must reserve the month."
            );

            RuntimeException losingFailure =
                    firstFailure != null
                            ? firstFailure
                            : secondFailure;

            assertNotNull(losingFailure);

            assertTrue(
                    losingFailure instanceof IllegalStateException
                            || causeChainContainsText(
                            losingFailure,
                            "uq_active_employee_month_reservation"
                    ),
                    "The losing request must fail because "
                            + "the employee-month is already claimed. Actual: "
                            + losingFailure
            );

            // 9. Exactly one parent payment must remain.

            Integer paymentCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_period_id IS NULL
                    """,
                    Integer.class,
                    employeeId
            );

            assertEquals(1, paymentCount);

            // 10. Exactly one monthly detail must remain.

            Integer detailCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_monthly_details d
                    JOIN payments p ON p.id = d.payment_id
                    WHERE p.employee_id = ?
                    """,
                    Integer.class,
                    employeeId
            );

            assertEquals(1, detailCount);

            // 11. Exactly one active reservation must remain.

            Integer reservationCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_month_reservations
                    WHERE employee_id = ?
                      AND payment_period_id = ?
                      AND status IN ('RESERVED', 'PAID')
                    """,
                    Integer.class,
                    employeeId,
                    paymentPeriodId
            );

            assertEquals(
                    1,
                    reservationCount,
                    "Only one active reservation can exist for this month."
            );

        } finally {

            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            // Clean up only this test employee's records.

            if (employeeId != null) {

                List<Long> testPaymentIds =
                        jdbcTemplate.queryForList(
                                "SELECT id FROM payments WHERE employee_id = ?",
                                Long.class,
                                employeeId
                        );

                for (Long testPaymentId : testPaymentIds) {

                    jdbcTemplate.update(
                            """
                            DELETE FROM audit_logs
                            WHERE entity_type = 'PAYMENT'
                              AND entity_id = ?
                            """,
                            testPaymentId
                    );

                    jdbcTemplate.update(
                            "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                            testPaymentId
                    );

                    jdbcTemplate.update(
                            "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                            testPaymentId
                    );

                    jdbcTemplate.update(
                            "DELETE FROM payments WHERE id = ?",
                            testPaymentId
                    );
                }

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE employee_id = ?",
                        employeeId
                );

                jdbcTemplate.update(
                        "DELETE FROM employees WHERE id = ?",
                        employeeId
                );
            }

            if (firstBatchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        firstBatchId
                );
            }

            if (secondBatchId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_batches WHERE id = ?",
                        secondBatchId
                );
            }

            if (paymentPeriodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        paymentPeriodId
                );
            }
        }
    }
    private RuntimeException runMultiMonthPaymentAsAdmin(
            String adminUsername,
            MultiMonthPaymentCreateRequest request) {

        SecurityContext previousContext =
                SecurityContextHolder.getContext();

        try {
            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(
                                    new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                    )
            );

            SecurityContextHolder.setContext(context);

            paymentService.createMultiMonthPayment(request);

            return null;

        } catch (RuntimeException exception) {

            return exception;

        } finally {

            SecurityContextHolder.setContext(previousContext);
        }
    }


    private boolean causeChainContainsText(
            Throwable exception,
            String expectedText) {

        Throwable current = exception;

        while (current != null) {

            if (current.getMessage() != null
                    && current.getMessage().contains(expectedText)) {
                return true;
            }

            current = current.getCause();
        }

        return false;
    }
}
