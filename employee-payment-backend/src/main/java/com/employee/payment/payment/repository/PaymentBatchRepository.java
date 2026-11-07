package com.employee.payment.payment.repository;

import com.employee.payment.payment.entity.PaymentBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.time.LocalDate;
import java.util.List;

public interface PaymentBatchRepository
        extends JpaRepository<PaymentBatch, Long> {

    List<PaymentBatch> findAllByOrderByCreatedAtDesc();

    List<PaymentBatch> findByStatusOrderByCreatedAtDesc(String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM PaymentBatch b WHERE b.id = :batchId")
    Optional<PaymentBatch> findByIdForUpdate(
            @Param("batchId") Long batchId
    );

    Optional<PaymentBatch> findByBatchMonth(LocalDate batchMonth);

    boolean existsByBatchMonth(LocalDate batchMonth);
}