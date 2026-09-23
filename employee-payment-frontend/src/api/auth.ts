import apiClient from "./client"

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    token: string
    message: string
    adminId: number
    name: string
    username: string
    role: string
}

export const loginAdmin = async (
    credentials: LoginRequest
): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
        "/auth/login",
        credentials
    )

    return response.data
}