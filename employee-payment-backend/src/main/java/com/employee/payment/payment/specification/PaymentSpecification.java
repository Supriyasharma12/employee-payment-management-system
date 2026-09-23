//package com.employee.payment.payment.specification;
//
//import com.employee.payment.payment.entity.Payment;
//import org.springframework.data.jpa.domain.Specification;
//
//public class PaymentSpecification {
//
//    private PaymentSpecification() {
//    }
//
//    public static Specification<Payment> hasPaymentPeriod(
//            Long paymentPeriodId) {
//
//        return (root, query, criteriaBuilder) ->
//                paymentPeriodId == null
//                        ? null
//                        : criteriaBuilder.equal(
//                        root.get("paymentPeriod").get("id"),
//                        paymentPeriodId
//                );
//    }
//
//    public static Specification<Payment> hasEmployee(
//            Long employeeId) {
//
//        return (root, query, criteriaBuilder) ->
//                employeeId == null
//                        ? null
//                        : criteriaBuilder.equal(
//                        root.get("employee").get("id"),
//                        employeeId
//                );
//    }
//
//    public static Specification<Payment> hasCategory(
//            Long categoryId) {
//
//        return (root, query, criteriaBuilder) ->
//                categoryId == null
//                        ? null
//                        : criteriaBuilder.equal(
//                        root.get("employee")
//                                .get("category")
//                                .get("id"),
//                        categoryId
//                );
//    }
//
//
//    public static Specification<Payment> employeeCodeContains(
//            String employeeCode) {
//
//        return (root, query, criteriaBuilder) ->
//                employeeCode == null || employeeCode.isBlank()
//                        ? null
//                        : criteriaBuilder.like(
//                        criteriaBuilder.lower(
//                                root.get("employee")
//                                        .get("employeeCode")
//                        ),
//                        "%" + employeeCode.toLowerCase() + "%"
//                );
//    }
//
//    public static Specification<Payment> employeeNameContains(
//            String employeeName) {
//
//        return (root, query, criteriaBuilder) ->
//                employeeName == null || employeeName.isBlank()
//                        ? null
//                        : criteriaBuilder.like(
//                        criteriaBuilder.lower(
//                                root.get("employee").get("name")
//                        ),
//                        "%" + employeeName.toLowerCase() + "%"
//                );
//    }
//}


package com.employee.payment.payment.specification;

import com.employee.payment.payment.entity.Payment;
import org.springframework.data.jpa.domain.Specification;

public class PaymentSpecification {

    private PaymentSpecification() {
    }

    // Filter by Payment Period
    public static Specification<Payment> hasPaymentPeriod(
            Long paymentPeriodId) {

        return (root, query, criteriaBuilder) ->
                paymentPeriodId == null
                        ? null
                        : criteriaBuilder.equal(
                        root.get("paymentPeriod").get("id"),
                        paymentPeriodId
                );
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
}