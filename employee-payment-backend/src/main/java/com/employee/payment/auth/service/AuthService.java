package com.employee.payment.auth.service;

import com.employee.payment.admin.entity.Admin;
import com.employee.payment.admin.repository.AdminRepository;
import com.employee.payment.audit.service.AuditLogService;
import com.employee.payment.auth.dto.LoginRequest;
import com.employee.payment.auth.dto.LoginResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

@Service
public class AuthService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;

    public AuthService(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuditLogService auditLogService) {

        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {

        Admin admin = adminRepository
                .findByUsernameIgnoreCase(request.username())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid username or password"
                        )
                );

        if (!Boolean.TRUE.equals(admin.getActive())) {
            throw new IllegalArgumentException(
                    "Admin account is inactive"
            );
        }

        if (!passwordEncoder.matches(
                request.password(),
                admin.getPasswordHash())) {

            throw new IllegalArgumentException(
                    "Invalid username or password"
            );
        }

        admin.setLastLoginAt(LocalDateTime.now());
        Admin savedAdmin = adminRepository.save(admin);

        /*
         * Record successful login.
         *
         * Login happens before the JWT security context is established,
         * so we explicitly provide the authenticated administrator.
         */
        auditLogService.logForAdmin(
                savedAdmin,
                "LOGIN",
                "ADMIN",
                savedAdmin.getId(),
                "Administrator logged in: "
                        + savedAdmin.getUsername()
        );

        /*
         * JWT needs UserDetails.
         * We create a simple Spring Security user
         * using the authenticated admin's information.
         */
        org.springframework.security.core.userdetails.User user =
                new org.springframework.security.core.userdetails.User(
                        savedAdmin.getUsername(),
                        savedAdmin.getPasswordHash(),
                        savedAdmin.getActive(),
                        true,
                        true,
                        true,
                        Collections.singletonList(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                        "ROLE_" + savedAdmin.getRole()
                                )
                        )
                );

        String token = jwtService.generateToken(user);

        return new LoginResponse(
                token,
                "Login successful",
                savedAdmin.getId(),
                savedAdmin.getName(),
                savedAdmin.getUsername(),
                savedAdmin.getRole()
        );
    }
}