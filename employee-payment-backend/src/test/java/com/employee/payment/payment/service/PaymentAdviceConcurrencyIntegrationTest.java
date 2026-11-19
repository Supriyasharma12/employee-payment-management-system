
package com.employee.payment.payment.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import com.employee.payment.payment.entity.PaymentAdvice;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class PaymentAdviceConcurrencyIntegrationTest {

    @Autowired
    private PaymentAdviceFinalizationService finalizationService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    record Attempt(boolean success, RuntimeException failure) {}

    @Test
    void shouldAllowOnlyOneConcurrentFinalizationForSameBatch()
            throws Exception {

        Long batchId = null;
        Long employeeId = null;
        Long paymentId = null;
        Long bankId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            // 1. Find existing master records in the test database.
            bankId = jdbcTemplate.queryForObject(
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

            // 2. Create a test employee.
            String employeeCode = "CONC-" +
                    UUID.randomUUID().toString().substring(0, 8);

            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         category_id, bank_id, active)
                    VALUES (?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    employeeCode,
                    "Concurrency Test Employee",
                    "999900001111",
                    categoryId,
                    bankId
            );

            // 3. Create a unique test batch.
            LocalDate batchMonth = LocalDate.of(
                    2099,
                    1 + (int) (Math.random() * 12),
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
                    "Concurrency Test Batch " + UUID.randomUUID(),
                    batchMonth
            );

            // 4. Create one approved payment.
            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_batch_id, payment_date,
                         status, created_by)
                    VALUES (?, ?, CURRENT_DATE, 'APPROVED', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    batchId,
                    adminId
            );

            assertNotNull(batchId);
            assertNotNull(employeeId);
            assertNotNull(paymentId);

            // 5. Start two requests at almost exactly the same time.
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            Long finalBatchId = batchId;
            Long finalBankId = bankId;

            CompletableFuture<Attempt> first =
                    CompletableFuture.supplyAsync(
                            () -> runAttempt(
                                    finalBatchId,
                                    finalBankId,
                                    ready,
                                    start
                            ),
                            executor
                    );

            CompletableFuture<Attempt> second =
                    CompletableFuture.supplyAsync(
                            () -> runAttempt(
                                    finalBatchId,
                                    finalBankId,
                                    ready,
                                    start
                            ),
                            executor
                    );

            assertTrue(
                    ready.await(10, TimeUnit.SECONDS),
                    "Both requests did not become ready in time."
            );

            start.countDown();

            Attempt firstResult = first.get(30, TimeUnit.SECONDS);
            Attempt secondResult = second.get(30, TimeUnit.SECONDS);

            // 6. Exactly one request must succeed.
            int successfulRequests =
                    (firstResult.success() ? 1 : 0)
                            + (secondResult.success() ? 1 : 0);

            assertEquals(
                    1,
                    successfulRequests,
                    "Exactly one concurrent finalization should succeed."
            );

            // The other request must be rejected as a duplicate.
            Attempt failedAttempt =
                    firstResult.success() ? secondResult : firstResult;

            assertNotNull(failedAttempt.failure());
            assertInstanceOf(
                    IllegalStateException.class,
                    failedAttempt.failure()
            );

            // 7. Verify the database contains exactly one finalized advice.
            Integer finalizedAdviceCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice
                    WHERE payment_batch_id = ?
                      AND bank_id = ?
                      AND status = 'FINALIZED'
                    """,
                    Integer.class,
                    batchId,
                    bankId
            );

            assertEquals(1, finalizedAdviceCount);

            // 8. Verify the payment is linked exactly once.
            Integer paymentLinkCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice_payments ap
                    JOIN payment_advice pa
                      ON pa.id = ap.payment_advice_id
                    WHERE pa.payment_batch_id = ?
                      AND pa.bank_id = ?
                      AND ap.payment_id = ?
                    """,
                    Integer.class,
                    batchId,
                    bankId,
                    paymentId
            );

            assertEquals(1, paymentLinkCount);

        } finally {
            executor.shutdownNow();

            // 9. Clean up only the records created by this test.
            if (batchId != null) {
                jdbcTemplate.update(
                        """
                        DELETE FROM payment_advice_payments
                        WHERE payment_advice_id IN (
                            SELECT id FROM payment_advice
                            WHERE payment_batch_id = ?
                        )
                        """,
                        batchId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_advice WHERE payment_batch_id = ?",
                        batchId
                );
            }

            if (paymentId != null) {
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
        }
    }


    @Test
    void shouldAllowRefinalizationAfterAdviceCancellation() {

        Long batchId = null;
        Long employeeId = null;
        Long paymentId = null;
        Long firstAdviceId = null;
        Long secondAdviceId = null;

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

            // 2. Create a test employee.
            String employeeCode = "LIFE-" +
                    UUID.randomUUID().toString().substring(0, 8);

            employeeId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO employees
                        (employee_code, name, account_number,
                         category_id, bank_id, active)
                    VALUES (?, ?, ?, ?, ?, true)
                    RETURNING id
                    """,
                    Long.class,
                    employeeCode,
                    "Advice Lifecycle Test Employee",
                    "999900002222",
                    categoryId,
                    bankId
            );

            // 3. Create a unique batch.
            LocalDate batchMonth = LocalDate.of(
                    2097,
                    1 + (int) (Math.random() * 12),
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
                    "Lifecycle Test Batch " + UUID.randomUUID(),
                    batchMonth
            );

            // 4. Create one approved payment.
            paymentId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payments
                        (employee_id, payment_batch_id, payment_date,
                         status, created_by)
                    VALUES (?, ?, CURRENT_DATE, 'APPROVED', ?)
                    RETURNING id
                    """,
                    Long.class,
                    employeeId,
                    batchId,
                    adminId
            );

            assertNotNull(paymentId);

            // 5. Finalize the first advice.
            PaymentAdvice firstAdvice =
                    finalizationService.finalizeAdvice(batchId, bankId);

            firstAdviceId = firstAdvice.getId();

            assertNotNull(firstAdviceId);
            assertEquals("FINALIZED", firstAdvice.getStatus());

            String firstReference = firstAdvice.getReferenceNo();

            // Verify the payment is linked to the first advice.
            Integer firstLinkCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice_payments
                    WHERE payment_advice_id = ?
                      AND payment_id = ?
                    """,
                    Integer.class,
                    firstAdviceId,
                    paymentId
            );

            assertEquals(1, firstLinkCount);

            // 6. Cancel the first advice.
            finalizationService.cancelAdvice(
                    firstAdviceId,
                    "Testing advice cancellation and re-finalization"
            );

            String oldStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payment_advice WHERE id = ?",
                    String.class,
                    firstAdviceId
            );

            assertEquals("CANCELLED", oldStatus);

            // 7. Verify cancellation did not delete the original payment link.
            Integer retainedLinkCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice_payments
                    WHERE payment_advice_id = ?
                      AND payment_id = ?
                    """,
                    Integer.class,
                    firstAdviceId,
                    paymentId
            );

            assertEquals(1, retainedLinkCount);

            // 8. Finalize the same batch and bank again.
            PaymentAdvice secondAdvice =
                    finalizationService.finalizeAdvice(batchId, bankId);

            secondAdviceId = secondAdvice.getId();

            assertNotNull(secondAdviceId);
            assertEquals("FINALIZED", secondAdvice.getStatus());

            // 9. The new advice must have a different reference.
            assertNotEquals(
                    firstReference,
                    secondAdvice.getReferenceNo()
            );

            // 10. Verify the old advice remains cancelled.
            String finalOldStatus = jdbcTemplate.queryForObject(
                    "SELECT status FROM payment_advice WHERE id = ?",
                    String.class,
                    firstAdviceId
            );

            assertEquals("CANCELLED", finalOldStatus);

            // 11. Verify exactly one active advice exists.
            Integer activeAdviceCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice
                    WHERE payment_batch_id = ?
                      AND bank_id = ?
                      AND status = 'FINALIZED'
                    """,
                    Integer.class,
                    batchId,
                    bankId
            );

            assertEquals(1, activeAdviceCount);

            // 12. Verify both historical advice records retain the payment.
            Integer totalLinkCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice_payments
                    WHERE payment_id = ?
                    """,
                    Integer.class,
                    paymentId
            );

            assertEquals(2, totalLinkCount);

            // 13. Verify the new advice contains the payment exactly once.
            Integer secondLinkCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice_payments
                    WHERE payment_advice_id = ?
                      AND payment_id = ?
                    """,
                    Integer.class,
                    secondAdviceId,
                    paymentId
            );

            assertEquals(1, secondLinkCount);

        } finally {

            // Clean up only records created by this test.
            if (batchId != null) {

                jdbcTemplate.update(
                        """
                        DELETE FROM payment_advice_payments
                        WHERE payment_advice_id IN (
                            SELECT id FROM payment_advice
                            WHERE payment_batch_id = ?
                        )
                        """,
                        batchId
                );

                jdbcTemplate.update(
                        "DELETE FROM payment_advice WHERE payment_batch_id = ?",
                        batchId
                );
            }

            if (paymentId != null) {
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
        }
    }


    private Attempt runAttempt(
            Long batchId,
            Long bankId,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        ready.countDown();

        try {
            if (!start.await(10, TimeUnit.SECONDS)) {
                return new Attempt(
                        false,
                        new RuntimeException("Start signal timed out.")
                );
            }

            finalizationService.finalizeAdvice(batchId, bankId);

            return new Attempt(true, null);

        } catch (RuntimeException exception) {
            return new Attempt(false, exception);

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            return new Attempt(
                    false,
                    new RuntimeException(exception)
            );
        }
    }
}
