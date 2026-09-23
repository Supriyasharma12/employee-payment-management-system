import axios from "axios"

interface ApiErrorResponse {
    message?: string
    error?: string
    details?: string
}

export const getApiErrorMessage = (
    error: unknown,
    fallback = "Something went wrong.",
): string => {

    if (axios.isAxiosError(error)) {

        const data =
            error.response?.data as
                | ApiErrorResponse
                | undefined

        if (data?.message?.trim()) {
            return data.message
        }

        if (data?.error?.trim()) {
            return data.error
        }

        if (data?.details?.trim()) {
            return data.details
        }

        if (error.message?.trim()) {
            return error.message
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message
    }

    return fallback
}