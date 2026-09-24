package com.employee.payment.admin.initializer;

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

        /*
         * Initial administrator account.
         *
         * The password should be changed after first login.
         * Do not print credentials to application logs.
         */
        admin.setPasswordHash(
                passwordEncoder.encode("Admin@123")
        );

        admin.setRole("SYSTEM_ADMIN");
        admin.setActive(true);

        adminRepository.save(admin);
    }
}