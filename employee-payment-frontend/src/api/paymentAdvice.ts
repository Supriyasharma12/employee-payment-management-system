import apiClient from "./client"

// ------------------------------------------
// Payment Advice Response
// ------------------------------------------

export interface PaymentAdvice {
    paymentId: number

    employeeCode: string
    employeeName: string

    bankName: string | null
    accountNumber: string
    ifscCode: string

    categoryName: string

    month: number
    year: number

    netPayment: number

    status: string
}

// ------------------------------------------
// Paginated Response
// ------------------------------------------

export interface PaymentAdvicePage {
    content: PaymentAdvice[]
    totalElements: number
    totalPages: number
    number: number
    size: number
    first: boolean
    last: boolean
}

// ------------------------------------------
// Get Payment Advice
// ------------------------------------------

export const getPaymentAdvice = async (
    page = 0,
    size = 10,
    filters?: {
        paymentPeriodId?: number
        employeeId?: number
        categoryId?: number
        bankId?: number
        employeeCode?: string
        employeeName?: string
    },
): Promise<PaymentAdvicePage> => {
    const params = new URLSearchParams()

    params.set("page", String(page))
    params.set("size", String(size))

    if (filters?.paymentPeriodId) {
        params.set(
            "paymentPeriodId",
            String(filters.paymentPeriodId),
        )
    }

    if (filters?.employeeId) {
        params.set(
            "employeeId",
            String(filters.employeeId),
        )
    }

    if (filters?.categoryId) {
        params.set(
            "categoryId",
            String(filters.categoryId),
        )
    }

    if (filters?.bankId) {
        params.set(
            "bankId",
            String(filters.bankId),
        )
    }

    if (filters?.employeeCode?.trim()) {
        params.set(
            "employeeCode",
            filters.employeeCode.trim(),
        )
    }

    if (filters?.employeeName?.trim()) {
        params.set(
            "employeeName",
            filters.employeeName.trim(),
        )
    }

    const response =
        await apiClient.get<PaymentAdvicePage>(
            `/payments/advice?${params.toString()}`,
        )

    return response.data
}

// ------------------------------------------
// Export Payment Advice
// ------------------------------------------

export const exportPaymentAdvice = async (
    filters?: {
        paymentPeriodId?: number
        employeeId?: number
        categoryId?: number
        bankId?: number
        employeeCode?: string
        employeeName?: string
    },
): Promise<Blob> => {
    const params = new URLSearchParams()

    if (filters?.paymentPeriodId) {
        params.set(
            "paymentPeriodId",
            String(filters.paymentPeriodId),
        )
    }

    if (filters?.employeeId) {
        params.set(
            "employeeId",
            String(filters.employeeId),
        )
    }

    if (filters?.categoryId) {
        params.set(
            "categoryId",
            String(filters.categoryId),
        )
    }

    if (filters?.bankId) {
        params.set(
            "bankId",
            String(filters.bankId),
        )
    }

    if (filters?.employeeCode?.trim()) {
        params.set(
            "employeeCode",
            filters.employeeCode.trim(),
        )
    }

    if (filters?.employeeName?.trim()) {
        params.set(
            "employeeName",
            filters.employeeName.trim(),
        )
    }

    const response = await apiClient.get(
        `/payments/advice/export?${params.toString()}`,
        {
            responseType: "blob",
        },
    )

    return response.data
}