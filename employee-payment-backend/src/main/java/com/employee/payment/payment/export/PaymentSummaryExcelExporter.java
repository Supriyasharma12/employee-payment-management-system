package com.employee.payment.payment.export;

import com.employee.payment.payment.dto.PaymentSummaryResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

@Component
public class PaymentSummaryExcelExporter {

    public byte[] export(List<PaymentSummaryResponse> payments)
            throws IOException {

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream =
                     new ByteArrayOutputStream()) {

            Sheet sheet =
                    workbook.createSheet("Payment Summary");

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
            // HEADERS
            // ---------------------------------------------------------

            String[] headers = {
                    "Payment ID",
                    "Employee Code",
                    "Employee Name",
                    "PAN",
                    "Period",
                    "Running TA",
                    "Fixed TA",
                    "Other",
                    "Gross Total",
                    "Miscellaneous",
                    "Advance TA",
                    "Advance Other",
                    "Deduction Total",
                    "Net Payment",
                    "Status"
            };

            Row header = sheet.createRow(0);

            for (int i = 0; i < headers.length; i++) {

                Cell cell = header.createCell(i);

                cell.setCellValue(headers[i]);

                cell.setCellStyle(headerStyle);
            }

            // ---------------------------------------------------------
            // DATA
            // ---------------------------------------------------------

            int rowNumber = 1;

            for (PaymentSummaryResponse payment : payments) {

                Row row =
                        sheet.createRow(rowNumber++);

                // Payment ID
                row.createCell(0)
                        .setCellValue(
                                payment.paymentId()
                        );

                // Employee Code
                row.createCell(1)
                        .setCellValue(
                                payment.employeeCode() != null
                                        ? payment.employeeCode()
                                        : ""
                        );

                // Employee Name
                row.createCell(2)
                        .setCellValue(
                                payment.employeeName() != null
                                        ? payment.employeeName()
                                        : ""
                        );

                // PAN
                row.createCell(3)
                        .setCellValue(
                                payment.panNumber() != null
                                        ? payment.panNumber()
                                        : ""
                        );

                // Period
                String period =
                        String.format(
                                "%02d/%d",
                                payment.month(),
                                payment.year()
                        );

                row.createCell(4)
                        .setCellValue(period);

                // Amount fields
                createAmountCell(
                        row,
                        5,
                        payment.runningTa(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        6,
                        payment.fixedTa(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        7,
                        payment.other(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        8,
                        payment.grossTotal(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        9,
                        payment.miscellaneous(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        10,
                        payment.advanceTa(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        11,
                        payment.advanceOther(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        12,
                        payment.deductionTotal(),
                        amountStyle
                );

                createAmountCell(
                        row,
                        13,
                        payment.netPayment(),
                        amountStyle
                );

                // Status
                row.createCell(14)
                        .setCellValue(
                                payment.status() != null
                                        ? payment.status()
                                        : ""
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
            // WRITE WORKBOOK
            // ---------------------------------------------------------

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }

    // -------------------------------------------------------------
    // AMOUNT CELL HELPER
    // -------------------------------------------------------------

    private void createAmountCell(
            Row row,
            int column,
            BigDecimal value,
            CellStyle style) {

        Cell cell =
                row.createCell(column);

        if (value != null) {

            cell.setCellValue(
                    value.doubleValue()
            );

        } else {

            cell.setCellValue(0.00);
        }

        cell.setCellStyle(style);
    }
}