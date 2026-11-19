
package com.employee.payment.payment.service;

import com.employee.payment.employee.entity.Bank;
import com.employee.payment.employee.repository.BankRepository;
import com.employee.payment.payment.entity.Payment;
import com.employee.payment.payment.entity.PaymentAdvice;
import com.employee.payment.payment.entity.PaymentBatch;
import com.employee.payment.payment.repository.PaymentAdvicePaymentRepository;
import com.employee.payment.payment.repository.PaymentAdviceRepository;
import com.employee.payment.payment.repository.PaymentBatchRepository;
import com.employee.payment.payment.repository.PaymentRepository;
import com.employee.payment.employee.entity.Employee;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentAdviceFinalizationServiceTest {

    @Mock
    private PaymentAdviceRepository paymentAdviceRepository;

    @Mock
    private PaymentAdvicePaymentRepository paymentAdvicePaymentRepository;

    @Mock
    private PaymentBatchRepository paymentBatchRepository;

    @Mock
    private BankRepository bankRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentAdviceNumberService paymentAdviceNumberService;

    @InjectMocks
    private PaymentAdviceFinalizationService service;


    @Test
    void shouldFinalizeAdviceSuccessfully() {

        PaymentBatch batch = new PaymentBatch();
        batch.setId(1L);

        Bank bank = mock(Bank.class);
        when(bank.getId()).thenReturn(2L);

        Payment payment = mock(Payment.class);
        when(payment.getId()).thenReturn(101L);
        when(payment.getStatus()).thenReturn("APPROVED");
        when(payment.getPaymentBatch()).thenReturn(batch);

        Employee employee = mock(Employee.class);
        when(employee.getBank()).thenReturn(bank);

        when(payment.getEmployee()).thenReturn(employee);
        when(paymentBatchRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(batch));

        when(bankRepository.findById(2L))
                .thenReturn(Optional.of(bank));

        when(paymentAdviceRepository
                .findByPaymentBatch_IdAndBank_IdAndStatus(
                        1L, 2L, "FINALIZED"))
                .thenReturn(Optional.empty());

        when(paymentRepository.findApprovedPaymentsForAdvice(1L, 2L))
                .thenReturn(List.of(payment));

        when(paymentRepository.findPaymentsByIdsForUpdate(List.of(101L)))
                .thenReturn(List.of(payment));

        when(paymentAdvicePaymentRepository.existsInFinalizedAdvice(101L))
                .thenReturn(false);

        when(paymentAdviceNumberService.generateReferenceNo())
                .thenReturn("PA/2026/11/0001");

        when(paymentAdviceRepository.saveAndFlush(any(PaymentAdvice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PaymentAdvice result = service.finalizeAdvice(1L, 2L);

        assertNotNull(result);
        assertEquals("PA/2026/11/0001", result.getReferenceNo());
        assertEquals("FINALIZED", result.getStatus());
        assertEquals(batch, result.getPaymentBatch());
        assertEquals(bank, result.getBank());

        verify(paymentRepository)
                .findPaymentsByIdsForUpdate(List.of(101L));

        verify(paymentAdvicePaymentRepository)
                .saveAll(anyList());
    }


    @Test
    void shouldRejectDuplicateFinalizedAdvice() {

        PaymentBatch batch = new PaymentBatch();
        PaymentAdvice existingAdvice = new PaymentAdvice();

        existingAdvice.setReferenceNo("PA/2026/11/0001");

        when(paymentBatchRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(batch));

        when(bankRepository.findById(2L))
                .thenReturn(Optional.of(mock(Bank.class)));

        when(paymentAdviceRepository
                .findByPaymentBatch_IdAndBank_IdAndStatus(
                        1L, 2L, "FINALIZED"))
                .thenReturn(Optional.of(existingAdvice));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.finalizeAdvice(1L, 2L)
        );

        assertTrue(exception.getMessage().contains(
                "Payment Advice has already been finalized"));

        verify(paymentRepository, never())
                .findApprovedPaymentsForAdvice(anyLong(), anyLong());
    }


    @Test
    void shouldRejectPaymentAlreadyIncludedInAnotherFinalizedAdvice() {

        PaymentBatch batch = new PaymentBatch();
        batch.setId(1L);

        Bank bank = mock(Bank.class);
        when(bank.getId()).thenReturn(2L);

        Payment payment = mock(Payment.class);
        when(payment.getId()).thenReturn(101L);
        when(payment.getStatus()).thenReturn("APPROVED");
        when(payment.getPaymentBatch()).thenReturn(batch);

        Employee employee = mock(Employee.class);
        when(employee.getBank()).thenReturn(bank);

        when(payment.getEmployee()).thenReturn(employee);

        when(paymentBatchRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(batch));

        when(bankRepository.findById(2L))
                .thenReturn(Optional.of(bank));

        when(paymentAdviceRepository
                .findByPaymentBatch_IdAndBank_IdAndStatus(
                        1L, 2L, "FINALIZED"))
                .thenReturn(Optional.empty());

        when(paymentRepository.findApprovedPaymentsForAdvice(1L, 2L))
                .thenReturn(List.of(payment));

        when(paymentRepository.findPaymentsByIdsForUpdate(List.of(101L)))
                .thenReturn(List.of(payment));

        when(paymentAdvicePaymentRepository.existsInFinalizedAdvice(101L))
                .thenReturn(true);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.finalizeAdvice(1L, 2L)
        );

        assertTrue(exception.getMessage().contains(
                "already included in another finalized Payment Advice"));

        verify(paymentAdviceRepository, never())
                .saveAndFlush(any(PaymentAdvice.class));
    }


    @Test
    void shouldLockPaymentsBeforeCheckingDuplicateAdvice() {

        PaymentBatch batch = new PaymentBatch();
        batch.setId(1L);

        Bank bank = mock(Bank.class);
        when(bank.getId()).thenReturn(2L);

        Payment payment = mock(Payment.class);
        when(payment.getId()).thenReturn(101L);
        when(payment.getStatus()).thenReturn("APPROVED");
        when(payment.getPaymentBatch()).thenReturn(batch);

        Employee employee = mock(Employee.class);
        when(employee.getBank()).thenReturn(bank);

        when(payment.getEmployee()).thenReturn(employee);

        when(paymentBatchRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(batch));

        when(bankRepository.findById(2L))
                .thenReturn(Optional.of(bank));

        when(paymentAdviceRepository
                .findByPaymentBatch_IdAndBank_IdAndStatus(
                        1L, 2L, "FINALIZED"))
                .thenReturn(Optional.empty());

        when(paymentRepository.findApprovedPaymentsForAdvice(1L, 2L))
                .thenReturn(List.of(payment));

        when(paymentRepository.findPaymentsByIdsForUpdate(List.of(101L)))
                .thenReturn(List.of(payment));

        when(paymentAdvicePaymentRepository.existsInFinalizedAdvice(101L))
                .thenReturn(false);

        when(paymentAdviceNumberService.generateReferenceNo())
                .thenReturn("PA/2026/11/0002");

        when(paymentAdviceRepository.saveAndFlush(any(PaymentAdvice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.finalizeAdvice(1L, 2L);

        InOrder inOrder = inOrder(
                paymentRepository,
                paymentAdvicePaymentRepository
        );

        inOrder.verify(paymentRepository)
                .findPaymentsByIdsForUpdate(List.of(101L));

        inOrder.verify(paymentAdvicePaymentRepository)
                .existsInFinalizedAdvice(101L);
    }


    @Test
    void shouldCancelFinalizedAdviceSuccessfully() {

        PaymentAdvice advice = new PaymentAdvice();
        advice.setId(10L);
        advice.setStatus("FINALIZED");

        when(paymentAdviceRepository.findByIdForUpdate(10L))
                .thenReturn(Optional.of(advice));

        when(paymentAdviceRepository.save(advice))
                .thenReturn(advice);

        PaymentAdvice result = service.cancelAdvice(
                10L,
                "Incorrect payment details"
        );

        assertEquals("CANCELLED", result.getStatus());

        assertEquals(
                "Incorrect payment details",
                result.getCancellationReason()
        );

        assertNotNull(result.getCancelledAt());
        verify(paymentAdviceRepository).findByIdForUpdate(10L);

        verify(paymentAdviceRepository).save(advice);
    }


    @Test
    void shouldRejectCancellationWithoutReason() {

        assertThrows(
                IllegalArgumentException.class,
                () -> service.cancelAdvice(10L, "   ")
        );

        verify(paymentAdviceRepository, never())
                .findByIdForUpdate(anyLong());

        verify(paymentAdviceRepository, never())
                .save(any(PaymentAdvice.class));
    }
}
