package com.employee.payment.admin.config;

import com.employee.payment.admin.entity.Admin;
import com.employee.payment.admin.repository.AdminRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminDataInitializer implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDataInitializer(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder) {

        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        if (adminRepository.existsByUsernameIgnoreCase("admin")) {
            return;
        }

        Admin admin = new Admin();

        admin.setName("System Administrator");
        admin.setUsername("admin");
        admin.setPasswordHash(
                passwordEncoder.encode("Admin@123")
        );
        admin.setRole("ADMIN");
        admin.setActive(true);

        adminRepository.save(admin);

        System.out.println("======================================");
        System.out.println("Default admin created");
        System.out.println("Username: admin");
        System.out.println("Password: Admin@123");
        System.out.println("======================================");
    }
}