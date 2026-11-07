

package com.employee.payment.payment.specification;

import com.employee.payment.payment.entity.Payment;
import org.springframework.data.jpa.domain.Specification;

public class PaymentSpecification {

    private PaymentSpecification() {
    }

    // Filter by Payment Period

    // Filter by Payment Period — supports V1 and V2
    public static Specification<Payment> hasPaymentPeriod(
            Long paymentPeriodId) {

        return (root, query, criteriaBuilder) -> {

            if (paymentPeriodId == null) {
                return null;
            }

            // V1: payment period is stored on the parent payment.
            var parentPeriodMatch = criteriaBuilder.and(
                    criteriaBuilder.isNotNull(root.get("paymentPeriod")),
                    criteriaBuilder.equal(
                            root.get("paymentPeriod").get("id"),
                            paymentPeriodId
                    )
            );

            // V2: payment period is stored in monthly details.
            var subquery = query.subquery(Long.class);
            var detail = subquery.from(
                    com.employee.payment.payment.entity.PaymentMonthlyDetail.class
            );

            subquery.select(detail.get("id"));

            subquery.where(
                    criteriaBuilder.equal(
                            detail.get("payment").get("id"),
                            root.get("id")
                    ),
                    criteriaBuilder.equal(
                            detail.get("paymentPeriod").get("id"),
                            paymentPeriodId
                    )
            );

            return criteriaBuilder.or(
                    parentPeriodMatch,
                    criteriaBuilder.exists(subquery)
            );
        };
    }


    // Filter by Employee ID
    public static Specification<Payment> hasEmployee(
            Long employeeId) {

        return (root, query, criteriaBuilder) ->
                employeeId == null
                        ? null
                        : criteriaBuilder.equal(
                        root.get("employee").get("id"),
                        employeeId
                );
    }

    // Filter by Employee Code
    public static Specification<Payment> employeeCodeContains(
            String employeeCode) {

        return (root, query, criteriaBuilder) ->
                employeeCode == null || employeeCode.isBlank()
                        ? null
                        : criteriaBuilder.like(
                        criteriaBuilder.lower(
                                root.get("employee")
                                        .get("employeeCode")
                        ),
                        "%" + employeeCode.toLowerCase() + "%"
                );
    }

    // Filter by Employee Name
    public static Specification<Payment> employeeNameContains(
            String employeeName) {

        return (root, query, criteriaBuilder) ->
                employeeName == null || employeeName.isBlank()
                        ? null
                        : criteriaBuilder.like(
                        criteriaBuilder.lower(
                                root.get("employee").get("name")
                        ),
                        "%" + employeeName.toLowerCase() + "%"
                );
    }

    // Filter by Employee Category
    public static Specification<Payment> hasCategory(
            Long categoryId) {

        return (root, query, criteriaBuilder) ->
                categoryId == null
                        ? null
                        : criteriaBuilder.equal(
                        root.get("employee")
                                .get("category")
                                .get("id"),
                        categoryId
                );
    }

    // Filter by Employee Bank
    public static Specification<Payment> hasBank(
            Long bankId) {

        return (root, query, criteriaBuilder) ->
                bankId == null
                        ? null
                        : criteriaBuilder.equal(
                        root.get("employee")
                                .get("bank")
                                .get("id"),
                        bankId
                );
    }


    // Exclude cancelled payments from the normal summary
    public static Specification<Payment> isNotCancelled() {

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.notEqual(
                        criteriaBuilder.upper(root.get("status")),
                        "CANCELLED"
                );
    }

}