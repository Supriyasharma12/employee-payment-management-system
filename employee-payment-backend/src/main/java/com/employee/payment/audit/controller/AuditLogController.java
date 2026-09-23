package com.employee.payment.audit.controller;

import com.employee.payment.audit.dto.AuditLogResponse;
import com.employee.payment.audit.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public Page<AuditLogResponse> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long adminId,
            @RequestParam(required = false) String search,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "10") int size
    ) {

        // Prevent invalid pagination values
        if (page < 0) {
            page = 0;
        }

        if (size < 1) {
            size = 10;
        }

        // Keep a reasonable maximum page size
        if (size > 100) {
            size = 100;
        }

        String normalizedAction = normalize(action);
        String normalizedEntityType = normalize(entityType);
        String normalizedSearch = normalize(search);

        LocalDateTime fromDateTime = null;
        LocalDateTime toDateTime = null;

        if (fromDate != null) {
            fromDateTime = fromDate.atStartOfDay();
        }

        if (toDate != null) {
            toDateTime = toDate.atTime(LocalTime.MAX);
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return auditLogService.searchAuditLogs(
                normalizedAction,
                normalizedEntityType,
                adminId,
                normalizedSearch,
                fromDateTime,
                toDateTime,
                pageable
        );
    }

    private String normalize(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim().toUpperCase();
    }
}