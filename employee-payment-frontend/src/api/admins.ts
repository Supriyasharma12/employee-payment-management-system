import apiClient from "./client"

// ------------------------------------------
// Admin
// ------------------------------------------

export interface Admin {
    id: number
    name: string
    username: string
    role: string
    active: boolean
}

// ------------------------------------------
// Get All Admins
// ------------------------------------------

export const getAdmins = async (): Promise<Admin[]> => {
    const response = await apiClient.get<Admin[]>("/admins")

    return response.data
}

// ------------------------------------------
// Create Admin
// ------------------------------------------

export interface AdminCreateRequest {
    name: string
    username: string
    password: string
    role: string
}

export const createAdmin = async (
    admin: AdminCreateRequest,
): Promise<Admin> => {
    const response = await apiClient.post<Admin>(
        "/admins",
        admin,
    )

    return response.data
}

// ------------------------------------------
// Activate Admin
// ------------------------------------------

export const activateAdmin = async (
    id: number,
): Promise<void> => {
    await apiClient.patch(`/admins/${id}/activate`)
}

// ------------------------------------------
// Deactivate Admin
// ------------------------------------------

export const deactivateAdmin = async (
    id: number,
): Promise<void> => {
    await apiClient.patch(`/admins/${id}/deactivate`)
}