package com.employee.payment.employee.controller;

import com.employee.payment.employee.dto.EmployeeCreateRequest;
import com.employee.payment.employee.dto.EmployeeResponse;
import com.employee.payment.employee.dto.EmployeeUpdateRequest;
import com.employee.payment.employee.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
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