
import apiClient from "./client"

export interface PaymentAdvice {
    paymentId: number
    employeeCode: string
    employeeName: string
    panNumber: string
    bankName: string | null
    accountNumber: string
    ifscCode: string
    categoryName: string

    // Representative month/year for backward compatibility.
    month: number
    year: number

    taMonthsCovered?: string

    netPayment: number
    status: string
}

export interface PaymentAdvicePage {
    content: PaymentAdvice[]
    totalElements: number
    totalPages: number
    number: number
    size: number
    first: boolean
    last: boolean
}

export interface PaymentAdviceBatch {
    id: number
    batchName: string
    status: string
}

export interface PaymentAdviceFilters {
    paymentBatchId?: number
    paymentPeriodId?: number
    employeeId?: number
    categoryId?: number
    bankId?: number
    employeeCode?: string
    employeeName?: string
}

// Finalization request
export interface PaymentAdviceFinalizeRequest {
    paymentBatchId: number
    bankId: number
}

// Cancellation request
export interface PaymentAdviceCancelRequest {
    cancellationReason: string
}

// Response returned after finalization or cancellation
export interface PaymentAdviceFinalizationResult {
    id: number
    referenceNo: string
    paymentBatchId: number
    bankId: number
    bankName: string
    adviceDate: string
    status: string
    paymentCount: number
}

// Response returned when retrieving finalized advice
export interface PaymentAdviceFinalized {
    id: number
    referenceNo: string
    paymentBatchId: number
    bankId: number
    bankName: string
    adviceDate: string
    status: string
    cancellationReason: string | null
    payments: PaymentAdvice[]
}

export const getPaymentAdviceBatches = async (): Promise<
    PaymentAdviceBatch[]
> => {
    const response = await apiClient.get<PaymentAdviceBatch[]>(
        "/payment-batches",
    )

    return response.data
}

const buildPaymentAdviceParams = (
    filters?: PaymentAdviceFilters,
): URLSearchParams => {
    const params = new URLSearchParams()

    if (filters?.paymentBatchId !== undefined) {
        params.set("paymentBatchId", String(filters.paymentBatchId))
    }

    if (filters?.paymentPeriodId !== undefined) {
        params.set("paymentPeriodId", String(filters.paymentPeriodId))
    }

    if (filters?.employeeId !== undefined) {
        params.set("employeeId", String(filters.employeeId))
    }

    if (filters?.categoryId !== undefined) {
        params.set("categoryId", String(filters.categoryId))
    }

    if (filters?.bankId !== undefined) {
        params.set("bankId", String(filters.bankId))
    }

    if (filters?.employeeCode?.trim()) {
        params.set("employeeCode", filters.employeeCode.trim())
    }

    if (filters?.employeeName?.trim()) {
        params.set("employeeName", filters.employeeName.trim())
    }

    return params
}

// Existing preview API
export const getPaymentAdvice = async (
    page = 0,
    size = 10,
    filters?: PaymentAdviceFilters,
): Promise<PaymentAdvicePage> => {
    const params = buildPaymentAdviceParams(filters)

    params.set("page", String(page))
    params.set("size", String(size))

    const response = await apiClient.get<PaymentAdvicePage>(
        `/payments/advice?${params.toString()}`,
    )

    return response.data
}

// Existing Excel export API
export const exportPaymentAdvice = async (
    filters?: PaymentAdviceFilters,
): Promise<Blob> => {
    const params = buildPaymentAdviceParams(filters)

    const response = await apiClient.get<Blob>(
        `/payments/advice/export?${params.toString()}`,
        {
            responseType: "blob",
        },
    )

    return response.data
}

// Finalize Payment Advice
export const finalizePaymentAdvice = async (
    request: PaymentAdviceFinalizeRequest,
): Promise<PaymentAdviceFinalizationResult> => {
    const response = await apiClient.post<PaymentAdviceFinalizationResult>(
        "/payments/advice/finalize",
        request,
    )

    return response.data
}

// Cancel finalized Payment Advice
export const cancelPaymentAdvice = async (
    adviceId: number,
    request: PaymentAdviceCancelRequest,
): Promise<PaymentAdviceFinalizationResult> => {
    const response = await apiClient.post<PaymentAdviceFinalizationResult>(
        `/payments/advice/${adviceId}/cancel`,
        request,
    )

    return response.data
}

export const getFinalizedPaymentAdviceByBatchAndBank = async (
    paymentBatchId: number,
    bankId: number,
): Promise<PaymentAdviceFinalized | null> => {

    const response = await apiClient.get<PaymentAdviceFinalized | null>(
        "/payments/advice/finalized",
        {
            params: {
                paymentBatchId,
                bankId,
            },
            validateStatus: (status) =>
                status === 200 || status === 204,
        },
    )

    return response.status === 204 ? null : response.data
}


// Retrieve previously finalized Payment Advice
export const getFinalizedPaymentAdvice = async (
    adviceId: number,
): Promise<PaymentAdviceFinalized> => {
    const response = await apiClient.get<PaymentAdviceFinalized>(
        `/payments/advice/finalized/${adviceId}`,
    )

    return response.data
}
