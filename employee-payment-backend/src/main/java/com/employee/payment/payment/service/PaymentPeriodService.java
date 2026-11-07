package com.employee.payment.payment.service;

import com.employee.payment.audit.service.AuditLogService;
import com.employee.payment.payment.dto.PaymentPeriodCreateRequest;
import com.employee.payment.payment.dto.PaymentPeriodResponse;
import com.employee.payment.payment.entity.PaymentPeriod;
import com.employee.payment.payment.repository.PaymentPeriodRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.employee.payment.employee.repository.EmployeeRepository;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.List;

@Service
public class PaymentPeriodService {

    private final PaymentPeriodRepository paymentPeriodRepository;
    private final AuditLogService auditLogService;
    private final EmployeeRepository employeeRepository;
    private final PaymentMonthReservationService reservationService;

    public PaymentPeriodService(
            PaymentPeriodRepository paymentPeriodRepository,
            AuditLogService auditLogService,
             EmployeeRepository employeeRepository,
                    PaymentMonthReservationService reservationService
    ) {
        this.paymentPeriodRepository = paymentPeriodRepository;
        this.auditLogService = auditLogService;
        this.employeeRepository = employeeRepository;
        this.reservationService = reservationService;
    }

    @Transactional
    public PaymentPeriodResponse createPaymentPeriod(
            PaymentPeriodCreateRequest request) {

        if (request.startDate().isAfter(request.endDate())) {
            throw new IllegalArgumentException(
                    "Start date cannot be after end date"
            );
        }

        if (paymentPeriodRepository
                .existsByMonthAndYear(request.month(), request.year())) {

            throw new IllegalArgumentException(
                    "Payment period already exists for "
                            + request.month() + "/" + request.year()
            );
        }

        PaymentPeriod paymentPeriod = new PaymentPeriod();

        paymentPeriod.setMonth(request.month());
        paymentPeriod.setYear(request.year());
        paymentPeriod.setStartDate(request.startDate());
        paymentPeriod.setEndDate(request.endDate());
        paymentPeriod.setStatus("OPEN");

        PaymentPeriod saved =
                paymentPeriodRepository.save(paymentPeriod);

        auditLogService.log(
                "CREATE",
                "PAYMENT_PERIOD",
                saved.getId(),
                "Payment period created: "
                        + String.format(
                        "%02d/%d",
                        saved.getMonth(),
                        saved.getYear()
                )
        );

        return mapToResponse(saved);
    }

    public List<PaymentPeriodResponse> getAllPaymentPeriods() {

        return paymentPeriodRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public PaymentPeriodResponse getPaymentPeriod(Long id) {

        PaymentPeriod paymentPeriod =
                paymentPeriodRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Payment period not found"
                                ));

        return mapToResponse(paymentPeriod);
    }

    private PaymentPeriodResponse mapToResponse(
            PaymentPeriod paymentPeriod) {

        return new PaymentPeriodResponse(
                paymentPeriod.getId(),
                paymentPeriod.getMonth(),
                paymentPeriod.getYear(),
                paymentPeriod.getStartDate(),
                paymentPeriod.getEndDate(),
                paymentPeriod.getStatus()
        );
    }


    @Transactional(readOnly = true)
    public List<PaymentPeriodResponse> getAvailablePeriodsForEmployee(
            Long employeeId
    ) {
        employeeRepository.findById(employeeId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Employee not found"));

        YearMonth currentMonth = YearMonth.now();

        List<PaymentPeriod> periods = paymentPeriodRepository.findAll()
                .stream()
                .filter(period -> {
                    YearMonth periodMonth = YearMonth.of(
                            period.getYear(),
                            period.getMonth()
                    );

                    return !periodMonth.isAfter(currentMonth);
                })
                .sorted(
                        Comparator.comparing(PaymentPeriod::getYear)
                                .thenComparing(PaymentPeriod::getMonth)
                                .reversed()
                )
                .toList();

        Set<Long> availableIds = reservationService
                .findAvailablePeriodIds(
                        employeeId,
                        periods.stream()
                                .map(PaymentPeriod::getId)
                                .toList()
                )
                .stream()
                .collect(Collectors.toSet());

        return periods.stream()
                .filter(period -> availableIds.contains(period.getId()))
                .map(this::mapToResponse)
                .toList();
    }
}