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
    paymentBatchId: number
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
    paymentBatchId: number | null


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

    monthlyDetails?: PaymentMonthlyDetailResponse[]
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



export interface PaymentMonthlyDetailRequest {
    paymentPeriodId: number

    runningTa: number
    fixedTa: number
    other: number

    miscellaneous: number
    advanceTa: number
    advanceOther: number
}

export interface PaymentMonthlyDetailResponse {
    id: number
    paymentPeriodId: number
    month: number
    year: number

    runningTa: number
    fixedTa: number
    other: number
    grossTotal: number

    miscellaneous: number
    advanceTa: number
    advanceOther: number
    deductionTotal: number

    netPayment: number
}

export interface MultiMonthPaymentCreateRequest {
    employeeId: number
    paymentBatchId: number
    paymentDate: string
    monthlyDetails: PaymentMonthlyDetailRequest[]
}

export interface MonthlyPaymentResult {
    paymentPeriodId: number
    month: number
    year: number
    status: string
    message: string
    netPayment: number
}

export interface MultiMonthPaymentCreateResponse {
    payment: PaymentResponse
    monthlyResults: MonthlyPaymentResult[]
    warnings: string[]
}

export const createMultiMonthPayment = async (
    request: MultiMonthPaymentCreateRequest,
): Promise<MultiMonthPaymentCreateResponse> => {
    const response =
        await apiClient.post<MultiMonthPaymentCreateResponse>(
            "/payments/multi-month",
            request,
        )

    return response.data
}


export interface EligiblePaymentPeriod {
    id: number
    month: number
    year: number
    status: string
    eligible: boolean
    reason: string | null
}


export interface MultiMonthPaymentUpdateRequest {
    paymentDate: string
    monthlyDetails: PaymentMonthlyDetailRequest[]
}

export const updateMultiMonthPayment = async (
    paymentId: number,
    request: MultiMonthPaymentUpdateRequest,
): Promise<MultiMonthPaymentCreateResponse> => {
    if (!paymentId) {
        throw new Error(
            "Payment ID is missing. Cannot update multi-month payment.",
        )
    }

    const response =
        await apiClient.put<MultiMonthPaymentCreateResponse>(
            `/payments/multi-month/${paymentId}`,
            request,
        )

    return response.data
}


export const getPaymentById = async (
    paymentId: number,
): Promise<PaymentResponse> => {
    if (!paymentId) {
        throw new Error(
            "Payment ID is missing. Cannot load payment.",
        )
    }

    const response = await apiClient.get<PaymentResponse>(
        `/payments/${paymentId}`,
    )

    return response.data
}

export const getEligiblePaymentPeriods = async (
    employeeId: number,
    paymentId?: number,
): Promise<EligiblePaymentPeriod[]> => {
    const response = await apiClient.get<EligiblePaymentPeriod[]>(
        "/payments/eligible-periods",
        {
            params: {
                employeeId,
                ...(paymentId !== undefined ? { paymentId } : {}),
            },
        },
    );

    return response.data;
};


export const getMultiMonthDraftsForEmployee = async (
    employeeId: number,
): Promise<PaymentResponse[]> => {
    const response = await apiClient.get<PaymentResponse[]>(
        `/payments/employee/${employeeId}/multi-month-drafts`,
    );

    return response.data;
};

export const getAllMultiMonthDrafts = async (): Promise<PaymentResponse[]> => {
    const response = await apiClient.get<PaymentResponse[]>(
        "/payments/multi-month-drafts",
    );

    return response.data;
};

export async function cancelDraftPayment(paymentId: number): Promise<void> {
    await apiClient.patch(`/payments/${paymentId}/cancel`)
}