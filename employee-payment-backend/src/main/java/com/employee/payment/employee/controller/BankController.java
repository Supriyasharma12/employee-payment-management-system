package com.employee.payment.employee.controller;

import com.employee.payment.employee.entity.Bank;
import com.employee.payment.employee.repository.BankRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/banks")
public class BankController {

    private final BankRepository repository;

    public BankController(
            BankRepository repository
    ) {
        this.repository = repository;
    }

    @GetMapping
    public List<Bank> getAll() {
        return repository.findAll();
    }
}