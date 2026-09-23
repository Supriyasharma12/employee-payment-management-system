import apiClient from "./client"

// ------------------------------------------
// Payment Period
// ------------------------------------------

export interface PaymentPeriod {
    id: number
    month: number
    year: number
    startDate: string
    endDate: string
    status: string
}

// ------------------------------------------
// Payment Create Request
// ------------------------------------------

export interface PaymentCreateRequest {
    employeeId: number
    paymentPeriodId: number
    paymentDate: string

    runningTa: number
    fixedTa: number
    other: number

    miscellaneous: number
    advanceTa: number
    advanceOther: number
}

// ------------------------------------------
// Payment Update Request
// ------------------------------------------

export interface PaymentUpdateRequest {
    paymentDate: string

    runningTa: number
    fixedTa: number
    other: number

    miscellaneous: number
    advanceTa: number
    advanceOther: number
}

// ------------------------------------------
// Payment Response
// ------------------------------------------

export interface PaymentResponse {
    id: number

    employeeId: number
    employeeCode: string
    employeeName: string

    paymentPeriodId: number
    month: number
    year: number

    paymentDate: string

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

    createdAt: string
    updatedAt: string
}

// ------------------------------------------
// Get Payment Periods
// ------------------------------------------

export const getPaymentPeriods = async (): Promise<
    PaymentPeriod[]
> => {
    const response = await apiClient.get<PaymentPeriod[]>(
        "/payment-periods",
    )

    return response.data
}

// ------------------------------------------
// Create Payment
// ------------------------------------------

export const createPayment = async (
    payment: PaymentCreateRequest,
): Promise<PaymentResponse> => {
    const response =
        await apiClient.post<PaymentResponse>(
            "/payments",
            payment,
        )

    return response.data
}

// ------------------------------------------
// Update Draft Payment
// ------------------------------------------

export const updatePayment = async (
    paymentId: number,
    payment: PaymentUpdateRequest,
): Promise<PaymentResponse> => {
    if (!paymentId) {
        throw new Error(
            "Payment ID is missing. Cannot update payment.",
        )
    }

    const response =
        await apiClient.put<PaymentResponse>(
            `/payments/${paymentId}`,
            payment,
        )

    return response.data
}

// ------------------------------------------
// Approve Draft Payment
// ------------------------------------------

export const approvePayment = async (
    paymentId: number,
): Promise<PaymentResponse> => {
    if (!paymentId) {
        throw new Error(
            "Payment ID is missing. Cannot approve payment.",
        )
    }

    const response =
        await apiClient.patch<PaymentResponse>(
            `/payments/${paymentId}/approve`,
        )

    return response.data
}