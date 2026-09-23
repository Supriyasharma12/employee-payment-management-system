package com.employee.payment.audit.service;

import com.employee.payment.admin.entity.Admin;
import com.employee.payment.admin.repository.AdminRepository;
import com.employee.payment.audit.dto.AuditLogResponse;
import com.employee.payment.audit.entity.AuditLog;
import com.employee.payment.audit.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AdminRepository adminRepository;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            AdminRepository adminRepository
    ) {
        this.auditLogRepository = auditLogRepository;
        this.adminRepository = adminRepository;
    }

    /**
     * Logs an action performed by the currently authenticated administrator.
     */
    @Transactional
    public void log(
            String action,
            String entityType,
            Long entityId,
            String description
    ) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {

            throw new IllegalStateException(
                    "Authenticated administrator could not be identified"
            );
        }

        String username = authentication.getName();

        Admin admin = adminRepository
                .findByUsernameIgnoreCase(username)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Administrator account could not be found"
                        )
                );

        logForAdmin(
                admin,
                action,
                entityType,
                entityId,
                description
        );
    }

    /**
     * Logs an action for a specific administrator.
     *
     * Used for events such as LOGIN, where the administrator
     * has been authenticated but the JWT security context
     * has not yet been established.
     */
    @Transactional
    public void logForAdmin(
            Admin admin,
            String action,
            String entityType,
            Long entityId,
            String description
    ) {

        AuditLog auditLog = new AuditLog(
                admin,
                action,
                entityType,
                entityId,
                description
        );

        auditLogRepository.save(auditLog);
    }

    /**
     * Search and retrieve audit logs with optional filters.
     *
     * Dynamic Specification is used so that null filters
     * are completely excluded from the generated SQL.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchAuditLogs(
            String action,
            String entityType,
            Long adminId,
            String search,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    ) {

        Specification<AuditLog> specification =
                (root, query, criteriaBuilder) -> {

                    List<Predicate> predicates =
                            new ArrayList<>();

                    /*
                     * Action filter
                     */
                    if (action != null && !action.isBlank()) {

                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get("action"),
                                        action
                                )
                        );
                    }

                    /*
                     * Entity type filter
                     */
                    if (entityType != null && !entityType.isBlank()) {

                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get("entityType"),
                                        entityType
                                )
                        );
                    }

                    /*
                     * Administrator filter
                     */
                    if (adminId != null) {

                        predicates.add(
                                criteriaBuilder.equal(
                                        root.get("admin").get("id"),
                                        adminId
                                )
                        );
                    }

                    /*
                     * Text search.
                     *
                     * Searches:
                     * - audit description
                     * - administrator name
                     * - administrator username
                     */
                    if (search != null && !search.isBlank()) {

                        String searchPattern =
                                "%" + search.trim().toLowerCase() + "%";

                        predicates.add(
                                criteriaBuilder.or(
                                        criteriaBuilder.like(
                                                criteriaBuilder.lower(
                                                        root.get("description")
                                                ),
                                                searchPattern
                                        ),

                                        criteriaBuilder.like(
                                                criteriaBuilder.lower(
                                                        root.get("admin")
                                                                .get("name")
                                                ),
                                                searchPattern
                                        ),

                                        criteriaBuilder.like(
                                                criteriaBuilder.lower(
                                                        root.get("admin")
                                                                .get("username")
                                                ),
                                                searchPattern
                                        )
                                )
                        );
                    }

                    /*
                     * From date filter
                     */
                    if (fromDate != null) {

                        predicates.add(
                                criteriaBuilder.greaterThanOrEqualTo(
                                        root.get("createdAt"),
                                        fromDate
                                )
                        );
                    }

                    /*
                     * To date filter
                     */
                    if (toDate != null) {

                        predicates.add(
                                criteriaBuilder.lessThanOrEqualTo(
                                        root.get("createdAt"),
                                        toDate
                                )
                        );
                    }

                    return criteriaBuilder.and(
                            predicates.toArray(new Predicate[0])
                    );
                };

        return auditLogRepository
                .findAll(specification, pageable)
                .map(this::toResponse);
    }

    /**
     * Converts AuditLog entity to API response.
     */
    private AuditLogResponse toResponse(
            AuditLog auditLog
    ) {

        Admin admin = auditLog.getAdmin();

        return new AuditLogResponse(
                auditLog.getId(),
                admin.getId(),
                admin.getName(),
                admin.getUsername(),
                auditLog.getAction(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getDescription(),
                auditLog.getCreatedAt()
        );
    }
}