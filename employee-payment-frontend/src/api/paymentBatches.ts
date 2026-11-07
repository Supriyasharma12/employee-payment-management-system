import apiClient from "./client"

// ------------------------------------------
// Payment Batch
// ------------------------------------------

export interface PaymentBatch {
    id: number
    batchName: string
    batchMonth: string
    status: "OPEN" | "CLOSED" | string
    createdAt: string
    updatedAt: string
}

// ------------------------------------------
// Get Open Payment Batches
// ------------------------------------------

export const getOpenPaymentBatches = async (): Promise<PaymentBatch[]> => {
    const response = await apiClient.get<PaymentBatch[]>(
        "/payment-batches/open",
    )

    return response.data
}

// ------------------------------------------
// Get Draft Payment Batches (legacy function)
// ------------------------------------------

export const getDraftPaymentBatches = async (): Promise<PaymentBatch[]> => {
    const response = await apiClient.get<PaymentBatch[]>(
        "/payment-batches/drafts",
    )

    return response.data
}

// ------------------------------------------
// Create Payment Batch
// ------------------------------------------
// ------------------------------------------
// Create Monthly Payment Batch
// ------------------------------------------

export const createPaymentBatch = async (
    batchMonth: string,
): Promise<PaymentBatch> => {
    const response = await apiClient.post<PaymentBatch>(
        "/payment-batches",
        { batchMonth },
    )

    return response.data
}

// ------------------------------------------
// Get All Payment Batches
// ------------------------------------------

export const getPaymentBatches = async (): Promise<PaymentBatch[]> => {
    const response = await apiClient.get<PaymentBatch[]>(
        "/payment-batches",
    )

    return response.data
}

// ------------------------------------------
// Close Payment Batch
// ------------------------------------------

export const closePaymentBatch = async (
    batchId: number,
): Promise<PaymentBatch> => {
    const response = await apiClient.patch<PaymentBatch>(
        `/payment-batches/${batchId}/close`,
    )

    return response.data
}