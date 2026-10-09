package com.employee.payment.employee.controller;

import com.employee.payment.employee.dto.EmployeeCreateRequest;
import com.employee.payment.employee.dto.EmployeeResponse;
import com.employee.payment.employee.dto.EmployeeUpdateRequest;
import com.employee.payment.employee.export.EmployeeExcelExporter;
import com.employee.payment.employee.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeExcelExporter employeeExcelExporter;

    public EmployeeController(
            EmployeeService employeeService,
            EmployeeExcelExporter employeeExcelExporter
    ) {
        this.employeeService = employeeService;
        this.employeeExcelExporter = employeeExcelExporter;
    }

    @PostMapping
    public EmployeeResponse create(
            @Valid @RequestBody EmployeeCreateRequest request
    ) {
        return employeeService.create(request);
    }

    @GetMapping("/{id}")
    public EmployeeResponse getById(
            @PathVariable Long id
    ) {
        return employeeService.getById(id);
    }

    @GetMapping
    public Page<EmployeeResponse> getEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Order.asc("employeeCodeSort"),
                                Sort.Order.asc("id")
                        )
                );

        return employeeService.getAll(pageable);
    }

    // ============================================================
    // EXPORT EMPLOYEE MASTER TO EXCEL
    // ============================================================

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportEmployees()
            throws IOException {

        List<EmployeeResponse> employees =
                employeeService.getAllForExport();

        byte[] excelFile =
                employeeExcelExporter.export(employees);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=Employee_Master.xlsx"
                )
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                )
                .body(excelFile);
    }

    @GetMapping("/search/name")
    public Page<EmployeeResponse> searchByName(
            @RequestParam String name,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Order.asc("employeeCodeSort"),
                                Sort.Order.asc("id")
                        )
                );

        return employeeService.searchByName(
                name,
                pageable
        );
    }

    @GetMapping("/search/code")
    public Page<EmployeeResponse> searchByEmployeeCode(
            @RequestParam String employeeCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Order.asc("employeeCodeSort"),
                                Sort.Order.asc("id")
                        )
                );

        return employeeService.searchByEmployeeCode(
                employeeCode,
                pageable
        );
    }

    @PutMapping("/{id}")
    public EmployeeResponse update(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeUpdateRequest request
    ) {
        return employeeService.update(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    public void deactivate(
            @PathVariable Long id
    ) {
        employeeService.deactivate(id);
    }

    @PatchMapping("/{id}/activate")
    public void activate(
            @PathVariable Long id
    ) {
        employeeService.activate(id);
    }
}