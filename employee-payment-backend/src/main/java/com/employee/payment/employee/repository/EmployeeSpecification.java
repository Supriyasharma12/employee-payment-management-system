package com.employee.payment.employee.repository;

import com.employee.payment.employee.entity.Employee;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class EmployeeSpecification {

    private EmployeeSpecification() {
    }

    public static Specification<Employee> withFilters(
            Long categoryId,
            Long bankId,
            String search
    ) {
        return (root, query, criteriaBuilder) -> {

            List<Predicate> predicates = new ArrayList<>();

            // Filter by employee category
            if (categoryId != null) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("category").get("id"),
                                categoryId
                        )
                );
            }

            // Filter by bank
            if (bankId != null) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("bank").get("id"),
                                bankId
                        )
                );
            }

            // Search by employee name or employee code
            if (search != null && !search.isBlank()) {

                String searchPattern =
                        "%" + search.trim().toLowerCase(Locale.ROOT) + "%";

                Predicate nameMatches =
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("name")),
                                searchPattern
                        );

                Predicate codeMatches =
                        criteriaBuilder.like(
                                criteriaBuilder.lower(
                                        root.get("employeeCode")
                                ),
                                searchPattern
                        );

                predicates.add(
                        criteriaBuilder.or(nameMatches, codeMatches)
                );
            }

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0])
            );
        };
    }
}