
package com.employee.payment.payment.service;

import com.employee.payment.payment.entity.Payment;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import com.employee.payment.payment.dto.PaymentUpdateRequest;
import java.math.BigDecimal;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import com.employee.payment.payment.dto.PaymentCreateRequest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class PaymentConcurrencyIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    record Attempt(boolean success, RuntimeException failure) {}

    @Test
    void shouldAllowOnlyOneOperationWhenApprovalAndCancellationRunConcurrently()
            throws Exception {

        Long employeeId = null;
        Long batchId = null;
        Long periodId = null;
        Long paymentId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            // 1. Find existing master records.
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

            // 2. Create a unique payment period and batch month.
            int month = ThreadLocalRandom.current().nextInt(1, 13);
            int year = ThreadLocalRandom.current().nextInt(2200, 100000);

            LocalDate batchMonth = LocalDate.of(year, month, 1);

            periodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    month,
                    year,
                    batchMonth,
                    batchMonth.withDayOfMonth(batchMonth.lengthOfMonth())
            );

            // 3. Create an OPEN payment batch.
            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Payment Concurrency Test " + UUID.randomUUID(),
                    batchMonth
            );

            // 4. Create a test employee.
            String employeeCode =
                    "PAYCONC-" + UUID.randomUUID().toString().substring(0, 8);

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
                    employeeCode,
                    "Payment Concurrency Test Employee",
                    "999900009999",
                    "IT",
                    categoryId,
                    bankId,
                    batchMonth
            );

            // 5. Create a DRAFT payment.
            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_period_id, payment_batch_id,
                         payment_date, status, created_by)
                    VALUES (?, ?, ?, CURRENT_DATE, 'DRAFT', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    periodId,
                    batchId,
                    adminId
            );

            // 6. Create the corresponding monthly detail.
            jdbcTemplate.update(
                    """
                    INSERT INTO payment_monthly_details
                        (payment_id, payment_period_id)
                    VALUES (?, ?)
                    """,
                    paymentId,
                    periodId
            );

            // 7. Create its RESERVED month reservation.
            jdbcTemplate.update(
                    """
                    INSERT INTO payment_month_reservations
                        (employee_id, payment_period_id, payment_id, status)
                    VALUES (?, ?, ?, 'RESERVED')
                    """,
                    employeeId,
                    periodId,
                    paymentId
            );

            Long finalPaymentId = paymentId;

            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            // 8. Start approval and cancellation simultaneously.
            CompletableFuture<Attempt> approval =
                    CompletableFuture.supplyAsync(
                            () -> runApproval(
                                    finalPaymentId,
                                    adminUsername,
                                    ready,
                                    start
                            ),
                            executor
                    );

            CompletableFuture<Attempt> cancellation =
                    CompletableFuture.supplyAsync(
                            () -> runCancellation(
                                    finalPaymentId,
                                    adminUsername,
                                    ready,
                                    start
                            ),
                            executor
                    );

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both operations did not become ready."
            );

            start.countDown();

            Attempt approvalResult = approval.get(30, TimeUnit.SECONDS);
            Attempt cancellationResult = cancellation.get(30, TimeUnit.SECONDS);

            // 9. Exactly one operation must succeed.
            int successfulOperations =
                    (approvalResult.success() ? 1 : 0)
                            + (cancellationResult.success() ? 1 : 0);

            assertEquals(
                    1,
                    successfulOperations,
                    "Exactly one operation should succeed."
            );

            Attempt failedAttempt =
                    approvalResult.success()
                            ? cancellationResult
                            : approvalResult;

            assertNotNull(failedAttempt.failure());

            assertInstanceOf(
                    IllegalStateException.class,
                    failedAttempt.failure()
            );

            // 10. Verify final payment and reservation statuses.
            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            String reservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                    """,
                    String.class,
                    paymentId
            );

            if (approvalResult.success()) {
                assertEquals("APPROVED", paymentStatus);
                assertEquals("PAID", reservationStatus);
            } else {
                assertTrue(cancellationResult.success());
                assertEquals("CANCELLED", paymentStatus);
                assertEquals("RELEASED", reservationStatus);
            }

        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            // 11. Clean up only the records created by this test.
            if (paymentId != null) {
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

            if (periodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        periodId
                );
            }
        }
    }


    @Test
    void shouldAllowOnlyOneConcurrentApprovalForSamePayment()
            throws Exception {

        Long employeeId = null;
        Long batchId = null;
        Long periodId = null;
        Long paymentId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

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

            assertNotNull(adminUsername);

            int month = ThreadLocalRandom.current().nextInt(1, 13);
            int year = ThreadLocalRandom.current().nextInt(2200, 100000);

            LocalDate batchMonth = LocalDate.of(year, month, 1);

            periodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    month,
                    year,
                    batchMonth,
                    batchMonth.withDayOfMonth(batchMonth.lengthOfMonth())
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Concurrent Approval Test " + UUID.randomUUID(),
                    batchMonth
            );

            String employeeCode =
                    "APPROVE-" + UUID.randomUUID().toString().substring(0, 8);

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
                    employeeCode,
                    "Concurrent Approval Test Employee",
                    "999900008888",
                    "IT",
                    categoryId,
                    bankId,
                    batchMonth
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_period_id, payment_batch_id,
                         payment_date, status, created_by)
                    VALUES (?, ?, ?, CURRENT_DATE, 'DRAFT', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    periodId,
                    batchId,
                    adminId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_monthly_details
                        (payment_id, payment_period_id)
                    VALUES (?, ?)
                    """,
                    paymentId,
                    periodId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_month_reservations
                        (employee_id, payment_period_id, payment_id, status)
                    VALUES (?, ?, ?, 'RESERVED')
                    """,
                    employeeId,
                    periodId,
                    paymentId
            );

            Long finalPaymentId = paymentId;

            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            CompletableFuture<Attempt> first = CompletableFuture.supplyAsync(
                    () -> runApproval(
                            finalPaymentId,
                            adminUsername,
                            ready,
                            start
                    ),
                    executor
            );

            CompletableFuture<Attempt> second = CompletableFuture.supplyAsync(
                    () -> runApproval(
                            finalPaymentId,
                            adminUsername,
                            ready,
                            start
                    ),
                    executor
            );

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both approval requests did not become ready."
            );

            start.countDown();

            Attempt firstResult = first.get(30, TimeUnit.SECONDS);
            Attempt secondResult = second.get(30, TimeUnit.SECONDS);

            int successfulRequests =
                    (firstResult.success() ? 1 : 0)
                            + (secondResult.success() ? 1 : 0);

            assertEquals(
                    1,
                    successfulRequests,
                    "Exactly one approval request should succeed."
            );

            Attempt failedAttempt =
                    firstResult.success() ? secondResult : firstResult;

            assertNotNull(failedAttempt.failure());

            assertInstanceOf(
                    IllegalStateException.class,
                    failedAttempt.failure()
            );

            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            String reservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                    """,
                    String.class,
                    paymentId
            );

            assertEquals("APPROVED", paymentStatus);
            assertEquals("PAID", reservationStatus);

            Integer approvalAuditCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM audit_logs
                    WHERE entity_type = 'PAYMENT'
                      AND entity_id = ?
                      AND action = 'APPROVE'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(
                    1,
                    approvalAuditCount,
                    "Only one approval audit entry should be recorded."
            );

        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            if (paymentId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM payment_month_reservations
                        WHERE payment_id = ?
                        """,
                        paymentId
                );

                jdbcTemplate.update(
                        """
                        DELETE FROM payment_monthly_details
                        WHERE payment_id = ?
                        """,
                        paymentId
                );

                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
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

            if (periodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        periodId
                );
            }
        }
    }



    @Test
    void shouldAllowOnlyOneConcurrentCancellationForSamePayment()
            throws Exception {

        Long employeeId = null;
        Long batchId = null;
        Long periodId = null;
        Long paymentId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

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

            assertNotNull(adminUsername);

            int month = ThreadLocalRandom.current().nextInt(1, 13);
            int year = ThreadLocalRandom.current().nextInt(2200, 100000);

            LocalDate batchMonth = LocalDate.of(year, month, 1);

            periodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    month,
                    year,
                    batchMonth,
                    batchMonth.withDayOfMonth(batchMonth.lengthOfMonth())
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Concurrent Cancellation Test " + UUID.randomUUID(),
                    batchMonth
            );

            String employeeCode =
                    "CANCEL-" + UUID.randomUUID().toString().substring(0, 8);

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
                    employeeCode,
                    "Concurrent Cancellation Test Employee",
                    "999900007777",
                    "IT",
                    categoryId,
                    bankId,
                    batchMonth
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_period_id, payment_batch_id,
                         payment_date, status, created_by)
                    VALUES (?, ?, ?, CURRENT_DATE, 'DRAFT', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    periodId,
                    batchId,
                    adminId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_monthly_details
                        (payment_id, payment_period_id)
                    VALUES (?, ?)
                    """,
                    paymentId,
                    periodId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_month_reservations
                        (employee_id, payment_period_id, payment_id, status)
                    VALUES (?, ?, ?, 'RESERVED')
                    """,
                    employeeId,
                    periodId,
                    paymentId
            );

            Long finalPaymentId = paymentId;

            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            CompletableFuture<Attempt> first = CompletableFuture.supplyAsync(
                    () -> runCancellation(
                            finalPaymentId,
                            adminUsername,
                            ready,
                            start
                    ),
                    executor
            );

            CompletableFuture<Attempt> second = CompletableFuture.supplyAsync(
                    () -> runCancellation(
                            finalPaymentId,
                            adminUsername,
                            ready,
                            start
                    ),
                    executor
            );

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both cancellation requests did not become ready."
            );

            start.countDown();

            Attempt firstResult = first.get(30, TimeUnit.SECONDS);
            Attempt secondResult = second.get(30, TimeUnit.SECONDS);

            int successfulRequests =
                    (firstResult.success() ? 1 : 0)
                            + (secondResult.success() ? 1 : 0);

            assertEquals(
                    1,
                    successfulRequests,
                    "Exactly one cancellation request should succeed."
            );

            Attempt failedAttempt =
                    firstResult.success() ? secondResult : firstResult;

            assertNotNull(failedAttempt.failure());

            assertInstanceOf(
                    IllegalStateException.class,
                    failedAttempt.failure()
            );

            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            String reservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                    """,
                    String.class,
                    paymentId
            );

            assertEquals("CANCELLED", paymentStatus);
            assertEquals("RELEASED", reservationStatus);

            Integer cancellationAuditCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM audit_logs
                    WHERE entity_type = 'PAYMENT'
                      AND entity_id = ?
                      AND action = 'CANCEL'
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(
                    1,
                    cancellationAuditCount,
                    "Only one cancellation audit entry should be recorded."
            );

        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            if (paymentId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
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

            if (periodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        periodId
                );
            }
        }
    }



    @Test
    void shouldPreventDraftEditFromOverwritingConcurrentApproval()
            throws Exception {

        Long employeeId = null;
        Long batchId = null;
        Long periodId = null;
        Long paymentId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

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

            assertNotNull(adminUsername);

            LocalDate batchMonth = LocalDate.now()
                    .withDayOfMonth(1);

            int month = batchMonth.getMonthValue();
            int year = batchMonth.getYear();

            periodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    month,
                    year,
                    batchMonth,
                    batchMonth.withDayOfMonth(batchMonth.lengthOfMonth())
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Edit Approval Test " + UUID.randomUUID(),
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
                    "EDITAPP-" + UUID.randomUUID().toString().substring(0, 8),
                    "Edit Approval Test Employee",
                    "999900006666",
                    "IT",
                    categoryId,
                    bankId,
                    batchMonth
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_period_id, payment_batch_id,
                         payment_date, status, created_by)
                    VALUES (?, ?, ?, CURRENT_DATE, 'DRAFT', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    periodId,
                    batchId,
                    adminId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_monthly_details
                        (payment_id, payment_period_id)
                    VALUES (?, ?)
                    """,
                    paymentId,
                    periodId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_month_reservations
                        (employee_id, payment_period_id, payment_id, status)
                    VALUES (?, ?, ?, 'RESERVED')
                    """,
                    employeeId,
                    periodId,
                    paymentId
            );

            Long finalPaymentId = paymentId;

            PaymentUpdateRequest request = new PaymentUpdateRequest(
                    LocalDate.now(),
                    new BigDecimal("1500.00"),
                    new BigDecimal("500.00"),
                    new BigDecimal("200.00"),
                    new BigDecimal("100.00"),
                    new BigDecimal("50.00"),
                    new BigDecimal("25.00")
            );

            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            CompletableFuture<Attempt> editFuture =
                    CompletableFuture.supplyAsync(
                            () -> runOperation(
                                    () -> paymentService.updateDraftPayment(
                                            finalPaymentId,
                                            request
                                    ),
                                    adminUsername,
                                    ready,
                                    start
                            ),
                            executor
                    );

            CompletableFuture<Attempt> approvalFuture =
                    CompletableFuture.supplyAsync(
                            () -> runApproval(
                                    finalPaymentId,
                                    adminUsername,
                                    ready,
                                    start
                            ),
                            executor
                    );

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both requests did not become ready."
            );

            start.countDown();

            Attempt editResult = editFuture.get(30, TimeUnit.SECONDS);
            Attempt approvalResult = approvalFuture.get(30, TimeUnit.SECONDS);

            // Approval must succeed regardless of which request gets the lock first.
            assertTrue(
                    approvalResult.success(),
                    "Approval should succeed. Failure: "
                            + approvalResult.failure()
            );

            // The edit either completes before approval or is rejected afterward.
            if (!editResult.success()) {
//                assertInstanceOf(
//                        IllegalStateException.class,
//                        editResult.failure()
//                );

                assertInstanceOf(
                        IllegalStateException.class,
                        editResult.failure(),
                        "Unexpected edit failure: " + editResult.failure()
                );
            }

            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            String reservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                    """,
                    String.class,
                    paymentId
            );

            BigDecimal finalNetPayment = jdbcTemplate.queryForObject(
                    "SELECT net_payment FROM payments WHERE id = ?",
                    BigDecimal.class,
                    paymentId
            );

            assertEquals("APPROVED", paymentStatus);
            assertEquals("PAID", reservationStatus);

            System.out.println("EDIT SUCCESS: " + editResult.success());
            System.out.println("EDIT FAILURE: " + editResult.failure());
            System.out.println("APPROVAL SUCCESS: " + approvalResult.success());
            System.out.println("FINAL NET PAYMENT: " + finalNetPayment);


            if (editResult.success()) {
                assertEquals(
                        0,
                        new BigDecimal("2025.00").compareTo(finalNetPayment),
                        "The successful edit should be preserved by approval."
                );
            } else {
                assertEquals(
                        0,
                        BigDecimal.ZERO.compareTo(finalNetPayment),
                        "A rejected edit must not change the original payment."
                );
            }

        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            if (paymentId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
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

            if (periodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        periodId
                );
            }
        }
    }



    @Test
    void shouldPreventDraftEditFromOverwritingConcurrentCancellation()
            throws Exception {

        Long employeeId = null;
        Long batchId = null;
        Long periodId = null;
        Long paymentId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

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

            assertNotNull(adminUsername);


            LocalDate batchMonth = LocalDate.now()
                    .withDayOfMonth(1);

            int month = batchMonth.getMonthValue();
            int year = batchMonth.getYear();


            periodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    month,
                    year,
                    batchMonth,
                    batchMonth.withDayOfMonth(batchMonth.lengthOfMonth())
            );

            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Edit Cancellation Test " + UUID.randomUUID(),
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
                    "EDITCAN-" + UUID.randomUUID().toString().substring(0, 8),
                    "Edit Cancellation Test Employee",
                    "999900005555",
                    "IT",
                    categoryId,
                    bankId,
                    batchMonth
            );

            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_period_id, payment_batch_id,
                         payment_date, status, created_by)
                    VALUES (?, ?, ?, CURRENT_DATE, 'DRAFT', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    periodId,
                    batchId,
                    adminId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_monthly_details
                        (payment_id, payment_period_id)
                    VALUES (?, ?)
                    """,
                    paymentId,
                    periodId
            );

            jdbcTemplate.update(
                    """
                    INSERT INTO payment_month_reservations
                        (employee_id, payment_period_id, payment_id, status)
                    VALUES (?, ?, ?, 'RESERVED')
                    """,
                    employeeId,
                    periodId,
                    paymentId
            );

            Long finalPaymentId = paymentId;

            PaymentUpdateRequest request = new PaymentUpdateRequest(
                    LocalDate.now(),
                    new BigDecimal("1500.00"),
                    new BigDecimal("500.00"),
                    new BigDecimal("200.00"),
                    new BigDecimal("100.00"),
                    new BigDecimal("50.00"),
                    new BigDecimal("25.00")
            );

            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            CompletableFuture<Attempt> editFuture =
                    CompletableFuture.supplyAsync(
                            () -> runOperation(
                                    () -> paymentService.updateDraftPayment(
                                            finalPaymentId,
                                            request
                                    ),
                                    adminUsername,
                                    ready,
                                    start
                            ),
                            executor
                    );

            CompletableFuture<Attempt> cancellationFuture =
                    CompletableFuture.supplyAsync(
                            () -> runCancellation(
                                    finalPaymentId,
                                    adminUsername,
                                    ready,
                                    start
                            ),
                            executor
                    );

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both requests did not become ready."
            );

            start.countDown();

            Attempt editResult = editFuture.get(30, TimeUnit.SECONDS);
            Attempt cancellationResult =
                    cancellationFuture.get(30, TimeUnit.SECONDS);

            assertTrue(
                    cancellationResult.success(),
                    "Cancellation should succeed. Failure: "
                            + cancellationResult.failure()
            );

            if (!editResult.success()) {
                assertInstanceOf(
                        IllegalStateException.class,
                        editResult.failure()
                );
            }




            String paymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    paymentId
            );

            String reservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                    """,
                    String.class,
                    paymentId
            );

            BigDecimal finalNetPayment = jdbcTemplate.queryForObject(
                    "SELECT net_payment FROM payments WHERE id = ?",
                    BigDecimal.class,
                    paymentId
            );

            assertEquals("CANCELLED", paymentStatus);
            assertEquals("RELEASED", reservationStatus);

            if (editResult.success()) {
                assertEquals(
                        0,
                        new BigDecimal("2025.00").compareTo(finalNetPayment),
                        "The successful edit should be preserved before cancellation."
                );
            } else {
                assertEquals(
                        0,
                        BigDecimal.ZERO.compareTo(finalNetPayment),
                        "A rejected edit must not change the original payment."
                );
            }

        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            if (paymentId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        paymentId
                );

                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
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

            if (periodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        periodId
                );
            }
        }
    }


    @Test
    void shouldAllowReclaimAfterDraftPaymentIsCancelled() {

        Long employeeId = null;
        Long batchId = null;
        Long periodId = null;
        Long firstPaymentId = null;
        Long secondPaymentId = null;

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

            // 2. Use the current month so employee-month validation passes.
            LocalDate paymentMonth = LocalDate.now()
                    .withDayOfMonth(1);

            int month = paymentMonth.getMonthValue();
            int year = paymentMonth.getYear();

            // 3. Create the payment period.
            periodId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_periods
                        (month, year, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    month,
                    year,
                    paymentMonth,
                    paymentMonth.withDayOfMonth(
                            paymentMonth.lengthOfMonth()
                    )
            );

            // 4. Create an OPEN batch.
            batchId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_batches
                        (batch_name, batch_month, status)
                    VALUES (?, ?, 'OPEN')
                    RETURNING id
                    """,
                    Long.class,
                    "Reclaim Test " + UUID.randomUUID(),
                    paymentMonth
            );

            // 5. Create a test employee.
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
                    "RECLAIM-" + UUID.randomUUID()
                            .toString().substring(0, 8),
                    "Payment Reclaim Test Employee",
                    "999900001111",
                    "IT",
                    categoryId,
                    bankId,
                    paymentMonth
            );

            // 6. Set the authenticated administrator.
            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            adminUsername,
                            "N/A",
                            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    )
            );

            SecurityContextHolder.setContext(context);

            // 7. Prepare the actual create-payment request.
            PaymentCreateRequest request = new PaymentCreateRequest(
                    employeeId,
                    periodId,
                    batchId,
                    LocalDate.now(),
                    new BigDecimal("1000.00"),
                    new BigDecimal("500.00"),
                    new BigDecimal("200.00"),
                    new BigDecimal("100.00"),
                    new BigDecimal("50.00"),
                    new BigDecimal("50.00")
            );

            // 8. Create the first payment.
            paymentService.createPayment(request);

            firstPaymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    batchId
            );

            assertNotNull(firstPaymentId);

            String firstPaymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    firstPaymentId
            );

            String firstReservationStatus = jdbcTemplate.queryForObject(
                    """
                    SELECT status
                    FROM payment_month_reservations
                    WHERE payment_id = ?
                    """,
                    String.class,
                    firstPaymentId
            );

            assertEquals("DRAFT", firstPaymentStatus);
            assertEquals("RESERVED", firstReservationStatus);

            // 9. Cancel the first DRAFT payment.
            paymentService.cancelDraftPayment(firstPaymentId);

            String cancelledPaymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    firstPaymentId
            );

            String releasedReservationStatus =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT status
                            FROM payment_month_reservations
                            WHERE payment_id = ?
                            """,
                            String.class,
                            firstPaymentId
                    );

            assertEquals("CANCELLED", cancelledPaymentStatus);
            assertEquals("RELEASED", releasedReservationStatus);

            // 10. Claim the SAME employee and SAME month again.
            paymentService.createPayment(request);

            secondPaymentId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM payments
                    WHERE employee_id = ?
                      AND payment_batch_id = ?
                      AND id <> ?
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    Long.class,
                    employeeId,
                    batchId,
                    firstPaymentId
            );

            assertNotNull(secondPaymentId);

            // 11. Verify the new payment and reservation.
            String secondPaymentStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payments WHERE id = ?",
                    String.class,
                    secondPaymentId
            );

            String secondReservationStatus =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT status
                            FROM payment_month_reservations
                            WHERE payment_id = ?
                            """,
                            String.class,
                            secondPaymentId
                    );

            assertEquals("DRAFT", secondPaymentStatus);
            assertEquals("RESERVED", secondReservationStatus);

            // 12. Exactly one active reservation must remain.
            Integer activeReservationCount =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)
                            FROM payment_month_reservations
                            WHERE employee_id = ?
                              AND payment_period_id = ?
                              AND status IN ('RESERVED', 'PAID')
                            """,
                            Integer.class,
                            employeeId,
                            periodId
                    );

            assertEquals(1, activeReservationCount);

        } finally {
            // Restore the previous security context.
            SecurityContextHolder.setContext(previousContext);

            // Delete only records created by this test.
            if (firstPaymentId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
                        firstPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        firstPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        firstPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        firstPaymentId
                );
            }

            if (secondPaymentId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM audit_logs
                        WHERE entity_type = 'PAYMENT'
                          AND entity_id = ?
                        """,
                        secondPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_month_reservations WHERE payment_id = ?",
                        secondPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_monthly_details WHERE payment_id = ?",
                        secondPaymentId
                );

                jdbcTemplate.update(
                        "DELETE FROM payments WHERE id = ?",
                        secondPaymentId
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

            if (periodId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_periods WHERE id = ?",
                        periodId
                );
            }
        }
    }


    private Attempt runApproval(
            Long paymentId,
            String adminUsername,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return runOperation(
                () -> paymentService.approvePayment(paymentId),
                adminUsername,
                ready,
                start
        );
    }

    private Attempt runCancellation(
            Long paymentId,
            String adminUsername,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        return runOperation(
                () -> paymentService.cancelDraftPayment(paymentId),
                adminUsername,
                ready,
                start
        );
    }

    private Attempt runOperation(
            Runnable operation,
            String adminUsername,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        ready.countDown();

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        adminUsername,
                        "N/A",
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                )
        );

        SecurityContextHolder.setContext(context);

        try {
            if (!start.await(10, TimeUnit.SECONDS)) {
                return new Attempt(
                        false,
                        new RuntimeException("Start signal timed out.")
                );
            }

            operation.run();

            return new Attempt(true, null);

        } catch (RuntimeException exception) {
            return new Attempt(false, exception);

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            return new Attempt(false, new RuntimeException(exception));

        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
