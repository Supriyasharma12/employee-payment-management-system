# Employee Payment Management System

A full-stack web application for managing employee master data, payment processing, payment summaries, payment advice, administration, and audit logging.

## Overview

The Employee Payment Management System is designed to simplify and organize employee payment processing for organizations.

The system provides:

- Employee Master Management
- Employee Category Management
- Bank Master Management
- Payment Period Management
- Payment Entry and Calculation
- Payment Approval Workflow
- Payment Summary
- Payment Advice
- Excel Export
- Printing
- Admin/User Management
- Audit Logs
- JWT-based Authentication
- Role-based access control
- PostgreSQL database with Flyway migrations

The application is designed to support a growing number of employees and administrators without hard-coding organizational limits.

---

## Features

### Authentication

- Secure administrator login
- JWT-based authentication
- Protected REST APIs
- Active/inactive administrator accounts
- Password hashing
- Custom authentication error handling

### Employee Master

Administrators can manage employee information including:

- Employee Code
- Employee Name
- Bank Account Number
- IFSC Code
- Position
- Phone Number
- Email
- Grade Pay
- Scale
- Headquarters
- Designation
- Employee Category
- Bank

Employees can be activated or deactivated instead of being permanently deleted.

### Bank Master

Bank information is maintained as configurable master data rather than being hard-coded into the payment logic.

### Payment Periods

Administrators can create and manage payment periods based on month and year.

### Payment Processing

Payment calculations include:

**Gross Total**

`Running TA + Fixed TA + Other`

**Deduction Total**

`Miscellaneous + Advance TA + Advance Other`

**Net Payment**

`Gross Total - Deduction Total`

The backend performs the authoritative financial calculation using `BigDecimal`.

Negative monetary values are not permitted.

Negative net payments cannot be saved, updated, or approved.

### Payment Approval Workflow

The payment lifecycle is:

```text
PENDING
   ↓
DRAFT
   ↓
APPROVED

---

## Payment Summary

The Payment Summary allows administrators to view and filter payment records by:

- Payment Period
- Employee Code
- Employee Name
- Employee Category
- Bank

Payment summaries can be:

- Viewed in the application
- Filtered and searched
- Exported to Excel
- Printed

---

## Payment Advice

Payment Advice is generated for approved payments.

It includes:

- Employee Code
- Employee Name
- Bank
- Account Number
- IFSC Code
- Employee Category
- Payment Period
- Net Payment

Payment Advice can be filtered, exported to Excel, and printed.

---

## Admin Management

The system supports multiple administrators without a fixed administrator limit.

Administrators can:

- Add administrators
- View administrators
- Activate administrators
- Deactivate administrators

The system prevents the last active administrator from being deactivated.

---

## Audit Logs

Important actions performed in the system are recorded in audit logs.

The system records actions such as:

- CREATE
- UPDATE
- APPROVE

Audit logs can be searched and filtered.

---

## Project Structure

```text
employee-payment-system/
│
├── employee-payment-backend/
│
├── employee-payment-frontend/
│
├── .gitignore
│
└── README.md

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Axios
- React Router

### Backend
- Java 25
- Spring Boot
- Spring Security
- JWT Authentication
- Spring Data JPA
- Hibernate
- Maven

### Database
- PostgreSQL
- Flyway

### Other
- Apache POI — Excel export
- REST APIs
- Git & GitHub