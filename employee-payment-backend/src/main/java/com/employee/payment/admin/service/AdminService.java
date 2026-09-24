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

    private static final String SYSTEM_ADMIN_ROLE = "SYSTEM_ADMIN";
    private static final String ADMIN_ROLE = "ADMIN";

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
            AuditLogService auditLogService) {

        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AdminResponse createAdmin(AdminCreateRequest request) {

        Admin currentAdmin = requireSystemAdmin();

        if (!PASSWORD_PATTERN.matcher(request.password()).matches()) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters, " +
                            "including uppercase, lowercase, digit and special character"
            );
        }

        if (adminRepository.existsByUsernameIgnoreCase(
                request.username())) {

            throw new IllegalArgumentException(
                    "Username already exists"
            );
        }

        Admin admin = new Admin();

        admin.setName(request.name());
        admin.setUsername(request.username());

        admin.setPasswordHash(
                passwordEncoder.encode(request.password())
        );

        /*
         * New administrators are always normal ADMIN users.
         *
         * SYSTEM_ADMIN access is intentionally not assignable
         * through the normal admin-creation API.
         */
        admin.setRole(ADMIN_ROLE);
        admin.setActive(true);

        Admin savedAdmin = adminRepository.save(admin);

        auditLogService.logForAdmin(
                currentAdmin,
                "CREATE",
                "ADMIN",
                savedAdmin.getId(),
                "Created administrator: "
                        + savedAdmin.getUsername()
        );

        return toResponse(savedAdmin);
    }

    @Transactional(readOnly = true)
    public List<AdminResponse> getAllAdmins() {

        requireSystemAdmin();

        return adminRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AdminResponse activateAdmin(Long id) {

        Admin currentAdmin = requireSystemAdmin();

        Admin admin = adminRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Admin not found"
                        )
                );

        if (SYSTEM_ADMIN_ROLE.equals(admin.getRole())) {
            throw new IllegalArgumentException(
                    "The system administrator account cannot be activated or deactivated"
            );
        }

        admin.setActive(true);

        Admin savedAdmin = adminRepository.save(admin);

        auditLogService.logForAdmin(
                currentAdmin,
                "ACTIVATE",
                "ADMIN",
                savedAdmin.getId(),
                "Activated administrator: "
                        + savedAdmin.getUsername()
        );

        return toResponse(savedAdmin);
    }

    @Transactional
    public AdminResponse deactivateAdmin(Long id) {

        Admin currentAdmin = requireSystemAdmin();

        Admin admin = adminRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Admin not found"
                        )
                );

        /*
         * The SYSTEM_ADMIN account is protected.
         */
        if (SYSTEM_ADMIN_ROLE.equals(admin.getRole())) {
            throw new IllegalArgumentException(
                    "The system administrator account cannot be activated or deactivated"
            );
        }

        /*
         * Prevent the currently logged-in administrator
         * from disabling their own account.
         */
        if (admin.getId().equals(currentAdmin.getId())) {
            throw new IllegalArgumentException(
                    "You cannot deactivate your own account"
            );
        }

        /*
         * Always keep at least one active administrator.
         */
        long activeAdminCount =
                adminRepository.countByActiveTrue();

        if (activeAdminCount <= 1) {
            throw new IllegalArgumentException(
                    "At least one active administrator must remain"
            );
        }

        admin.setActive(false);

        Admin savedAdmin = adminRepository.save(admin);

        auditLogService.logForAdmin(
                currentAdmin,
                "DEACTIVATE",
                "ADMIN",
                savedAdmin.getId(),
                "Deactivated administrator: "
                        + savedAdmin.getUsername()
        );

        return toResponse(savedAdmin);
    }

    private Admin requireSystemAdmin() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            throw new IllegalStateException(
                    "Authentication required"
            );
        }

        boolean isSystemAdmin =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_SYSTEM_ADMIN".equals(
                                        authority.getAuthority()
                                )
                        );

        if (!isSystemAdmin) {
            throw new SecurityException(
                    "Only the system administrator can manage administrators"
            );
        }

        String username = authentication.getName();

        return adminRepository
                .findByUsernameIgnoreCase(username)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated administrator not found"
                        )
                );
    }

    private AdminResponse toResponse(Admin admin) {

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