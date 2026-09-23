package com.employee.payment.employee.controller;

import com.employee.payment.employee.entity.EmployeeCategory;
import com.employee.payment.employee.repository.EmployeeCategoryRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee-categories")
public class EmployeeCategoryController {

    private final EmployeeCategoryRepository repository;

    public EmployeeCategoryController(
            EmployeeCategoryRepository repository
    ) {
        this.repository = repository;
    }

    @GetMapping
    public List<EmployeeCategory> getAll() {
        return repository.findAll();
    }
}