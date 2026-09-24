package com.employee.payment.admin.controller;

import com.employee.payment.admin.dto.AdminCreateRequest;
import com.employee.payment.admin.dto.AdminResponse;
import com.employee.payment.admin.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admins")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping
    public ResponseEntity<AdminResponse> createAdmin(
            @Valid @RequestBody AdminCreateRequest request) {

        AdminResponse response =
                adminService.createAdmin(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<AdminResponse>> getAllAdmins() {

        return ResponseEntity.ok(
                adminService.getAllAdmins()
        );
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<AdminResponse> activateAdmin(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                adminService.activateAdmin(id)
        );
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<AdminResponse> deactivateAdmin(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                adminService.deactivateAdmin(id)
        );
    }
}