package com.employee.payment.admin.service;

import com.employee.payment.admin.dto.AdminCreateRequest;
import com.employee.payment.admin.dto.AdminResponse;
import com.employee.payment.admin.entity.Admin;
import com.employee.payment.admin.repository.AdminRepository;
import com.employee.payment.audit.service.AuditLogService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class AdminService {

    private static final Pattern PASSWORD_PATTERN =
            Pattern.compile(
                    "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$"
            );

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AdminService(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService
    ) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AdminResponse createAdmin(
            AdminCreateRequest request
    ) {

        validatePassword(request.password());

        if (adminRepository.existsByUsernameIgnoreCase(
                request.username()
        )) {
            throw new IllegalArgumentException(
                    "Username already exists: "
                            + request.username()
            );
        }

        Admin admin = new Admin();

        admin.setName(request.name());
        admin.setUsername(request.username());

        admin.setPasswordHash(
                passwordEncoder.encode(
                        request.password()
                )
        );

        String role = request.role();

        if (role == null || role.isBlank()) {
            role = "ADMIN";
        }

        admin.setRole(
                role.toUpperCase()
        );

        admin.setActive(true);

        Admin savedAdmin =
                adminRepository.save(admin);

        auditLogService.log(
                "CREATE",
                "ADMIN",
                savedAdmin.getId(),
                "Administrator created: "
                        + savedAdmin.getUsername()
        );

        return toResponse(savedAdmin);
    }

    @Transactional(readOnly = true)
    public List<AdminResponse> getAllAdmins() {

        return adminRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AdminResponse activateAdmin(
            Long id
    ) {

        Admin admin =
                adminRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Admin not found with id: "
                                                + id
                                )
                        );

        if (!admin.getActive()) {

            admin.setActive(true);

            Admin savedAdmin =
                    adminRepository.save(admin);

            auditLogService.log(
                    "ACTIVATE",
                    "ADMIN",
                    savedAdmin.getId(),
                    "Administrator activated: "
                            + savedAdmin.getUsername()
            );

            return toResponse(savedAdmin);
        }

        return toResponse(admin);
    }

    @Transactional
    public AdminResponse deactivateAdmin(
            Long id
    ) {

        Admin admin =
                adminRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Admin not found with id: "
                                                + id
                                )
                        );

        /*
         * Only an active administrator can be deactivated.
         */
        if (!admin.getActive()) {
            return toResponse(admin);
        }

        /*
         * Prevent an administrator from deactivating
         * their own currently logged-in account.
         */
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getName() != null
                && authentication.getName()
                .equalsIgnoreCase(
                        admin.getUsername()
                )) {

            throw new IllegalStateException(
                    "You cannot deactivate your own administrator account"
            );
        }

        /*
         * Never allow the system to have zero active
         * administrators.
         */
        long activeAdminCount =
                adminRepository.countByActiveTrue();

        if (activeAdminCount <= 1) {

            throw new IllegalStateException(
                    "At least one active administrator must remain in the system"
            );
        }

        admin.setActive(false);

        Admin savedAdmin =
                adminRepository.save(admin);

        auditLogService.log(
                "DEACTIVATE",
                "ADMIN",
                savedAdmin.getId(),
                "Administrator deactivated: "
                        + savedAdmin.getUsername()
        );

        return toResponse(savedAdmin);
    }

    /**
     * Validates administrator password strength.
     *
     * Requirements:
     * - At least 8 characters
     * - At least one lowercase letter
     * - At least one uppercase letter
     * - At least one number
     * - At least one special character
     */
    private void validatePassword(
            String password
    ) {

        if (password == null || password.isBlank()) {

            throw new IllegalArgumentException(
                    "Password is required"
            );
        }

        if (!PASSWORD_PATTERN.matcher(password).matches()) {

            throw new IllegalArgumentException(
                    "Password must be at least 8 characters long and contain "
                            + "at least one uppercase letter, one lowercase letter, "
                            + "one number, and one special character"
            );
        }
    }

    private AdminResponse toResponse(
            Admin admin
    ) {

        return new AdminResponse(
                admin.getId(),
                admin.getName(),
                admin.getUsername(),
                admin.getRole(),
                admin.getActive(),
                admin.getCreatedAt(),
                admin.getUpdatedAt(),
                admin.getLastLoginAt()
        );
    }
}
