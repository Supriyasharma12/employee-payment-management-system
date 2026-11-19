
package com.employee.payment.payment.service;

import com.employee.payment.employee.repository.EmployeeRepository;
import com.employee.payment.payment.entity.Payment;
import com.employee.payment.payment.entity.PaymentMonthReservation;
import com.employee.payment.payment.entity.PaymentPeriod;
import com.employee.payment.payment.repository.PaymentMonthReservationRepository;
import com.employee.payment.payment.repository.PaymentPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PaymentMonthReservationService {

    private static final List<String> ACTIVE_STATUSES =
            List.of("RESERVED", "PAID");

    public record MonthAvailability(
            Long paymentPeriodId,
            boolean available,
            String status
    ) {
    }

    private final PaymentMonthReservationRepository reservationRepository;
    private final EmployeeRepository employeeRepository;
    private final PaymentPeriodRepository paymentPeriodRepository;

    /**
     * Returns the requested months that are currently available.
     * This is a preliminary check; reserveMonths performs the
     * authoritative check when saving.
     */
    @Transactional(readOnly = true)
    public List<Long> findAvailablePeriodIds(
            Long employeeId,
            List<Long> requestedPeriodIds) {

        Set<Long> uniqueIds = new LinkedHashSet<>(requestedPeriodIds);
        List<Long> availableIds = new ArrayList<>();

        for (Long periodId : uniqueIds) {
            boolean unavailable = reservationRepository
                    .findByEmployeeIdAndPaymentPeriodIdAndStatusIn(
                            employeeId,
                            periodId,
                            ACTIVE_STATUSES)
                    .isPresent();

            if (!unavailable) {
                availableIds.add(periodId);
            }
        }

        return availableIds;
    }


    @Transactional(readOnly = true)
    public List<MonthAvailability> checkMonthAvailability(
            Long employeeId,
            List<Long> requestedPeriodIds) {

        Set<Long> uniqueIds = new LinkedHashSet<>(requestedPeriodIds);
        List<MonthAvailability> results = new ArrayList<>();

        for (Long periodId : uniqueIds) {

            List<PaymentMonthReservation> reservations =
                    reservationRepository
                            .findByEmployeeIdAndPaymentPeriodId(
                                    employeeId,
                                    periodId);

            String status = reservations.stream()
                    .filter(r -> ACTIVE_STATUSES.contains(r.getStatus()))
                    .map(PaymentMonthReservation::getStatus)
                    .findFirst()
                    .orElse("AVAILABLE");

            results.add(new MonthAvailability(
                    periodId,
                    "AVAILABLE".equals(status),
                    status));
        }

        return results;
    }


    /**
     * Reserves eligible months for a saved draft.
     * Must be called inside the payment-creation transaction.
     */
    @Transactional
    public void reserveMonths(
            Long employeeId,
            Payment payment,
            List<Long> periodIds) {

        if (periodIds == null || periodIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one eligible payment month is required.");
        }

        Set<Long> uniqueIds = new LinkedHashSet<>(periodIds);

        if (uniqueIds.size() != periodIds.size()) {
            throw new IllegalArgumentException(
                    "A payment cannot contain the same month more than once.");
        }

        var employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Employee not found: " + employeeId));

        for (Long periodId : uniqueIds) {

            if (periodId == null) {
                throw new IllegalArgumentException(
                        "Payment period ID cannot be null.");
            }

            List<PaymentMonthReservation> activeReservations =
                    reservationRepository.findActiveReservationsForUpdate(
                            employeeId,
                            periodId,
                            ACTIVE_STATUSES);

            if (!activeReservations.isEmpty()) {
                throw new IllegalStateException(
                        "Payment month " + periodId
                                + " is already reserved or paid.");
            }

            PaymentPeriod period = paymentPeriodRepository.findById(periodId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Payment period not found: " + periodId));

            PaymentMonthReservation reservation =
                    new PaymentMonthReservation();

            reservation.setEmployee(employee);
            reservation.setPaymentPeriod(period);
            reservation.setPayment(payment);
            reservation.setStatus("RESERVED");

            reservationRepository.save(reservation);
        }
    }

    /**
     * Releases reserved months when a draft is cancelled.
     */
    @Transactional
    public void releaseDraftReservations(Long paymentId) {

        List<PaymentMonthReservation> reservations =
                reservationRepository.findByPaymentIdAndStatusForUpdate(
                        paymentId, "RESERVED");

        LocalDateTime now = LocalDateTime.now();

        for (PaymentMonthReservation reservation : reservations) {
            reservation.setStatus("RELEASED");
            reservation.setReleasedAt(now);
        }

        reservationRepository.saveAll(reservations);
    }

    /**
     * Marks all reservations for a payment as PAID after approval.
     */
    @Transactional
    public void markReservationsPaid(Long paymentId) {

        List<PaymentMonthReservation> reservations =
                reservationRepository.findByPaymentIdAndStatusForUpdate(
                        paymentId, "RESERVED");

        if (reservations.isEmpty()) {
            throw new IllegalStateException(
                    "No reserved months found for payment " + paymentId);
        }

        for (PaymentMonthReservation reservation : reservations) {
            reservation.setStatus("PAID");
        }

        reservationRepository.saveAll(reservations);
    }


    @Transactional(readOnly = true)
    public List<MonthAvailability> checkMonthAvailabilityForDraft(
            Long employeeId,
            List<Long> requestedPeriodIds,
            Long paymentId) {

        Set<Long> uniqueIds = new LinkedHashSet<>(requestedPeriodIds);
        List<MonthAvailability> results = new ArrayList<>();

        for (Long periodId : uniqueIds) {
            List<PaymentMonthReservation> reservations =
                    reservationRepository.findByEmployeeIdAndPaymentPeriodId(
                            employeeId, periodId);

            // A PAID reservation always takes priority.
            boolean paid = reservations.stream()
                    .anyMatch(r -> "PAID".equalsIgnoreCase(r.getStatus()));

            if (paid) {
                results.add(new MonthAvailability(periodId, false, "PAID"));
                continue;
            }

            // A reservation owned by this draft can be edited.
            boolean reservedByThisDraft = paymentId != null
                    && reservations.stream().anyMatch(r ->
                    "RESERVED".equalsIgnoreCase(r.getStatus())
                            && r.getPayment() != null
                            && paymentId.equals(r.getPayment().getId()));

            if (reservedByThisDraft) {
                results.add(new MonthAvailability(periodId, true, "RESERVED"));
                continue;
            }

            // A different draft's reservation remains unavailable.
            boolean reservedByAnotherDraft = reservations.stream()
                    .anyMatch(r -> "RESERVED".equalsIgnoreCase(r.getStatus()));

            if (reservedByAnotherDraft) {
                results.add(new MonthAvailability(periodId, false, "RESERVED"));
            } else {
                results.add(new MonthAvailability(periodId, true, "AVAILABLE"));
            }
        }

        return results;
    }

}
