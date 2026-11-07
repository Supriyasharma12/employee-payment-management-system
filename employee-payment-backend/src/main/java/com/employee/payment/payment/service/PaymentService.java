package com.employee.payment.payment.service;
import com.employee.payment.admin.entity.Admin;
import com.employee.payment.admin.repository.AdminRepository;
import com.employee.payment.audit.service.AuditLogService;
import com.employee.payment.employee.entity.Employee;
import com.employee.payment.employee.repository.EmployeeRepository;
import com.employee.payment.payment.dto.PaymentAdviceResponse;
import com.employee.payment.payment.dto.PaymentCalculationRequest;
import com.employee.payment.payment.dto.PaymentCalculationResponse;
import com.employee.payment.payment.dto.PaymentCreateRequest;
import com.employee.payment.payment.dto.PaymentResponse;
import com.employee.payment.payment.dto.PaymentSummaryResponse;
import com.employee.payment.payment.dto.PaymentUpdateRequest;
import com.employee.payment.payment.entity.Payment;
import com.employee.payment.payment.entity.PaymentPeriod;
import com.employee.payment.payment.repository.PaymentPeriodRepository;
import com.employee.payment.payment.repository.PaymentRepository;
import com.employee.payment.payment.specification.PaymentSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.employee.payment.payment.dto.MultiMonthPaymentCreateRequest;
import com.employee.payment.payment.dto.MultiMonthPaymentCreateResponse;
import com.employee.payment.payment.dto.PaymentMonthlyDetailRequest;
import com.employee.payment.payment.entity.PaymentMonthlyDetail;
import com.employee.payment.payment.repository.PaymentMonthlyDetailRepository;
import com.employee.payment.payment.repository.PaymentMonthReservationRepository;
import com.employee.payment.payment.entity.PaymentMonthReservation;
import com.employee.payment.payment.dto.MonthlyPaymentSummaryResponse;
import org.springframework.data.domain.PageImpl;
import com.employee.payment.payment.dto.PaymentMonthlyDetailResponse;
import com.employee.payment.payment.entity.PaymentBatch;
import com.employee.payment.payment.service.PaymentBatchService;
import org.springframework.data.domain.Sort;
import java.util.Comparator;
import java.util.List;
import com.employee.payment.payment.dto.EligiblePaymentPeriodResponse;
import com.employee.payment.payment.dto.MultiMonthPaymentUpdateRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.Objects;
import java.util.Map;
import java.util.HashMap;
import java.time.YearMonth;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;


@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;
    private final PaymentPeriodRepository paymentPeriodRepository;
    private final PaymentCalculationService calculationService;
    private final AuditLogService auditLogService;
    private final AdminRepository adminRepository;
    private final PaymentMonthlyDetailRepository monthlyDetailRepository;
    private final PaymentMonthlyDetailService monthlyDetailService;
    private final PaymentMonthReservationService reservationService;
    private final PaymentMonthReservationRepository reservationRepository;
    private final PaymentBatchService paymentBatchService;

    public PaymentService(
            PaymentRepository paymentRepository,
            EmployeeRepository employeeRepository,
            PaymentPeriodRepository paymentPeriodRepository,
            PaymentCalculationService calculationService,
            AuditLogService auditLogService,
            AdminRepository adminRepository,
            PaymentMonthlyDetailRepository monthlyDetailRepository,
            PaymentMonthlyDetailService monthlyDetailService,
            PaymentMonthReservationService reservationService,
            PaymentMonthReservationRepository reservationRepository,
            PaymentBatchService paymentBatchService
    ) {
        this.paymentRepository = paymentRepository;
        this.employeeRepository = employeeRepository;
        this.paymentPeriodRepository = paymentPeriodRepository;
        this.calculationService = calculationService;
        this.auditLogService = auditLogService;
        this.adminRepository = adminRepository;
        this.monthlyDetailRepository = monthlyDetailRepository;
        this.monthlyDetailService = monthlyDetailService;
        this.reservationService = reservationService;
        this.reservationRepository = reservationRepository;
        this.paymentBatchService = paymentBatchService;
    }

    // ============================================================
    // CREATE PAYMENT
    // ============================================================

    @Transactional
    public PaymentResponse createPayment(
            PaymentCreateRequest request
    ) {

        Employee employee =
                employeeRepository.findById(request.employeeId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Employee not found"
                                )
                        );

        PaymentPeriod paymentPeriod =
                paymentPeriodRepository.findById(
                                request.paymentPeriodId()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Payment period not found"
                                )
                        );
        validateEmployeePaymentMonth(employee, paymentPeriod);

        if (paymentRepository
                .existsByEmployeeIdAndPaymentPeriodId(
                        request.employeeId(),
                        request.paymentPeriodId()
                )) {

            throw new IllegalArgumentException(
                    "Payment already exists for this employee and payment period"
            );
        }

        PaymentCalculationResponse calculation =
                calculatePayment(
                        request.runningTa(),
                        request.fixedTa(),
                        request.other(),
                        request.miscellaneous(),
                        request.advanceTa(),
                        request.advanceOther()
                );

        validateNetPayment(calculation.netPayment());

        PaymentBatch paymentBatch =
                paymentBatchService.getOpenBatchForPayment(
                        request.paymentBatchId()
                );

        Admin currentAdmin = getCurrentAdmin();

        Payment payment = new Payment();

        payment.setEmployee(employee);
        payment.setPaymentPeriod(paymentPeriod);
        payment.setPaymentBatch(paymentBatch);
        payment.setPaymentDate(request.paymentDate());

        payment.setRunningTa(calculation.runningTa());
        payment.setFixedTa(calculation.fixedTa());
        payment.setOther(calculation.other());
        payment.setGrossTotal(calculation.grossTotal());

        payment.setMiscellaneous(calculation.miscellaneous());
        payment.setAdvanceTa(calculation.advanceTa());
        payment.setAdvanceOther(calculation.advanceOther());
        payment.setDeductionTotal(calculation.deductionTotal());

        payment.setNetPayment(calculation.netPayment());

        // New payment always starts as DRAFT.
        payment.setStatus("DRAFT");

        payment.setCreatedBy(currentAdmin);
        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment =
                paymentRepository.saveAndFlush(payment);

// Create the monthly detail for this V1 single-month payment.
        PaymentMonthlyDetailRequest detailRequest =
                new PaymentMonthlyDetailRequest(
                        request.paymentPeriodId(),
                        request.runningTa(),
                        request.fixedTa(),
                        request.other(),
                        request.miscellaneous(),
                        request.advanceTa(),
                        request.advanceOther()
                );

        PaymentMonthlyDetail monthlyDetail =
                monthlyDetailService.buildMonthlyDetail(
                        savedPayment,
                        detailRequest
                );

        monthlyDetailRepository.saveAndFlush(monthlyDetail);

// Reserve this employee-month for the draft.
        reservationService.reserveMonths(
                request.employeeId(),
                savedPayment,
                List.of(request.paymentPeriodId())
        );

        auditLogService.log(
                "CREATE",
                "PAYMENT",
                savedPayment.getId(),
                "Payment created for employee "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
                        + " for payment period "
                        + formatPeriod(paymentPeriod)
                        + " with net payment "
                        + savedPayment.getNetPayment()
        );

        return mapToResponse(savedPayment);
    }


    @Transactional
    public MultiMonthPaymentCreateResponse createMultiMonthPayment(
            MultiMonthPaymentCreateRequest request) {

        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Employee not found"));


        PaymentBatch paymentBatch =
                paymentBatchService.getOpenBatchForPayment(
                        request.paymentBatchId()
                );


        boolean draftAlreadyExists =
                paymentRepository
                        .existsByEmployeeIdAndPaymentBatchIdAndPaymentPeriodIsNullAndStatusIgnoreCase(
                                request.employeeId(),
                                paymentBatch.getId(),
                                "DRAFT"
                        );

        if (draftAlreadyExists) {
            throw new IllegalStateException(
                    "A draft payment already exists for this employee in the selected batch. "
                            + "Please open the existing draft instead of creating another one."
            );
        }

        Admin currentAdmin = getCurrentAdmin();


        if (request.monthlyDetails() == null ||
                request.monthlyDetails().isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one payment month must be selected."
            );
        }

        List<PaymentMonthlyDetailRequest> requestedDetails =
                request.monthlyDetails();

        Set<Long> requestedPeriodIds = new HashSet<>();

        for (PaymentMonthlyDetailRequest detail : requestedDetails) {
            if (!requestedPeriodIds.add(detail.paymentPeriodId())) {
                throw new IllegalArgumentException(
                        "A payment cannot contain the same month more than once.");
            }
        }

        for (PaymentMonthlyDetailRequest detail : request.monthlyDetails()) {
            PaymentPeriod period = paymentPeriodRepository
                    .findById(detail.paymentPeriodId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Payment period not found: "
                                    + detail.paymentPeriodId()
                    ));

            validateEmployeePaymentMonth(employee, period);
        }

        List<PaymentMonthReservationService.MonthAvailability> availability =
                reservationService.checkMonthAvailability(
                        request.employeeId(),
                        requestedDetails.stream()
                                .map(PaymentMonthlyDetailRequest::paymentPeriodId)
                                .toList());


// Every requested month must be available.
// If any month is unavailable, reject the complete request.
        List<String> unavailableMonths = new ArrayList<>();

        Map<Long, PaymentMonthReservationService.MonthAvailability> availabilityByPeriodId =
                availability.stream().collect(Collectors.toMap(
                        PaymentMonthReservationService.MonthAvailability::paymentPeriodId,
                        item -> item
                ));

        for (PaymentMonthlyDetailRequest detailRequest : requestedDetails) {
            PaymentMonthReservationService.MonthAvailability item =
                    availabilityByPeriodId.get(detailRequest.paymentPeriodId());

            if (item == null) {
                throw new IllegalStateException(
                        "Availability not found for payment period: "
                                + detailRequest.paymentPeriodId()
                );
            }

            if (!item.available()) {
                PaymentPeriod period = paymentPeriodRepository
                        .findById(detailRequest.paymentPeriodId())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Payment period not found: "
                                        + detailRequest.paymentPeriodId()
                        ));

                String reason = "PAID".equalsIgnoreCase(item.status())
                        ? "This month has already been paid."
                        : "This month is reserved by another draft.";

                unavailableMonths.add(
                        String.format("%02d/%d: %s",
                                period.getMonth(),
                                period.getYear(),
                                reason)
                );
            }
        }

        if (!unavailableMonths.isEmpty()) {
            throw new IllegalStateException(
                    "Payment cannot be created because one or more selected "
                            + "months are unavailable. "
                            + String.join("; ", unavailableMonths)
            );
        }

// All requested months are available, so include every requested month.
        List<PaymentMonthlyDetailRequest> includedRequests = requestedDetails;
        List<String> warnings = new ArrayList<>();

        List<MultiMonthPaymentCreateResponse.MonthlyPaymentResult> results =
                new ArrayList<>();


        Payment payment = new Payment();
        payment.setEmployee(employee);
        payment.setPaymentPeriod(null);
        payment.setPaymentBatch(paymentBatch);
        payment.setPaymentDate(request.paymentDate());
        payment.setStatus("DRAFT");
        payment.setCreatedBy(currentAdmin);
        payment.setUpdatedBy(currentAdmin);

        // Save the parent first to obtain its ID.
        Payment savedPayment = paymentRepository.saveAndFlush(payment);

        List<PaymentMonthlyDetail> monthlyDetails = new ArrayList<>();

        for (PaymentMonthlyDetailRequest detailRequest : includedRequests) {
            PaymentMonthlyDetail detail =
                    monthlyDetailService.buildMonthlyDetail(
                            savedPayment, detailRequest);

            monthlyDetails.add(detail);
        }

        monthlyDetailRepository.saveAllAndFlush(monthlyDetails);

        BigDecimal runningTa = BigDecimal.ZERO;
        BigDecimal fixedTa = BigDecimal.ZERO;
        BigDecimal other = BigDecimal.ZERO;
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal miscellaneous = BigDecimal.ZERO;
        BigDecimal advanceTa = BigDecimal.ZERO;
        BigDecimal
                advanceOther = BigDecimal.ZERO;
        BigDecimal deductions = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        for (PaymentMonthlyDetail detail : monthlyDetails) {
            runningTa = runningTa.add(detail.getRunningTa());
            fixedTa = fixedTa.add(detail.getFixedTa());
            other = other.add(detail.getOther());
            gross = gross.add(detail.getGrossTotal());
            miscellaneous = miscellaneous.add(detail.getMiscellaneous());
            advanceTa = advanceTa.add(detail.getAdvanceTa());
            advanceOther = advanceOther.add(detail.getAdvanceOther());
            deductions = deductions.add(detail.getDeductionTotal());
            net = net.add(detail.getNetPayment());

            PaymentPeriod period = detail.getPaymentPeriod();

            results.add(
                    new MultiMonthPaymentCreateResponse.MonthlyPaymentResult(
                            period.getId(),
                            period.getMonth(),
                            period.getYear(),
                            "INCLUDED",
                            "Month included in draft payment.",
                            detail.getNetPayment()));
        }

        validateNetPayment(net);

        savedPayment.setRunningTa(runningTa);
        savedPayment.setFixedTa(fixedTa);
        savedPayment.setOther(other);
        savedPayment.setGrossTotal(gross);
        savedPayment.setMiscellaneous(miscellaneous);
        savedPayment.setAdvanceTa(advanceTa);
        savedPayment.setAdvanceOther(advanceOther);
        savedPayment.setDeductionTotal(deductions);
        savedPayment.setNetPayment(net);
        savedPayment.setUpdatedBy(currentAdmin);

        savedPayment = paymentRepository.saveAndFlush(savedPayment);

        // The database unique index protects against concurrent claims.
        // A conflict must roll back the complete transaction.
        reservationService.reserveMonths(
                request.employeeId(),
                savedPayment,
                includedRequests.stream()
                        .map(PaymentMonthlyDetailRequest::paymentPeriodId)
                        .toList());

        auditLogService.log(
                "CREATE",
                "PAYMENT",
                savedPayment.getId(),
                "Multi-month draft created for employee "
                        + employee.getEmployeeCode()
                        + " with included periods "
                        + includedRequests.stream()
                        .map(d -> String.valueOf(d.paymentPeriodId()))
                        .toList()
                        + ", excluded periods "
                        + warnings
                        + ", combined net payment "
                        + savedPayment.getNetPayment());

        PaymentPeriod firstPeriod =
                monthlyDetails.getFirst().getPaymentPeriod();

        PaymentResponse response = new PaymentResponse(
                savedPayment.getId(),
                savedPayment.getPaymentBatch() != null
                        ? savedPayment.getPaymentBatch().getId()
                        : null,
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getName(),
                firstPeriod.getId(),
                firstPeriod.getMonth(),
                firstPeriod.getYear(),
                savedPayment.getPaymentDate(),
                savedPayment.getRunningTa(),
                savedPayment.getFixedTa(),
                savedPayment.getOther(),
                savedPayment.getGrossTotal(),
                savedPayment.getMiscellaneous(),
                savedPayment.getAdvanceTa(),
                savedPayment.getAdvanceOther(),
                savedPayment.getDeductionTotal(),
                savedPayment.getNetPayment(),
                savedPayment.getStatus(),
                savedPayment.getCreatedAt(),
                savedPayment.getUpdatedAt(),
                monthlyDetails.stream()
                        .sorted(Comparator.comparing(
                                (PaymentMonthlyDetail detail) ->
                                        detail.getPaymentPeriod().getYear()
                        ).thenComparing(
                                detail -> detail.getPaymentPeriod().getMonth()
                        ))
                        .map(detail -> new PaymentMonthlyDetailResponse(
                                detail.getId(),
                                detail.getPaymentPeriod().getId(),
                                detail.getPaymentPeriod().getMonth(),
                                detail.getPaymentPeriod().getYear(),
                                detail.getRunningTa(),
                                detail.getFixedTa(),
                                detail.getOther(),
                                detail.getGrossTotal(),
                                detail.getMiscellaneous(),
                                detail.getAdvanceTa(),
                                detail.getAdvanceOther(),
                                detail.getDeductionTotal(),
                                detail.getNetPayment()
                        ))
                        .toList()
        );

        return new MultiMonthPaymentCreateResponse(
                response,
                results,
                warnings);
    }


    // ============================================================
    // UPDATE EXISTING MULTI-MONTH DRAFT
    // ============================================================

    @Transactional
    public MultiMonthPaymentCreateResponse updateMultiMonthPayment(
            Long paymentId,
            MultiMonthPaymentUpdateRequest request
    ) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found with id: " + paymentId));

        if (!"DRAFT".equalsIgnoreCase(payment.getStatus())) {
            throw new IllegalStateException(
                    "Only DRAFT payments can be edited.");
        }

        paymentBatchService.validatePaymentBatchIsOpen(
                payment.getPaymentBatch()
        );

        if (payment.getPaymentPeriod() != null) {
            throw new IllegalArgumentException(
                    "This endpoint is only for multi-month payments.");
        }

        Employee employee = payment.getEmployee();
        Admin currentAdmin = getCurrentAdmin();

        if (request.monthlyDetails() == null ||
                request.monthlyDetails().isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one payment month must be selected."
            );
        }

        for (PaymentMonthlyDetailRequest detail : request.monthlyDetails()) {
            PaymentPeriod period = paymentPeriodRepository
                    .findById(detail.paymentPeriodId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Payment period not found: "
                                    + detail.paymentPeriodId()
                    ));

            validateEmployeePaymentMonth(employee, period);
        }

        List<PaymentMonthlyDetailRequest> requestedDetails =
                request.monthlyDetails();

        Set<Long> requestedPeriodIds = new HashSet<>();

        for (PaymentMonthlyDetailRequest detail : requestedDetails) {
            if (!requestedPeriodIds.add(detail.paymentPeriodId())) {
                throw new IllegalArgumentException(
                        "A payment cannot contain the same month more than once.");
            }
        }

        List<PaymentMonthlyDetail> existingDetails =
                monthlyDetailRepository.findByPaymentId(paymentId);

        if (existingDetails.isEmpty()) {
            throw new IllegalStateException(
                    "No monthly details were found for this payment.");
        }

        Set<Long> existingPeriodIds = new HashSet<>();

        for (PaymentMonthlyDetail detail : existingDetails) {
            existingPeriodIds.add(detail.getPaymentPeriod().getId());
        }

        Set<Long> addedPeriodIds = new HashSet<>(requestedPeriodIds);
        addedPeriodIds.removeAll(existingPeriodIds);

        Set<Long> removedPeriodIds = new HashSet<>(existingPeriodIds);
        removedPeriodIds.removeAll(requestedPeriodIds);

        // Check only newly added months. Existing months are already
        // reserved by this payment and must not conflict with themselves.
        if (!addedPeriodIds.isEmpty()) {
            List<PaymentMonthReservationService.MonthAvailability>
                    availability = reservationService.checkMonthAvailability(
                    employee.getId(),
                    new ArrayList<>(addedPeriodIds));

            for (PaymentMonthReservationService.MonthAvailability item
                    : availability) {
                if (!item.available()) {
                    throw new IllegalStateException(
                            "Cannot add payment period "
                                    + item.paymentPeriodId()
                                    + ": it is already "
                                    + item.status() + ".");
                }
            }
        }

        Map<Long, PaymentMonthlyDetail> existingByPeriodId =
                new HashMap<Long, PaymentMonthlyDetail>();

        for (PaymentMonthlyDetail detail : existingDetails) {
            existingByPeriodId.put(
                    detail.getPaymentPeriod().getId(), detail);
        }

        List<PaymentMonthlyDetail> updatedDetails = new ArrayList<>();

        BigDecimal runningTa = BigDecimal.ZERO;
        BigDecimal fixedTa = BigDecimal.ZERO;
        BigDecimal other = BigDecimal.ZERO;
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal miscellaneous = BigDecimal.ZERO;
        BigDecimal advanceTa = BigDecimal.ZERO;
        BigDecimal advanceOther = BigDecimal.ZERO;
        BigDecimal deductions = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        List<MultiMonthPaymentCreateResponse.MonthlyPaymentResult>
                results = new ArrayList<>();

        // Update existing detail rows and create rows for newly added months.
        for (PaymentMonthlyDetailRequest detailRequest : requestedDetails) {
            PaymentMonthlyDetail detail =
                    existingByPeriodId.get(detailRequest.paymentPeriodId());

            if (detail == null) {
                detail = monthlyDetailService.buildMonthlyDetail(
                        payment, detailRequest);
            } else {
                PaymentCalculationResponse calculation = calculatePayment(
                        detailRequest.runningTa(),
                        detailRequest.fixedTa(),
                        detailRequest.other(),
                        detailRequest.miscellaneous(),
                        detailRequest.advanceTa(),
                        detailRequest.advanceOther());

                validateNetPayment(calculation.netPayment());

                detail.setRunningTa(calculation.runningTa());
                detail.setFixedTa(calculation.fixedTa());
                detail.setOther(calculation.other());
                detail.setGrossTotal(calculation.grossTotal());
                detail.setMiscellaneous(calculation.miscellaneous());
                detail.setAdvanceTa(calculation.advanceTa());
                detail.setAdvanceOther(calculation.advanceOther());
                detail.setDeductionTotal(calculation.deductionTotal());
                detail.setNetPayment(calculation.netPayment());
            }

            validateNetPayment(detail.getNetPayment());
            updatedDetails.add(detail);

            runningTa = runningTa.add(detail.getRunningTa());
            fixedTa = fixedTa.add(detail.getFixedTa());
            other = other.add(detail.getOther());
            gross = gross.add(detail.getGrossTotal());
            miscellaneous = miscellaneous.add(detail.getMiscellaneous());
            advanceTa = advanceTa.add(detail.getAdvanceTa());
            advanceOther = advanceOther.add(detail.getAdvanceOther());
            deductions = deductions.add(detail.getDeductionTotal());
            net = net.add(detail.getNetPayment());

            PaymentPeriod period = detail.getPaymentPeriod();

            results.add(
                    new MultiMonthPaymentCreateResponse.MonthlyPaymentResult(
                            period.getId(),
                            period.getMonth(),
                            period.getYear(),
                            "INCLUDED",
                            "Month included in draft payment.",
                            detail.getNetPayment()));
        }

        validateNetPayment(net);

        // Remove detail rows for months no longer selected.
        List<PaymentMonthlyDetail> removedDetails = existingDetails.stream()
                .filter(detail -> removedPeriodIds.contains(
                        detail.getPaymentPeriod().getId()))
                .toList();

        if (!removedDetails.isEmpty()) {
            monthlyDetailRepository.deleteAll(removedDetails);
            monthlyDetailRepository.flush();
        }

        // Release only this draft's reservations for removed months.
        if (!removedPeriodIds.isEmpty()) {
            List<PaymentMonthReservation> reservations =
                    reservationRepository.findByPaymentIdAndStatus(
                            paymentId, "RESERVED");

            java.time.LocalDateTime now = java.time.LocalDateTime.now();

            for (PaymentMonthReservation reservation : reservations) {
                if (removedPeriodIds.contains(
                        reservation.getPaymentPeriod().getId())) {
                    reservation.setStatus("RELEASED");
                    reservation.setReleasedAt(now);
                }
            }

            reservationRepository.saveAll(reservations);
        }

        // Persist updated and newly created monthly details.
        monthlyDetailRepository.saveAllAndFlush(updatedDetails);

        // Reserve newly added months for this same payment.
        if (!addedPeriodIds.isEmpty()) {
            reservationService.reserveMonths(
                    employee.getId(),
                    payment,
                    new ArrayList<>(addedPeriodIds));
        }

        payment.setPaymentDate(request.paymentDate());
        payment.setRunningTa(runningTa);
        payment.setFixedTa(fixedTa);
        payment.setOther(other);
        payment.setGrossTotal(gross);
        payment.setMiscellaneous(miscellaneous);
        payment.setAdvanceTa(advanceTa);
        payment.setAdvanceOther(advanceOther);
        payment.setDeductionTotal(deductions);
        payment.setNetPayment(net);
        payment.setStatus("DRAFT");
        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment = paymentRepository.saveAndFlush(payment);

        auditLogService.log(
                "UPDATE",
                "PAYMENT",
                savedPayment.getId(),
                "Multi-month draft updated for employee "
                        + employee.getEmployeeCode()
                        + "; selected payment periods: "
                        + requestedPeriodIds
                        + "; combined net payment: "
                        + savedPayment.getNetPayment());

        List<PaymentMonthlyDetail> finalDetails =
                monthlyDetailRepository.findByPaymentId(
                        savedPayment.getId());

        finalDetails.sort(Comparator.comparing(
                (PaymentMonthlyDetail detail) ->
                        detail.getPaymentPeriod().getYear()
        ).thenComparing(
                detail -> detail.getPaymentPeriod().getMonth()
        ));

        PaymentPeriod firstPeriod =
                finalDetails.getFirst().getPaymentPeriod();

        PaymentResponse response = new PaymentResponse(
                savedPayment.getId(),
                savedPayment.getPaymentBatch() != null
                        ? savedPayment.getPaymentBatch().getId()
                        : null,
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getName(),
                firstPeriod.getId(),
                firstPeriod.getMonth(),
                firstPeriod.getYear(),
                savedPayment.getPaymentDate(),
                savedPayment.getRunningTa(),
                savedPayment.getFixedTa(),
                savedPayment.getOther(),
                savedPayment.getGrossTotal(),
                savedPayment.getMiscellaneous(),
                savedPayment.getAdvanceTa(),
                savedPayment.getAdvanceOther(),
                savedPayment.getDeductionTotal(),
                savedPayment.getNetPayment(),
                savedPayment.getStatus(),
                savedPayment.getCreatedAt(),
                savedPayment.getUpdatedAt(),
                finalDetails.stream()
                        .map(detail -> new PaymentMonthlyDetailResponse(
                                detail.getId(),
                                detail.getPaymentPeriod().getId(),
                                detail.getPaymentPeriod().getMonth(),
                                detail.getPaymentPeriod().getYear(),
                                detail.getRunningTa(),
                                detail.getFixedTa(),
                                detail.getOther(),
                                detail.getGrossTotal(),
                                detail.getMiscellaneous(),
                                detail.getAdvanceTa(),
                                detail.getAdvanceOther(),
                                detail.getDeductionTotal(),
                                detail.getNetPayment()))
                        .toList());

        return new MultiMonthPaymentCreateResponse(
                response, results, List.of());
    }


    // ============================================================
    // UPDATE DRAFT PAYMENT
    // ============================================================

    @Transactional
    public PaymentResponse updateDraftPayment(
            Long paymentId,
            PaymentUpdateRequest request
    ) {

        Payment payment =
                paymentRepository.findById(paymentId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Payment not found with id: "
                                                + paymentId
                                )
                        );

        if (!"DRAFT".equalsIgnoreCase(
                payment.getStatus()
        )) {

            throw new IllegalStateException(
                    "Only DRAFT payments can be edited"
            );
        }

        if (payment.getPaymentPeriod() != null) {
            validateEmployeePaymentMonth(
                    payment.getEmployee(),
                    payment.getPaymentPeriod()
            );
        }

        PaymentCalculationResponse calculation =
                calculatePayment(
                        request.runningTa(),
                        request.fixedTa(),
                        request.other(),
                        request.miscellaneous(),
                        request.advanceTa(),
                        request.advanceOther()
                );

        validateNetPayment(calculation.netPayment());

        Admin currentAdmin = getCurrentAdmin();

        payment.setPaymentDate(
                request.paymentDate()
        );

        payment.setRunningTa(
                calculation.runningTa()
        );

        payment.setFixedTa(
                calculation.fixedTa()
        );

        payment.setOther(
                calculation.other()
        );

        payment.setGrossTotal(
                calculation.grossTotal()
        );

        payment.setMiscellaneous(
                calculation.miscellaneous()
        );

        payment.setAdvanceTa(
                calculation.advanceTa()
        );

        payment.setAdvanceOther(
                calculation.advanceOther()
        );

        payment.setDeductionTotal(
                calculation.deductionTotal()
        );

        payment.setNetPayment(
                calculation.netPayment()
        );

        paymentBatchService.validatePaymentBatchIsOpen(
                payment.getPaymentBatch()
        );

        // Remains DRAFT after editing.
        payment.setStatus("DRAFT");

        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment =
                paymentRepository.save(payment);


        // Synchronize the monthly detail with the parent payment.
        PaymentPeriod paymentPeriod = savedPayment.getPaymentPeriod();

        PaymentMonthlyDetail monthlyDetail;

        if (paymentPeriod != null) {
            // Legacy single-month payment: find its matching monthly detail.
            monthlyDetail = monthlyDetailRepository
                    .findByPaymentIdAndPaymentPeriodId(
                            savedPayment.getId(),
                            paymentPeriod.getId()
                    )
                    .orElseThrow(() -> new IllegalStateException(
                            "Monthly detail not found for payment "
                                    + savedPayment.getId()
                                    + " and payment period "
                                    + paymentPeriod.getId()
                    ));
        } else {
            // A payment without a parent period must have exactly one
            // monthly detail when edited through this endpoint.
            List<PaymentMonthlyDetail> monthlyDetails =
                    monthlyDetailRepository.findByPaymentId(
                            savedPayment.getId()
                    );

            if (monthlyDetails.size() != 1) {
                throw new IllegalStateException(
                        "A multi-month payment cannot be edited using "
                                + "the single-payment update endpoint. "
                                + "Use the multi-month update workflow."
                );
            }

            monthlyDetail = monthlyDetails.get(0);
        }

        // Synchronize all calculated amounts.
        monthlyDetail.setRunningTa(calculation.runningTa());
        monthlyDetail.setFixedTa(calculation.fixedTa());
        monthlyDetail.setOther(calculation.other());
        monthlyDetail.setGrossTotal(calculation.grossTotal());
        monthlyDetail.setMiscellaneous(calculation.miscellaneous());
        monthlyDetail.setAdvanceTa(calculation.advanceTa());
        monthlyDetail.setAdvanceOther(calculation.advanceOther());
        monthlyDetail.setDeductionTotal(calculation.deductionTotal());
        monthlyDetail.setNetPayment(calculation.netPayment());

        monthlyDetailRepository.save(monthlyDetail);

        Employee employee =
                savedPayment.getEmployee();

        String periodDescription;

        if (savedPayment.getPaymentPeriod() != null) {
            periodDescription = formatPeriod(
                    savedPayment.getPaymentPeriod()
            );
        } else {
            periodDescription = monthlyDetailRepository
                    .findByPaymentId(savedPayment.getId())
                    .stream()
                    .map(detail -> formatPeriod(
                            detail.getPaymentPeriod()
                    ))
                    .distinct()
                    .sorted()
                    .collect(java.util.stream.Collectors.joining(", "));
        }

        auditLogService.log(
                "UPDATE",
                "PAYMENT",
                savedPayment.getId(),
                "Draft payment updated for employee "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
                        + " for payment period "
                        + periodDescription
                        + " with net payment "
                        + savedPayment.getNetPayment()
        );

        return mapToResponse(savedPayment);
    }

    // ============================================================
    // APPROVE PAYMENT
    // ============================================================

    @Transactional
    public PaymentResponse approvePayment(Long paymentId) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment not found with id: " + paymentId));

        if (!"DRAFT".equalsIgnoreCase(payment.getStatus())) {
            throw new IllegalStateException(
                    "Only DRAFT payments can be approved");
        }

        paymentBatchService.validatePaymentBatchIsOpen(
                payment.getPaymentBatch()
        );

        validateNetPayment(payment.getNetPayment());

        Admin currentAdmin = getCurrentAdmin();

        // Mark reservations as PAID only when this payment has reservations.
        List<PaymentMonthReservation> reservations =
                reservationRepository.findByPaymentIdAndStatus(
                        paymentId, "RESERVED");

        if (!reservations.isEmpty()) {
            reservationService.markReservationsPaid(paymentId);
        }

        payment.setStatus("APPROVED");
        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment = paymentRepository.save(payment);

        Employee employee = savedPayment.getEmployee();
        PaymentPeriod period = savedPayment.getPaymentPeriod();

        String periodDescription;

        if (period != null) {
            // Existing V1 single-month payment.
            periodDescription = formatPeriod(period);
        } else {
            // V2 multi-month payment.
            List<PaymentMonthlyDetail> details =
                    monthlyDetailRepository.findByPaymentId(paymentId);

            periodDescription = details.stream()
                    .map(detail -> formatPeriod(detail.getPaymentPeriod()))
                    .distinct()
                    .sorted()
                    .collect(java.util.stream.Collectors.joining(", "));

            if (periodDescription.isBlank()) {
                periodDescription = "Multiple payment months";
            }
        }

        auditLogService.log(
                "APPROVE",
                "PAYMENT",
                savedPayment.getId(),
                "Payment approved for employee "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
                        + " for payment period(s) "
                        + periodDescription
                        + " with net payment "
                        + savedPayment.getNetPayment()
        );

        return mapToResponse(savedPayment);
    }


    @Transactional
    public void cancelDraftPayment(Long paymentId) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment not found with id: " + paymentId));

        if (!"DRAFT".equalsIgnoreCase(payment.getStatus())) {
            throw new IllegalStateException(
                    "Only DRAFT payments can be cancelled.");
        }

        paymentBatchService.validatePaymentBatchIsOpen(
                payment.getPaymentBatch()
        );

        Admin currentAdmin = getCurrentAdmin();
        Employee employee = payment.getEmployee();

        // Release only RESERVED months; PAID reservations remain untouched.
        reservationService.releaseDraftReservations(paymentId);

        payment.setStatus("CANCELLED");
        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment = paymentRepository.save(payment);

        List<PaymentMonthlyDetail> monthlyDetails =
                monthlyDetailRepository.findByPaymentId(paymentId);

        String periods;

        if (!monthlyDetails.isEmpty()) {
            periods = monthlyDetails.stream()
                    .map(detail -> formatPeriod(detail.getPaymentPeriod()))
                    .distinct()
                    .sorted()
                    .collect(java.util.stream.Collectors.joining(", "));
        } else if (payment.getPaymentPeriod() != null) {
            periods = formatPeriod(payment.getPaymentPeriod());
        } else {
            periods = "No payment period recorded";
        }

        auditLogService.log(
                "CANCEL",
                "PAYMENT",
                savedPayment.getId(),
                "Draft payment cancelled for employee "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
                        + "; payment periods: "
                        + periods
                        + "; cancelled by administrator: "
                        + currentAdmin.getUsername()
        );
    }


    // ============================================================
    // CALCULATION
    // ============================================================

    private PaymentCalculationResponse calculatePayment(
            java.math.BigDecimal runningTa,
            java.math.BigDecimal fixedTa,
            java.math.BigDecimal other,
            java.math.BigDecimal miscellaneous,
            java.math.BigDecimal advanceTa,
            java.math.BigDecimal advanceOther
    ) {

        PaymentCalculationRequest calculationRequest =
                new PaymentCalculationRequest(
                        runningTa,
                        fixedTa,
                        other,
                        miscellaneous,
                        advanceTa,
                        advanceOther
                );

        return calculationService.calculate(
                calculationRequest
        );
    }

    // ============================================================
    // NEGATIVE NET VALIDATION
    // ============================================================

    private void validateNetPayment(
            java.math.BigDecimal netPayment
    ) {

        if (netPayment == null) {

            throw new IllegalArgumentException(
                    "Net payment could not be calculated"
            );
        }

        if (netPayment.signum() < 0) {

            throw new IllegalArgumentException(
                    "Net payment cannot be negative. "
                            + "Deduction total cannot exceed gross total."
            );
        }
    }

    // ============================================================
    // CURRENT ADMIN
    // ============================================================

    private Admin getCurrentAdmin() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {

            throw new IllegalStateException(
                    "Authenticated administrator could not be identified"
            );
        }

        return adminRepository
                .findByUsernameIgnoreCase(
                        authentication.getName()
                )
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Administrator account could not be found"
                        )
                );
    }

    // ============================================================
    // RESPONSE MAPPING
    // ============================================================


    private PaymentResponse mapToResponse(Payment payment) {

            PaymentPeriod period = payment.getPaymentPeriod();
            Employee employee = payment.getEmployee();

            List<PaymentMonthlyDetail> details =
                    monthlyDetailRepository.findByPaymentId(
                            payment.getId(),
                            Sort.by(Sort.Direction.ASC, "paymentPeriod.year")
                                    .and(Sort.by(Sort.Direction.ASC, "paymentPeriod.month"))
                    );

            // V1: use the original single payment period.
            // V2: use the first monthly detail for legacy response fields.
            if (period == null) {
                period = details.stream()
                        .map(PaymentMonthlyDetail::getPaymentPeriod)
                        .filter(Objects::nonNull)
                        .min(
                                Comparator.comparing(PaymentPeriod::getYear)
                                        .thenComparing(PaymentPeriod::getMonth)
                        )
                        .orElse(null);
            }

            if (period == null) {
                throw new IllegalStateException(
                        "No payment period or monthly details found for payment ID: "
                                + payment.getId()
                );
            }

            List<PaymentMonthlyDetailResponse> monthlyDetailResponses =
                    details.stream()
                            .map(detail -> {
                                PaymentPeriod detailPeriod = detail.getPaymentPeriod();

                                return new PaymentMonthlyDetailResponse(
                                        detail.getId(),
                                        detailPeriod.getId(),
                                        detailPeriod.getMonth(),
                                        detailPeriod.getYear(),
                                        detail.getRunningTa(),
                                        detail.getFixedTa(),
                                        detail.getOther(),
                                        detail.getGrossTotal(),
                                        detail.getMiscellaneous(),
                                        detail.getAdvanceTa(),
                                        detail.getAdvanceOther(),
                                        detail.getDeductionTotal(),
                                        detail.getNetPayment()
                                );
                            })
                            .toList();


        return new PaymentResponse(
                payment.getId(),
                payment.getPaymentBatch() != null
                        ? payment.getPaymentBatch().getId()
                        : null,
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getName(),
                period.getId(),
                period.getMonth(),
                period.getYear(),
                payment.getPaymentDate(),
                payment.getRunningTa(),
                payment.getFixedTa(),
                payment.getOther(),
                payment.getGrossTotal(),
                payment.getMiscellaneous(),
                payment.getAdvanceTa(),
                payment.getAdvanceOther(),
                payment.getDeductionTotal(),
                payment.getNetPayment(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getUpdatedAt(),
                monthlyDetailResponses
        );

        }


    // ============================================================
    // PAYMENT SUMMARY
    // ============================================================



    @Transactional(readOnly = true)
    public Page<PaymentSummaryResponse> getPaymentSummary(
            Long paymentPeriodId,
            Long employeeId,
            Long categoryId,
            Long bankId,
            String employeeCode,
            String employeeName,
            Long paymentBatchId,
            Pageable pageable
    ) {
        List<MonthlyPaymentSummaryResponse> monthlyRows =
                getMonthlyPaymentSummary(
                        paymentPeriodId,
                        employeeId,
                        categoryId,
                        bankId,
                        employeeCode,
                        employeeName,
                        paymentBatchId
                );

        int start = pageable.isPaged()
                ? Math.toIntExact(pageable.getOffset())
                : 0;

        int end = pageable.isPaged()
                ? Math.min(start + pageable.getPageSize(), monthlyRows.size())
                : monthlyRows.size();

        List<PaymentSummaryResponse> content;

        if (start >= monthlyRows.size()) {
            content = List.of();
        } else {
            content = monthlyRows.subList(start, end)
                    .stream()
                    .map(monthly -> new PaymentSummaryResponse(
                            monthly.paymentId(),
                            monthly.employeeId(),
                            monthly.employeeCode(),
                            monthly.employeeName(),
                            monthly.panNumber(),
                            monthly.month(),
                            monthly.year(),
                            monthly.runningTa(),
                            monthly.fixedTa(),
                            monthly.other(),
                            monthly.grossTotal(),
                            monthly.miscellaneous(),
                            monthly.advanceTa(),
                            monthly.advanceOther(),
                            monthly.deductionTotal(),
                            monthly.netPayment(),
                            monthly.status()
                    ))
                    .toList();
        }

        return new PageImpl<>(
                content,
                pageable,
                monthlyRows.size()
        );
    }



    @Transactional(readOnly = true)
    public List<MonthlyPaymentSummaryResponse> getMonthlyPaymentSummary(
            Long paymentPeriodId,
            Long employeeId,
            Long categoryId,
            Long bankId,
            String employeeCode,
            String employeeName,
            Long paymentBatchId
    ) {
        return monthlyDetailRepository
                .findAllByOrderByPaymentPeriodYearAscPaymentPeriodMonthAsc()
                .stream()
                .filter(detail -> "APPROVED".equalsIgnoreCase(detail.getPayment().getStatus()))
                .filter(detail -> {
                    Payment payment = detail.getPayment();
                    Employee employee = payment.getEmployee();
                    if (paymentBatchId != null
                            && (payment.getPaymentBatch() == null
                            || !payment.getPaymentBatch().getId().equals(paymentBatchId))) {
                        return false;
                    }

                    return (paymentPeriodId == null
                            || detail.getPaymentPeriod().getId()
                            .equals(paymentPeriodId))
                            && (employeeId == null
                            || employee.getId().equals(employeeId))
                            && (categoryId == null
                            || (employee.getCategory() != null
                            && employee.getCategory().getId().equals(categoryId)))
                            && (bankId == null
                            || (employee.getBank() != null
                            && employee.getBank().getId().equals(bankId)))
                            && (employeeCode == null
                            || employee.getEmployeeCode() != null
                            && employee.getEmployeeCode().toLowerCase()
                            .contains(employeeCode.toLowerCase()))
                            && (employeeName == null
                            || employee.getName() != null
                            && employee.getName().toLowerCase()
                            .contains(employeeName.toLowerCase()));
                })
                .map(detail -> {
                    // Keep your existing MonthlyPaymentSummaryResponse mapping here.
                    Payment payment = detail.getPayment();
                    Employee employee = payment.getEmployee();
                    PaymentPeriod period = detail.getPaymentPeriod();

                    return new MonthlyPaymentSummaryResponse(
                            payment.getId(),
                            employee.getId(),
                            employee.getEmployeeCode(),
                            employee.getName(),
                            employee.getPanNumber(),
                            period.getId(),
                            period.getMonth(),
                            period.getYear(),
                            detail.getRunningTa(),
                            detail.getFixedTa(),
                            detail.getOther(),
                            detail.getGrossTotal(),
                            detail.getMiscellaneous(),
                            detail.getAdvanceTa(),
                            detail.getAdvanceOther(),
                            detail.getDeductionTotal(),
                            detail.getNetPayment(),
                            payment.getStatus()
                    );
                })
                .toList();
    }


    // ============================================================
    // PAYMENT ADVICE
    // ============================================================

    private BigDecimal getAdviceAmount(
            Payment payment,
            Long paymentPeriodId
    ) {
        List<PaymentMonthlyDetail> details =
                monthlyDetailRepository.findByPaymentId(payment.getId());

        if (paymentPeriodId != null) {
            // Prefer the selected month's detail for V2 payments.
            if (!details.isEmpty()) {
                return details.stream()
                        .filter(detail ->
                                detail.getPaymentPeriod() != null
                                        && detail.getPaymentPeriod()
                                        .getId()
                                        .equals(paymentPeriodId))
                        .map(PaymentMonthlyDetail::getNetPayment)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }

            // Preserve V1 single-month payment behavior.
            PaymentPeriod parentPeriod = payment.getPaymentPeriod();

            if (parentPeriod != null
                    && parentPeriod.getId().equals(paymentPeriodId)) {
                return payment.getNetPayment() != null
                        ? payment.getNetPayment()
                        : BigDecimal.ZERO;
            }

            return BigDecimal.ZERO;
        }

        // Without a month filter, retain the complete parent payment amount.
        return payment.getNetPayment() != null
                ? payment.getNetPayment()
                : BigDecimal.ZERO;
    }

    private PaymentPeriod getAdvicePeriod(
            Payment payment,
            Long paymentPeriodId
    ) {
        if (paymentPeriodId != null) {
            PaymentPeriod parentPeriod = payment.getPaymentPeriod();

            if (parentPeriod != null
                    && parentPeriod.getId().equals(paymentPeriodId)) {
                return parentPeriod;
            }

            return monthlyDetailRepository
                    .findByPaymentId(payment.getId())
                    .stream()
                    .map(PaymentMonthlyDetail::getPaymentPeriod)
                    .filter(Objects::nonNull)
                    .filter(period ->
                            period.getId().equals(paymentPeriodId))
                    .findFirst()
                    .orElse(null);
        }

        if (payment.getPaymentPeriod() != null) {
            return payment.getPaymentPeriod();
        }

        return monthlyDetailRepository
                .findByPaymentId(payment.getId())
                .stream()
                .map(PaymentMonthlyDetail::getPaymentPeriod)
                .filter(Objects::nonNull)
                .min(
                        Comparator.comparing(PaymentPeriod::getYear)
                                .thenComparing(PaymentPeriod::getMonth)
                )
                .orElse(null);
    }





    @Transactional(readOnly = true)
    public Page<PaymentAdviceResponse> getPaymentAdvice(


            Long paymentBatchId,
            Long paymentPeriodId,
            Long employeeId,
            Long categoryId,
            Long bankId,
            String employeeCode,
            String employeeName,
            Pageable pageable
    ) {

        Specification<Payment> specification =
                Specification.where(
                                PaymentSpecification.hasEmployee(employeeId)
                        )
                        .and(PaymentSpecification.hasCategory(categoryId))
                        .and(PaymentSpecification.hasBank(bankId))
                        .and(PaymentSpecification.employeeCodeContains(employeeCode))
                        .and(PaymentSpecification.employeeNameContains(employeeName))
                        .and((root, query, cb) ->
                                cb.equal(root.get("status"), "APPROVED"));

        List<Payment> approvedPayments =
                paymentRepository.findAll(specification);

        List<Payment> filteredPayments = approvedPayments.stream()
                .filter(payment -> {
                    // Apply the batch filter only when a batch is selected.
                    if (paymentBatchId != null) {
                        if (payment.getPaymentBatch() == null
                                || !payment.getPaymentBatch()
                                .getId()
                                .equals(paymentBatchId)) {
                            return false;
                        }
                    }

                    // No payment-period filter means all periods are included.
                    if (paymentPeriodId == null) {
                        return true;
                    }

                    PaymentPeriod parentPeriod = payment.getPaymentPeriod();

                    if (parentPeriod != null
                            && parentPeriod.getId().equals(paymentPeriodId)) {
                        return true;
                    }

                    return monthlyDetailRepository
                            .findByPaymentId(payment.getId())
                            .stream()
                            .anyMatch(detail ->
                                    detail.getPaymentPeriod() != null
                                            && detail.getPaymentPeriod()
                                            .getId()
                                            .equals(paymentPeriodId));
                })
                .toList();

        /*
         * Preserve the existing per-payment output when no batch is selected.
         * Batch-specific advice is aggregated into one row per employee.
         */
        if (paymentBatchId == null) {
            int start = pageable.isPaged()
                    ? (int) pageable.getOffset()
                    : 0;

            if (start >= filteredPayments.size()) {
                return new PageImpl<>(
                        List.of(),
                        pageable,
                        filteredPayments.size()
                );
            }

            int end = pageable.isUnpaged()
                    ? filteredPayments.size()
                    : Math.min(
                    start + pageable.getPageSize(),
                    filteredPayments.size()
            );

            List<PaymentAdviceResponse> content =
                    filteredPayments.subList(start, end)
                            .stream()
                            .map(payment -> {
                                Employee employee = payment.getEmployee();

                                String bankName = employee.getBank() != null
                                        ? employee.getBank().getBankName()
                                        : null;

                                String categoryName =
                                        employee.getCategory() != null
                                                ? employee.getCategory().getName()
                                                : null;

                                PaymentPeriod period = payment.getPaymentPeriod();

                                if (period == null) {
                                    period = monthlyDetailRepository
                                            .findByPaymentId(payment.getId())
                                            .stream()
                                            .map(PaymentMonthlyDetail::getPaymentPeriod)
                                            .filter(Objects::nonNull)
                                            .min(
                                                    Comparator.comparing(
                                                            PaymentPeriod::getYear
                                                    ).thenComparing(
                                                            PaymentPeriod::getMonth
                                                    )
                                            )
                                            .orElse(null);
                                }

                                return new PaymentAdviceResponse(
                                        payment.getId(),
                                        employee.getEmployeeCode(),
                                        employee.getName(),
                                        bankName,
                                        employee.getAccountNumber(),
                                        employee.getPanNumber(),
                                        employee.getIfscCode(),
                                        categoryName,
                                        period != null ? period.getMonth() : null,
                                        period != null ? period.getYear() : null,
                                        payment.getNetPayment(),
                                        payment.getStatus()
                                );
                            })
                            .toList();

            return new PageImpl<>(
                    content,
                    pageable,
                    filteredPayments.size()
            );
        }

        // Apply pagination after aggregation.

        Map<Long, List<Payment>> paymentsByEmployee =
                filteredPayments.stream()
                        .collect(Collectors.groupingBy(
                                payment -> payment.getEmployee().getId(),
                                LinkedHashMap::new,
                                Collectors.toList()
                        ));

        List<PaymentAdviceResponse> aggregatedAdvice =
                paymentsByEmployee.values()
                        .stream()
                        .map(employeePayments -> {
                            Payment representative = employeePayments.get(0);
                            Employee employee = representative.getEmployee();

                            String bankName = employee.getBank() != null
                                    ? employee.getBank().getBankName()
                                    : null;

                            String categoryName = employee.getCategory() != null
                                    ? employee.getCategory().getName()
                                    : null;

                            BigDecimal totalNetPayment = employeePayments.stream()
                                    .map(payment ->
                                            getAdviceAmount(payment, paymentPeriodId))
                                    .filter(Objects::nonNull)
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                            PaymentPeriod period =
                                    getAdvicePeriod(representative, paymentPeriodId);

                            return new PaymentAdviceResponse(
                                    representative.getId(),
                                    employee.getEmployeeCode(),
                                    employee.getName(),
                                    bankName,
                                    employee.getAccountNumber(),
                                    employee.getPanNumber(),
                                    employee.getIfscCode(),
                                    categoryName,
                                    period != null ? period.getMonth() : null,
                                    period != null ? period.getYear() : null,
                                    totalNetPayment,
                                    "APPROVED"
                            );
                        })
                        .toList();


        int start = pageable.isPaged()
                ? (int) pageable.getOffset()
                : 0;

        if (start >= aggregatedAdvice.size()) {
            return new PageImpl<>(
                    List.of(),
                    pageable,
                    aggregatedAdvice.size()
            );
        }

        int end = pageable.isUnpaged()
                ? aggregatedAdvice.size()
                : Math.min(
                start + pageable.getPageSize(),
                aggregatedAdvice.size()
        );

        List<PaymentAdviceResponse> content =
                aggregatedAdvice.subList(start, end);

        return new PageImpl<>(
                content,
                pageable,
                aggregatedAdvice.size()
        );
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment not found with id: " + paymentId));

        return mapToResponse(payment);
    }


    @Transactional(readOnly = true)
    public List<PaymentResponse> getMultiMonthDraftsForEmployee(
            Long employeeId) {

        employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Employee not found: " + employeeId));

        return paymentRepository
                .findByEmployeeIdAndPaymentPeriodIsNullAndStatusOrderByUpdatedAtDesc(
                        employeeId, "DRAFT")
                .stream()
                .filter(payment ->
                        !monthlyDetailRepository
                                .findByPaymentId(payment.getId())
                                .isEmpty())
                .map(this::mapToResponse)
                .toList();
    }

    private String formatPeriod(
            PaymentPeriod period
    ) {

        return String.format(
                "%02d/%d",
                period.getMonth(),
                period.getYear()
        );
    }


    @Transactional(readOnly = true)
    public List<PaymentResponse> getAllMultiMonthDrafts() {
        return paymentRepository
                .findByPaymentPeriodIsNullAndStatusOrderByUpdatedAtDesc("DRAFT")
                .stream()
                .filter(payment ->
                        !monthlyDetailRepository
                                .findByPaymentId(payment.getId())
                                .isEmpty()
                )
                .map(this::mapToResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public List<EligiblePaymentPeriodResponse> getEligiblePaymentPeriods(
            Long employeeId) {
        return getEligiblePaymentPeriods(employeeId, null);
    }

    @Transactional(readOnly = true)
    public List<EligiblePaymentPeriodResponse> getEligiblePaymentPeriods(
            Long employeeId,
            Long paymentId) {

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Employee not found: " + employeeId));

        if (employee.getPaymentTrackingStartMonth() == null) {
            throw new IllegalStateException(
                    "Payment tracking start month is not configured for employee: "
                            + employeeId);
        }

        YearMonth trackingStartMonth = YearMonth.from(
                employee.getPaymentTrackingStartMonth()
        );

        YearMonth currentMonth = YearMonth.now();

        if (trackingStartMonth.isAfter(currentMonth)) {
            throw new IllegalStateException(
                    "Payment tracking start month cannot be in the future.");
        }

        if (paymentId != null) {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Payment not found: " + paymentId));

            if (!"DRAFT".equalsIgnoreCase(payment.getStatus())) {
                throw new IllegalStateException(
                        "Only DRAFT payments can be edited.");
            }

            if (payment.getPaymentPeriod() != null
                    || !payment.getEmployee().getId().equals(employeeId)) {
                throw new IllegalArgumentException(
                        "The draft does not belong to this employee "
                                + "or is not a multi-month payment.");
            }

            paymentBatchService.validatePaymentBatchIsOpen(
                    payment.getPaymentBatch()
            );
        }
        List<PaymentPeriod> periods = paymentPeriodRepository.findAll()
                .stream()
                .filter(period -> {
                    YearMonth month = YearMonth.of(
                            period.getYear(),
                            period.getMonth()
                    );

                    return !month.isBefore(trackingStartMonth)
                            && !month.isAfter(currentMonth);
                })
                .sorted(Comparator.comparing(PaymentPeriod::getYear)
                        .thenComparing(PaymentPeriod::getMonth))
                .toList();

        List<Long> periodIds = periods.stream()
                .map(PaymentPeriod::getId)
                .toList();

        List<PaymentMonthReservationService.MonthAvailability> availability =
                reservationService.checkMonthAvailabilityForDraft(
                        employeeId, periodIds, paymentId);

        Map<Long, PaymentMonthReservationService.MonthAvailability> byId =
                availability.stream().collect(Collectors.toMap(
                        PaymentMonthReservationService.MonthAvailability
                                ::paymentPeriodId,
                        item -> item));

        List<EligiblePaymentPeriodResponse> results = new ArrayList<>();

        for (PaymentPeriod period : periods) {
            PaymentMonthReservationService.MonthAvailability item =
                    byId.get(period.getId());

            if (item == null) {
                throw new IllegalStateException(
                        "Availability not found for payment period: "
                                + period.getId());
            }

            String reason = switch (item.status()) {
                case "PAID" -> "This month has already been paid.";
                case "RESERVED" -> item.available()
                        ? null
                        : "This month is reserved by another draft.";
                default -> null;
            };

            results.add(new EligiblePaymentPeriodResponse(
                    period.getId(),
                    period.getMonth(),
                    period.getYear(),
                    item.status(),
                    item.available(),
                    reason));
        }

        return results;
    }

    private void validateEmployeePaymentMonth(
            Employee employee,
            PaymentPeriod paymentPeriod
    ) {
        if (employee.getPaymentTrackingStartMonth() == null) {
            throw new IllegalStateException(
                    "Payment tracking start month is not configured for employee: "
                            + employee.getId()
            );
        }

        YearMonth trackingStartMonth = YearMonth.from(
                employee.getPaymentTrackingStartMonth()
        );

        YearMonth requestedMonth = YearMonth.of(
                paymentPeriod.getYear(),
                paymentPeriod.getMonth()
        );

        YearMonth currentMonth = YearMonth.now();

        if (requestedMonth.isBefore(trackingStartMonth)) {
            throw new IllegalArgumentException(
                    "Payment cannot be created before the employee's "
                            + "payment tracking start month: "
                            + trackingStartMonth
            );
        }

        if (requestedMonth.isAfter(currentMonth)) {
            throw new IllegalArgumentException(
                    "Payment cannot be created for a future month: "
                            + requestedMonth
            );
        }
    }

}

