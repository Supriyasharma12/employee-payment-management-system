package com.employee.payment.employee.export;

import com.employee.payment.employee.dto.EmployeeResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@Component
public class EmployeeExcelExporter {

    public byte[] export(List<EmployeeResponse> employees)
            throws IOException {

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream =
                     new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Employee Master");

            // ---------------------------------------------------------
            // HEADER STYLE
            // ---------------------------------------------------------

            CellStyle headerStyle =
                    workbook.createCellStyle();

            Font headerFont =
                    workbook.createFont();

            headerFont.setBold(true);

            headerStyle.setFont(headerFont);

            // ---------------------------------------------------------
            // AMOUNT STYLE
            // ---------------------------------------------------------

            CellStyle amountStyle =
                    workbook.createCellStyle();

            amountStyle.setDataFormat(
                    workbook
                            .createDataFormat()
                            .getFormat("#,##0.00")
            );

            // ---------------------------------------------------------
            // HEADER ROW
            // ---------------------------------------------------------

            Row header = sheet.createRow(0);

            String[] headers = {
                    "Employee Code",
                    "Employee Name",
                    "PAN",
                    "Department",
                    "Designation",
                    "Medical Card ID (UHID)",
                    "UAN",
                    "Aadhaar",
                    "Date of Birth",
                    "Date of Joining",
                    "Bank Account Number",
                    "IFSC Code",
                    "Phone Number",
                    "Email",
                    "Grade Pay",
                    "Scale",
                    "Headquarters",
                    "Employee Category",
                    "Bank",
                    "Status"
            };

            for (int i = 0; i < headers.length; i++) {

                Cell cell = header.createCell(i);

                cell.setCellValue(headers[i]);

                cell.setCellStyle(headerStyle);
            }

            // ---------------------------------------------------------
            // DATA ROWS
            // ---------------------------------------------------------

            int rowNumber = 1;

            for (EmployeeResponse employee : employees) {

                Row row =
                        sheet.createRow(rowNumber++);

                // -----------------------------------------------------
                // Employee Code
                // -----------------------------------------------------

                row.createCell(0).setCellValue(
                        employee.employeeCode() != null
                                ? employee.employeeCode()
                                : ""
                );

                // -----------------------------------------------------
                // Employee Name
                // -----------------------------------------------------

                row.createCell(1).setCellValue(
                        employee.name() != null
                                ? employee.name()
                                : ""
                );

                // -----------------------------------------------------
                // PAN
                // -----------------------------------------------------

                row.createCell(2).setCellValue(
                        employee.panNumber() != null
                                ? employee.panNumber()
                                : ""
                );

                // -----------------------------------------------------
                // Department
                // -----------------------------------------------------

                row.createCell(3).setCellValue(
                        employee.department() != null
                                ? employee.department()
                                : ""
                );

                // -----------------------------------------------------
                // Designation
                // -----------------------------------------------------

                row.createCell(4).setCellValue(
                        employee.designation() != null
                                ? employee.designation()
                                : ""
                );

                // -----------------------------------------------------
                // Medical Card ID / UHID
                // -----------------------------------------------------

                row.createCell(5).setCellValue(
                        employee.medicalCardId() != null
                                ? employee.medicalCardId()
                                : ""
                );

                // -----------------------------------------------------
                // UAN
                // -----------------------------------------------------

                row.createCell(6).setCellValue(
                        employee.uan() != null
                                ? employee.uan()
                                : ""
                );

                // -----------------------------------------------------
                // Aadhaar
                // -----------------------------------------------------

                row.createCell(7).setCellValue(
                        employee.aadhaar() != null
                                ? employee.aadhaar()
                                : ""
                );

                // -----------------------------------------------------
                // Date of Birth
                // -----------------------------------------------------

                row.createCell(8).setCellValue(
                        employee.dateOfBirth() != null
                                ? employee.dateOfBirth().toString()
                                : ""
                );

                // -----------------------------------------------------
                // Date of Joining
                // -----------------------------------------------------

                row.createCell(9).setCellValue(
                        employee.dateOfJoining() != null
                                ? employee.dateOfJoining().toString()
                                : ""
                );

                // -----------------------------------------------------
                // Bank Account Number
                // -----------------------------------------------------
                // Keep this as text so leading zeros are preserved.

                Cell accountNumberCell =
                        row.createCell(10);

                accountNumberCell.setCellValue(
                        employee.accountNumber() != null
                                ? employee.accountNumber()
                                : ""
                );

                // -----------------------------------------------------
                // IFSC Code
                // -----------------------------------------------------

                Cell ifscCell =
                        row.createCell(11);

                ifscCell.setCellValue(
                        employee.ifscCode() != null
                                ? employee.ifscCode()
                                : ""
                );

                // -----------------------------------------------------
                // Phone Number
                // -----------------------------------------------------

                row.createCell(12).setCellValue(
                        employee.phoneNumber() != null
                                ? employee.phoneNumber()
                                : ""
                );

                // -----------------------------------------------------
                // Email
                // -----------------------------------------------------

                row.createCell(13).setCellValue(
                        employee.email() != null
                                ? employee.email()
                                : ""
                );

                // -----------------------------------------------------
                // Grade Pay
                // -----------------------------------------------------

                Cell gradePayCell =
                        row.createCell(14);

                BigDecimal gradePay =
                        employee.gradePay();

                if (gradePay != null) {

                    gradePayCell.setCellValue(
                            gradePay.doubleValue()
                    );

                } else {

                    gradePayCell.setCellValue(0.00);
                }

                gradePayCell.setCellStyle(amountStyle);

                // -----------------------------------------------------
                // Scale
                // -----------------------------------------------------

                row.createCell(15).setCellValue(
                        employee.scale() != null
                                ? employee.scale()
                                : ""
                );

                // -----------------------------------------------------
                // Headquarters
                // -----------------------------------------------------

                row.createCell(16).setCellValue(
                        employee.headquarters() != null
                                ? employee.headquarters()
                                : ""
                );

                // -----------------------------------------------------
                // Employee Category
                // -----------------------------------------------------

                row.createCell(17).setCellValue(
                        employee.categoryName() != null
                                ? employee.categoryName()
                                : ""
                );

                // -----------------------------------------------------
                // Bank
                // -----------------------------------------------------

                row.createCell(18).setCellValue(
                        employee.bankName() != null
                                ? employee.bankName()
                                : ""
                );

                // -----------------------------------------------------
                // Status
                // -----------------------------------------------------

                row.createCell(19).setCellValue(
                        Boolean.TRUE.equals(employee.active())
                                ? "Active"
                                : "Inactive"
                );
            }

            // ---------------------------------------------------------
            // AUTO-SIZE COLUMNS
            // ---------------------------------------------------------

            for (int i = 0;
                 i < headers.length;
                 i++) {

                sheet.autoSizeColumn(i);

                // Prevent extremely wide columns.
                if (sheet.getColumnWidth(i) > 10000) {
                    sheet.setColumnWidth(i, 10000);
                }
            }

            // ---------------------------------------------------------
            // FREEZE HEADER ROW
            // ---------------------------------------------------------

            sheet.createFreezePane(0, 1);

            // ---------------------------------------------------------
            // WRITE EXCEL FILE
            // ---------------------------------------------------------

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }
}