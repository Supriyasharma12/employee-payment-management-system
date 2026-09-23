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

    public byte[] export(List<PaymentSummaryResponse> payments) throws IOException {

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Payment Summary");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);

            headerStyle.setFont(headerFont);

            // Amount style
            CellStyle amountStyle = workbook.createCellStyle();

            amountStyle.setDataFormat(
                    workbook.createDataFormat()
                            .getFormat("#,##0.00")
            );

            // Headers
            String[] headers = {
                    "Payment ID",
                    "Employee Code",
                    "Employee Name",
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

            // Data
            int rowNumber = 1;

            for (PaymentSummaryResponse payment : payments) {

                Row row = sheet.createRow(rowNumber++);

                row.createCell(0)
                        .setCellValue(payment.paymentId());

                row.createCell(1)
                        .setCellValue(payment.employeeCode());

                row.createCell(2)
                        .setCellValue(payment.employeeName());

                createAmountCell(row, 3, payment.runningTa(), amountStyle);
                createAmountCell(row, 4, payment.fixedTa(), amountStyle);
                createAmountCell(row, 5, payment.other(), amountStyle);
                createAmountCell(row, 6, payment.grossTotal(), amountStyle);
                createAmountCell(row, 7, payment.miscellaneous(), amountStyle);
                createAmountCell(row, 8, payment.advanceTa(), amountStyle);
                createAmountCell(row, 9, payment.advanceOther(), amountStyle);
                createAmountCell(row, 10, payment.deductionTotal(), amountStyle);
                createAmountCell(row, 11, payment.netPayment(), amountStyle);

                row.createCell(12)
                        .setCellValue(payment.status());
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }

    private void createAmountCell(
            Row row,
            int column,
            BigDecimal value,
            CellStyle style) {

        Cell cell = row.createCell(column);

        if (value != null) {
            cell.setCellValue(value.doubleValue());
        } else {
            cell.setCellValue(0.00);
        }

        cell.setCellStyle(style);
    }
}