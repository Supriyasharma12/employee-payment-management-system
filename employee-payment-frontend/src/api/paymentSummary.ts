import apiClient from "./client"

// ------------------------------------------
// Payment Summary Record
// ------------------------------------------

export interface PaymentSummary {
    paymentId: number
    id: number

    employeeId: number

    employeeCode: string
    employeeName: string

    paymentPeriodId?: number
    month?: number
    year?: number

    paymentDate?: string

    runningTa: number
    fixedTa: number
    other: number
    grossTotal: number

    miscellaneous: number
    advanceTa: number
    advanceOther: number
    deductionTotal: number

    netPayment: number

    status: string

    createdAt?: string
    updatedAt?: string
}

// ------------------------------------------
// Pageable Response
// ------------------------------------------

export interface PaymentSummaryPage {
    content: PaymentSummary[]

    totalElements: number
    totalPages: number

    size: number
    number: number

    first: boolean
    last: boolean
}

// ------------------------------------------
// Filters
// ------------------------------------------

export interface PaymentSummaryFilters {
    paymentPeriodId?: number
    employeeId?: number
    bankId?: number
    categoryId?: number

    employeeCode?: string
    employeeName?: string
}

// ------------------------------------------
// Get Payment Summary
//
// Supports the format currently used by
// PaymentSummary.tsx:
//
// getPaymentSummary(
//     page,
//     pageSize,
//     filters
// )
// ------------------------------------------

export const getPaymentSummary = async (
    page = 0,
    size = 10,
    filters: PaymentSummaryFilters = {},
): Promise<PaymentSummaryPage> => {

    const params: Record<string, string | number> = {
        page,
        size,
    }

    if (filters.paymentPeriodId !== undefined) {
        params.paymentPeriodId =
            filters.paymentPeriodId
    }

    if (filters.employeeId !== undefined) {
        params.employeeId =
            filters.employeeId
    }

    if (filters.bankId !== undefined) {
        params.bankId =
            filters.bankId
    }

    if (filters.categoryId !== undefined) {
        params.categoryId =
            filters.categoryId
    }

    if (filters.employeeCode?.trim()) {
        params.employeeCode =
            filters.employeeCode.trim()
    }

    if (filters.employeeName?.trim()) {
        params.employeeName =
            filters.employeeName.trim()
    }

    const response =
        await apiClient.get<PaymentSummaryPage>(
            "/payments/summary",
            {
                params,
            },
        )

    return {
        ...response.data,

        content: (response.data.content ?? []).map(
            (payment) => ({
                ...payment,

                id:
                    payment.id ??
                    payment.paymentId,

                paymentId:
                    payment.paymentId ??
                    payment.id,
            }),
        ),
    }
}

// ------------------------------------------
// Export Payment Summary
// ------------------------------------------

export const exportPaymentSummary = async (
    filters: PaymentSummaryFilters = {},
): Promise<Blob> => {

    const params: Record<string, string | number> = {}

    if (filters.paymentPeriodId !== undefined) {
        params.paymentPeriodId =
            filters.paymentPeriodId
    }

    if (filters.employeeId !== undefined) {
        params.employeeId =
            filters.employeeId
    }

    if (filters.bankId !== undefined) {
        params.bankId =
            filters.bankId
    }

    if (filters.categoryId !== undefined) {
        params.categoryId =
            filters.categoryId
    }

    if (filters.employeeCode?.trim()) {
        params.employeeCode =
            filters.employeeCode.trim()
    }

    if (filters.employeeName?.trim()) {
        params.employeeName =
            filters.employeeName.trim()
    }

    const response =
        await apiClient.get<Blob>(
            "/payments/summary/export",
            {
                params,
                responseType: "blob",
            },
        )

    return response.data
}