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

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;
    private final PaymentPeriodRepository paymentPeriodRepository;
    private final PaymentCalculationService calculationService;
    private final AuditLogService auditLogService;
    private final AdminRepository adminRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            EmployeeRepository employeeRepository,
            PaymentPeriodRepository paymentPeriodRepository,
            PaymentCalculationService calculationService,
            AuditLogService auditLogService,
            AdminRepository adminRepository
    ) {
        this.paymentRepository = paymentRepository;
        this.employeeRepository = employeeRepository;
        this.paymentPeriodRepository = paymentPeriodRepository;
        this.calculationService = calculationService;
        this.auditLogService = auditLogService;
        this.adminRepository = adminRepository;
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

        Admin currentAdmin = getCurrentAdmin();

        Payment payment = new Payment();

        payment.setEmployee(employee);
        payment.setPaymentPeriod(paymentPeriod);
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
                paymentRepository.save(payment);

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

        // Remains DRAFT after editing.
        payment.setStatus("DRAFT");

        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment =
                paymentRepository.save(payment);

        Employee employee =
                savedPayment.getEmployee();

        PaymentPeriod period =
                savedPayment.getPaymentPeriod();

        auditLogService.log(
                "UPDATE",
                "PAYMENT",
                savedPayment.getId(),
                "Draft payment updated for employee "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
                        + " for payment period "
                        + formatPeriod(period)
                        + " with net payment "
                        + savedPayment.getNetPayment()
        );

        return mapToResponse(savedPayment);
    }

    // ============================================================
    // APPROVE PAYMENT
    // ============================================================

    @Transactional
    public PaymentResponse approvePayment(
            Long paymentId
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
                    "Only DRAFT payments can be approved"
            );
        }

        validateNetPayment(
                payment.getNetPayment()
        );

        Admin currentAdmin = getCurrentAdmin();

        payment.setStatus("APPROVED");
        payment.setUpdatedBy(currentAdmin);

        Payment savedPayment =
                paymentRepository.save(payment);

        Employee employee =
                savedPayment.getEmployee();

        PaymentPeriod period =
                savedPayment.getPaymentPeriod();

        auditLogService.log(
                "APPROVE",
                "PAYMENT",
                savedPayment.getId(),
                "Payment approved for employee "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
                        + " for payment period "
                        + formatPeriod(period)
                        + " with net payment "
                        + savedPayment.getNetPayment()
        );

        return mapToResponse(savedPayment);
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

    private PaymentResponse mapToResponse(
            Payment payment
    ) {

        PaymentPeriod period =
                payment.getPaymentPeriod();

        Employee employee =
                payment.getEmployee();

        return new PaymentResponse(
                payment.getId(),

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
                payment.getUpdatedAt()
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
            Pageable pageable
    ) {

        Specification<Payment> specification =
                Specification
                        .where(
                                PaymentSpecification
                                        .hasPaymentPeriod(
                                                paymentPeriodId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .hasEmployee(
                                                employeeId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .hasCategory(
                                                categoryId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .hasBank(
                                                bankId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .employeeCodeContains(
                                                employeeCode
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .employeeNameContains(
                                                employeeName
                                        )
                        );

        return paymentRepository
                .findAll(
                        specification,
                        pageable
                )
                .map(payment -> {

                    PaymentPeriod period =
                            payment.getPaymentPeriod();

                    return new PaymentSummaryResponse(

                            payment.getId(),

                            payment.getEmployee().getId(),
                            payment.getEmployee().getEmployeeCode(),
                            payment.getEmployee().getName(),

                            period.getMonth(),
                            period.getYear(),

                            payment.getRunningTa(),
                            payment.getFixedTa(),
                            payment.getOther(),
                            payment.getGrossTotal(),

                            payment.getMiscellaneous(),
                            payment.getAdvanceTa(),
                            payment.getAdvanceOther(),
                            payment.getDeductionTotal(),

                            payment.getNetPayment(),

                            payment.getStatus()
                    );
                });
    }

    // ============================================================
    // PAYMENT ADVICE
    // ============================================================

    @Transactional(readOnly = true)
    public Page<PaymentAdviceResponse> getPaymentAdvice(
            Long paymentPeriodId,
            Long employeeId,
            Long categoryId,
            Long bankId,
            String employeeCode,
            String employeeName,
            Pageable pageable
    ) {

        Specification<Payment> specification =
                Specification
                        .where(
                                PaymentSpecification
                                        .hasPaymentPeriod(
                                                paymentPeriodId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .hasEmployee(
                                                employeeId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .hasCategory(
                                                categoryId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .hasBank(
                                                bankId
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .employeeCodeContains(
                                                employeeCode
                                        )
                        )
                        .and(
                                PaymentSpecification
                                        .employeeNameContains(
                                                employeeName
                                        )
                        )
                        .and(
                                (root, query, criteriaBuilder) ->
                                        criteriaBuilder.equal(
                                                root.get("status"),
                                                "APPROVED"
                                        )
                        );

        return paymentRepository
                .findAll(
                        specification,
                        pageable
                )
                .map(payment -> {

                    Employee employee =
                            payment.getEmployee();

                    String bankName =
                            employee.getBank() != null
                                    ? employee.getBank().getBankName()
                                    : null;

                    String categoryName =
                            employee.getCategory().getName();

                    PaymentPeriod period =
                            payment.getPaymentPeriod();

                    return new PaymentAdviceResponse(

                            payment.getId(),

                            employee.getEmployeeCode(),
                            employee.getName(),

                            bankName,
                            employee.getAccountNumber(),
                            employee.getIfscCode(),

                            categoryName,

                            period.getMonth(),
                            period.getYear(),

                            payment.getNetPayment(),

                            payment.getStatus()
                    );
                });
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
}