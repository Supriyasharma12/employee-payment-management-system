package com.employee.payment.employee.service;

import com.employee.payment.audit.service.AuditLogService;
import com.employee.payment.employee.dto.EmployeeCreateRequest;
import com.employee.payment.employee.dto.EmployeeResponse;
import com.employee.payment.employee.dto.EmployeeUpdateRequest;
import com.employee.payment.employee.entity.Bank;
import com.employee.payment.employee.entity.Employee;
import com.employee.payment.employee.entity.EmployeeCategory;
import com.employee.payment.employee.repository.BankRepository;
import com.employee.payment.employee.repository.EmployeeCategoryRepository;
import com.employee.payment.employee.repository.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeCategoryRepository categoryRepository;
    private final BankRepository bankRepository;
    private final AuditLogService auditLogService;

    public EmployeeService(
            EmployeeRepository employeeRepository,
            EmployeeCategoryRepository categoryRepository,
            BankRepository bankRepository,
            AuditLogService auditLogService
    ) {
        this.employeeRepository = employeeRepository;
        this.categoryRepository = categoryRepository;
        this.bankRepository = bankRepository;
        this.auditLogService = auditLogService;
    }

    // ============================================================
    // CREATE EMPLOYEE
    // ============================================================

    public EmployeeResponse create(EmployeeCreateRequest request) {

        if (employeeRepository.existsByEmployeeCodeIgnoreCase(
                request.employeeCode()
        )) {
            throw new IllegalArgumentException(
                    "Employee code already exists"
            );
        }

        EmployeeCategory category =
                categoryRepository.findById(request.categoryId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Employee category not found"
                                )
                        );

        Bank bank = null;

        if (request.bankId() != null) {
            bank = bankRepository.findById(request.bankId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Bank not found"
                            )
                    );
        }

        Employee employee = new Employee();

        employee.setEmployeeCode(
                request.employeeCode().trim()
        );

        employee.setName(
                request.name().trim()
        );

        employee.setPanNumber(
                request.panNumber() != null
                        ? request.panNumber().trim().toUpperCase()
                        : null
        );

        employee.setAccountNumber(
                request.accountNumber().trim()
        );

        employee.setIfscCode(
                request.ifscCode() != null
                        ? request.ifscCode().trim().toUpperCase()
                        : null
        );

        // ============================================================
        // NEW EMPLOYEE DETAILS
        // ============================================================

        employee.setDepartment(
                request.department().trim()
        );

        employee.setMedicalCardId(
                request.medicalCardId() != null
                        ? request.medicalCardId().trim()
                        : null
        );

        employee.setUan(
                request.uan() != null
                        ? request.uan().trim()
                        : null
        );

        employee.setAadhaar(
                request.aadhaar() != null
                        ? request.aadhaar().trim()
                        : null
        );

        employee.setDateOfBirth(
                request.dateOfBirth()
        );

        employee.setDateOfJoining(
                request.dateOfJoining()
        );

        // ============================================================
        // EXISTING EMPLOYEE DETAILS
        // ============================================================

        employee.setPhoneNumber(request.phoneNumber());
        employee.setEmail(request.email());
        employee.setGradePay(request.gradePay());
        employee.setScale(request.scale());
        employee.setHeadquarters(request.headquarters());
        employee.setDesignation(request.designation());
        employee.setCategory(category);
        employee.setBank(bank);
        employee.setActive(true);

        Employee savedEmployee =
                employeeRepository.save(employee);

        auditLogService.log(
                "CREATE",
                "EMPLOYEE",
                savedEmployee.getId(),
                "Employee created: "
                        + savedEmployee.getEmployeeCode()
                        + " - "
                        + savedEmployee.getName()
        );

        return toResponse(savedEmployee);
    }

    // ============================================================
    // GET BY ID
    // ============================================================

    @Transactional(readOnly = true)
    public EmployeeResponse getById(Long id) {

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Employee not found"
                        )
                );

        return toResponse(employee);
    }

    // ============================================================
    // GET ALL
    // ============================================================

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAll(Pageable pageable) {

        return employeeRepository
                .findAll(pageable)
                .map(this::toResponse);
    }


    // ============================================================
// GET ALL EMPLOYEES FOR EXPORT
// ============================================================

    @Transactional(readOnly = true)
    public List<EmployeeResponse> getAllForExport() {

        return employeeRepository
                .findAll(
                        Sort.by(
                                Sort.Order.asc("employeeCodeSort"),
                                Sort.Order.asc("id")
                        )
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // ============================================================
    // SEARCH BY NAME
    // ============================================================

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> searchByName(
            String name,
            Pageable pageable
    ) {

        return employeeRepository
                .findByNameContainingIgnoreCase(
                        name,
                        pageable
                )
                .map(this::toResponse);
    }

    // ============================================================
    // SEARCH BY EMPLOYEE CODE
    // ============================================================

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> searchByEmployeeCode(
            String employeeCode,
            Pageable pageable
    ) {

        return employeeRepository
                .findByEmployeeCodeContainingIgnoreCase(
                        employeeCode,
                        pageable
                )
                .map(this::toResponse);
    }

    // ============================================================
    // UPDATE EMPLOYEE
    // ============================================================

    public EmployeeResponse update(
            Long id,
            EmployeeUpdateRequest request
    ) {

        Employee employee =
                employeeRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Employee not found"
                                )
                        );

        EmployeeCategory category =
                categoryRepository.findById(request.categoryId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Employee category not found"
                                )
                        );

        Bank bank = null;

        if (request.bankId() != null) {
            bank = bankRepository.findById(request.bankId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Bank not found"
                            )
                    );
        }

        employee.setName(
                request.name().trim()
        );

        employee.setPanNumber(
                request.panNumber() != null
                        ? request.panNumber().trim().toUpperCase()
                        : null
        );

        employee.setAccountNumber(
                request.accountNumber().trim()
        );

        employee.setIfscCode(
                request.ifscCode() != null
                        ? request.ifscCode().trim().toUpperCase()
                        : null
        );

        // ============================================================
        // NEW EMPLOYEE DETAILS
        // ============================================================

        employee.setDepartment(
                request.department().trim()
        );

        employee.setMedicalCardId(
                request.medicalCardId() != null
                        ? request.medicalCardId().trim()
                        : null
        );

        employee.setUan(
                request.uan() != null
                        ? request.uan().trim()
                        : null
        );

        employee.setAadhaar(
                request.aadhaar() != null
                        ? request.aadhaar().trim()
                        : null
        );

        employee.setDateOfBirth(
                request.dateOfBirth()
        );

        employee.setDateOfJoining(
                request.dateOfJoining()
        );

        // ============================================================
        // EXISTING EMPLOYEE DETAILS
        // ============================================================

        employee.setPhoneNumber(request.phoneNumber());
        employee.setEmail(request.email());
        employee.setGradePay(request.gradePay());
        employee.setScale(request.scale());
        employee.setHeadquarters(request.headquarters());
        employee.setDesignation(request.designation());
        employee.setCategory(category);
        employee.setBank(bank);

        Employee updatedEmployee =
                employeeRepository.save(employee);

        auditLogService.log(
                "UPDATE",
                "EMPLOYEE",
                updatedEmployee.getId(),
                "Employee updated: "
                        + updatedEmployee.getEmployeeCode()
                        + " - "
                        + updatedEmployee.getName()
        );

        return toResponse(updatedEmployee);
    }

    // ============================================================
    // DEACTIVATE
    // ============================================================

    public void deactivate(Long id) {

        Employee employee =
                employeeRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Employee not found"
                                )
                        );

        if (!employee.getActive()) {
            return;
        }

        employee.setActive(false);

        employeeRepository.save(employee);

        auditLogService.log(
                "DEACTIVATE",
                "EMPLOYEE",
                employee.getId(),
                "Employee deactivated: "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
        );
    }

    // ============================================================
    // ACTIVATE
    // ============================================================

    public void activate(Long id) {

        Employee employee =
                employeeRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Employee not found"
                                )
                        );

        if (employee.getActive()) {
            return;
        }

        employee.setActive(true);

        employeeRepository.save(employee);

        auditLogService.log(
                "ACTIVATE",
                "EMPLOYEE",
                employee.getId(),
                "Employee activated: "
                        + employee.getEmployeeCode()
                        + " - "
                        + employee.getName()
        );
    }

    // ============================================================
    // RESPONSE MAPPING
    // ============================================================

    private EmployeeResponse toResponse(Employee employee) {

        return new EmployeeResponse(

                employee.getId(),
                employee.getEmployeeCode(),
                employee.getName(),
                employee.getPanNumber(),
                employee.getAccountNumber(),
                employee.getIfscCode(),

                // ====================================================
                // NEW EMPLOYEE DETAILS
                // ====================================================

                employee.getDepartment(),
                employee.getMedicalCardId(),
                employee.getUan(),
                employee.getAadhaar(),
                employee.getDateOfBirth(),
                employee.getDateOfJoining(),

                // ====================================================
                // EXISTING EMPLOYEE DETAILS
                // ====================================================

                employee.getPhoneNumber(),
                employee.getEmail(),
                employee.getGradePay(),
                employee.getScale(),
                employee.getHeadquarters(),
                employee.getDesignation(),

                employee.getCategory().getId(),
                employee.getCategory().getName(),

                employee.getBank() != null
                        ? employee.getBank().getId()
                        : null,

                employee.getBank() != null
                        ? employee.getBank().getBankName()
                        : null,

                employee.getActive(),
                employee.getCreatedAt(),
                employee.getUpdatedAt()
        );
    }
}