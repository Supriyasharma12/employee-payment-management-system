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

    public byte[] export(List<PaymentAdviceResponse> payments) throws IOException {

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Payment Advice");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            // Currency style
            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.setDataFormat(
                    workbook.createDataFormat().getFormat("#,##0.00")
            );

            // Header row
            Row header = sheet.createRow(0);

            String[] headers = {
                    "Payment ID",
                    "Employee Code",
                    "Employee Name",
                    "Bank Name",
                    "Account Number",
                    "IFSC Code",
                    "Category",
                    "Month",
                    "Year",
                    "Net Payment",
                    "Status"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNumber = 1;

            for (PaymentAdviceResponse payment : payments) {

                Row row = sheet.createRow(rowNumber++);

                row.createCell(0).setCellValue(payment.paymentId());
                row.createCell(1).setCellValue(payment.employeeCode());
                row.createCell(2).setCellValue(payment.employeeName());
                row.createCell(3).setCellValue(
                        payment.bankName() != null ? payment.bankName() : ""
                );
                row.createCell(4).setCellValue(payment.accountNumber());
                row.createCell(5).setCellValue(payment.ifscCode());
                row.createCell(6).setCellValue(payment.categoryName());
                row.createCell(7).setCellValue(payment.month());
                row.createCell(8).setCellValue(payment.year());

                Cell netPaymentCell = row.createCell(9);

                BigDecimal netPayment = payment.netPayment();

                if (netPayment != null) {
                    netPaymentCell.setCellValue(netPayment.doubleValue());
                    netPaymentCell.setCellStyle(amountStyle);
                } else {
                    netPaymentCell.setCellValue(0.00);
                    netPaymentCell.setCellStyle(amountStyle);
                }

                row.createCell(10).setCellValue(payment.status());
            }

            // Automatically adjust column widths
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }
}