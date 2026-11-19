
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

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class PaymentAdviceCancellationConcurrencyIntegrationTest {

    @Autowired
    private PaymentAdviceFinalizationService finalizationService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    record Attempt(boolean success, RuntimeException failure) {}

    @Test
    void shouldAllowOnlyOneConcurrentCancellation()
            throws Exception {

        Long batchId = null;
        Long adviceId = null;

        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            // 1. Find an existing bank.
            Long bankId = jdbcTemplate.queryForObject(
                    "SELECT id FROM banks WHERE active = true ORDER BY id LIMIT 1",
                    Long.class
            );

            assertNotNull(bankId);

            // 2. Create a unique test batch.
            LocalDate batchMonth = LocalDate.of(
                    2098,
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
                    "Cancellation Concurrency Test " + UUID.randomUUID(),
                    batchMonth
            );

            // 3. Create a finalized advice.
            String referenceNo = "CANCEL-" +
                    UUID.randomUUID().toString().substring(0, 8);

            adviceId = jdbcTemplate.queryForObject(
                    """
                    INSERT INTO payment_advice
                        (reference_no, payment_batch_id, bank_id,
                         advice_date, status)
                    VALUES (?, ?, ?, CURRENT_DATE, 'FINALIZED')
                    RETURNING id
                    """,
                    Long.class,
                    referenceNo,
                    batchId,
                    bankId
            );

            assertNotNull(adviceId);

            // 4. Start two cancellation requests simultaneously.
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch start = new CountDownLatch(1);

            Long finalAdviceId = adviceId;

            CompletableFuture<Attempt> first =
                    CompletableFuture.supplyAsync(
                            () -> runCancellation(
                                    finalAdviceId,
                                    "Concurrent cancellation request A",
                                    ready,
                                    start
                            ),
                            executor
                    );

            CompletableFuture<Attempt> second =
                    CompletableFuture.supplyAsync(
                            () -> runCancellation(
                                    finalAdviceId,
                                    "Concurrent cancellation request B",
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

            // 5. Exactly one cancellation must succeed.
            int successfulCancellations =
                    (firstResult.success() ? 1 : 0)
                            + (secondResult.success() ? 1 : 0);

            assertEquals(
                    1,
                    successfulCancellations,
                    "Exactly one cancellation should succeed."
            );

            Attempt failedAttempt =
                    firstResult.success() ? secondResult : firstResult;

            assertNotNull(failedAttempt.failure());

            assertInstanceOf(
                    IllegalStateException.class,
                    failedAttempt.failure()
            );

            // 6. Verify final database state.
            Integer cancelledCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice
                    WHERE id = ?
                      AND status = 'CANCELLED'
                    """,
                    Integer.class,
                    adviceId
            );

            assertEquals(1, cancelledCount);

            // 7. Verify cancellation reason is retained.
            String savedReason = jdbcTemplate.queryForObject(
                    """
                    SELECT cancellation_reason
                    FROM payment_advice
                    WHERE id = ?
                    """,
                    String.class,
                    adviceId
            );

            assertTrue(
                    savedReason.equals("Concurrent cancellation request A")
                            || savedReason.equals("Concurrent cancellation request B"),
                    "One of the two cancellation reasons must be retained."
            );

            // 8. Verify cancellation timestamp exists.
            Integer timestampCount = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM payment_advice
                    WHERE id = ?
                      AND cancelled_at IS NOT NULL
                    """,
                    Integer.class,
                    adviceId
            );

            assertEquals(1, timestampCount);

        } finally {
            executor.shutdownNow();

            // 9. Remove only the test advice and batch.
            if (adviceId != null) {
                jdbcTemplate.update(
                        "DELETE FROM payment_advice WHERE id = ?",
                        adviceId
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

    private Attempt runCancellation(
            Long adviceId,
            String reason,
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

            finalizationService.cancelAdvice(adviceId, reason);

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
