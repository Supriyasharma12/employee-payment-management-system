import apiClient from "./client"

export interface PaymentPeriod {
    id: number
    month: number
    year: number
    startDate: string
    endDate: string
    status: string
}

export interface PaymentPeriodRequest {
    month: number
    year: number
    startDate: string
    endDate: string
}

export const getPaymentPeriods = async (): Promise<
    PaymentPeriod[]
> => {
    const response =
        await apiClient.get<PaymentPeriod[]>(
            "/payment-periods",
        )

    return response.data
}

export const getPaymentPeriod = async (
    id: number,
): Promise<PaymentPeriod> => {
    const response =
        await apiClient.get<PaymentPeriod>(
            `/payment-periods/${id}`,
        )

    return response.data
}

export const createPaymentPeriod = async (
    request: PaymentPeriodRequest,
): Promise<PaymentPeriod> => {
    const response =
        await apiClient.post<PaymentPeriod>(
            "/payment-periods",
            request,
        )

    return response.data
}