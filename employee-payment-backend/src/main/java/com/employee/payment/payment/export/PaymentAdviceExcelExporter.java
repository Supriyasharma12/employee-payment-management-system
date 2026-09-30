package com.employee.payment.payment.export;

import com.employee.payment.payment.dto.PaymentAdviceResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@Component
public class PaymentAdviceExcelExporter {

    public byte[] export(List<PaymentAdviceResponse> payments)
            throws IOException {

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream =
                     new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Payment Advice");

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
            // CURRENCY STYLE
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
                    "Period",
                    "Bank Name",
                    "Account Number",
                    "IFSC Code",
                    "Category",
                    "Net Payment"
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

            for (PaymentAdviceResponse payment : payments) {

                Row row =
                        sheet.createRow(rowNumber++);

                // -----------------------------------------------------
                // Employee Code
                // -----------------------------------------------------

                row.createCell(0).setCellValue(
                        payment.employeeCode() != null
                                ? payment.employeeCode()
                                : ""
                );

                // -----------------------------------------------------
                // Employee Name
                // -----------------------------------------------------

                row.createCell(1).setCellValue(
                        payment.employeeName() != null
                                ? payment.employeeName()
                                : ""
                );

                // -----------------------------------------------------
                // PAN
                // -----------------------------------------------------

                row.createCell(2).setCellValue(
                        payment.panNumber() != null
                                ? payment.panNumber()
                                : ""
                );

                // -----------------------------------------------------
                // Period
                // -----------------------------------------------------

                String period =
                        String.format(
                                "%02d/%d",
                                payment.month(),
                                payment.year()
                        );

                row.createCell(3).setCellValue(period);

                // -----------------------------------------------------
                // Bank Name
                // -----------------------------------------------------

                row.createCell(4).setCellValue(
                        payment.bankName() != null
                                ? payment.bankName()
                                : ""
                );

                // -----------------------------------------------------
                // Account Number
                // -----------------------------------------------------
                // Keep this as text so that leading zeros are preserved.

                Cell accountNumberCell =
                        row.createCell(5);

                accountNumberCell.setCellValue(
                        payment.accountNumber() != null
                                ? payment.accountNumber()
                                : ""
                );

                // -----------------------------------------------------
                // IFSC Code
                // -----------------------------------------------------

                Cell ifscCell =
                        row.createCell(6);

                ifscCell.setCellValue(
                        payment.ifscCode() != null
                                ? payment.ifscCode()
                                : ""
                );

                // -----------------------------------------------------
                // Category
                // -----------------------------------------------------

                row.createCell(7).setCellValue(
                        payment.categoryName() != null
                                ? payment.categoryName()
                                : ""
                );

                // -----------------------------------------------------
                // Net Payment
                // -----------------------------------------------------

                Cell netPaymentCell =
                        row.createCell(8);

                BigDecimal netPayment =
                        payment.netPayment();

                if (netPayment != null) {

                    netPaymentCell.setCellValue(
                            netPayment.doubleValue()
                    );

                } else {

                    netPaymentCell.setCellValue(0.00);
                }

                netPaymentCell.setCellStyle(
                        amountStyle
                );
            }

            // ---------------------------------------------------------
            // AUTO-SIZE COLUMNS
            // ---------------------------------------------------------

            for (int i = 0;
                 i < headers.length;
                 i++) {

                sheet.autoSizeColumn(i);
            }

            // ---------------------------------------------------------
            // WRITE EXCEL FILE
            // ---------------------------------------------------------

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }
}