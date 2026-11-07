import apiClient from "./client"

export interface EmployeeCategory {
    id: number
    name: string
    active: boolean
}

export interface Bank {
    id: number
    bankName: string
    active: boolean
}

export interface Employee {
    id: number
    employeeCode: string
    name: string
    panNumber: string
    accountNumber: string
    ifscCode: string

    // Employee details
    department: string
    medicalCardId: string
    uan: string
    aadhaar: string
    dateOfBirth: string
    dateOfJoining: string
    paymentTrackingStartMonth: string | null

    phoneNumber: string
    email: string
    gradePay: number
    scale: string
    headquarters: string
    designation: string

    categoryId: number
    categoryName?: string
    bankId?: number
    bankName?: string
    active: boolean
}

export interface EmployeeRequest {
    employeeCode: string
    name: string
    panNumber: string
    accountNumber: string
    ifscCode: string

    // Employee details
    department: string
    medicalCardId: string
    uan: string
    aadhaar: string
    dateOfBirth: string
    dateOfJoining: string
    paymentTrackingStartMonth: string | null

    phoneNumber: string
    email: string
    gradePay: number
    scale: string
    headquarters: string
    designation: string

    categoryId: number
    bankId?: number
}

export interface EmployeePage {
    content: Employee[]
    totalElements: number
    totalPages: number
    number: number
    size: number
    first: boolean
    last: boolean
}

export const getEmployees = async (
    page = 0,
    size = 10,
    categoryId = "",
    bankId = "",
    search = "",
): Promise<EmployeePage> => {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    })

    if (categoryId) {
        params.set("categoryId", categoryId)
    }

    if (bankId) {
        params.set("bankId", bankId)
    }

    if (search.trim()) {
        params.set("search", search.trim())
    }

    const response = await apiClient.get<EmployeePage>(
        `/employees?${params.toString()}`,
    )

    return response.data
}

export const getEmployeeCategories = async (): Promise<EmployeeCategory[]> => {
    const response = await apiClient.get<EmployeeCategory[]>(
        "/employee-categories",
    )

    return response.data
}

export const getBanks = async (): Promise<Bank[]> => {
    const response = await apiClient.get<Bank[]>("/banks")
    return response.data
}

export const createEmployee = async (
    employee: EmployeeRequest,
): Promise<Employee> => {
    const response = await apiClient.post<Employee>(
        "/employees",
        employee,
    )

    return response.data
}

export const updateEmployee = async (
    id: number,
    employee: EmployeeRequest,
): Promise<Employee> => {
    const response = await apiClient.put<Employee>(
        `/employees/${id}`,
        employee,
    )

    return response.data
}

export const activateEmployee = async (id: number) => {
    const response = await apiClient.patch(
        `/employees/${id}/activate`,
    )

    return response.data
}

export const deactivateEmployee = async (id: number) => {
    const response = await apiClient.patch(
        `/employees/${id}/deactivate`,
    )

    return response.data
}

export const searchEmployeesByName = async (
    name: string,
    page = 0,
    size = 10,
): Promise<EmployeePage> => {
    const response = await apiClient.get<EmployeePage>(
        `/employees/search/name?name=${encodeURIComponent(name)}&page=${page}&size=${size}`,
    )

    return response.data
}

export const searchEmployeesByCode = async (
    employeeCode: string,
    page = 0,
    size = 10,
): Promise<EmployeePage> => {
    const response = await apiClient.get<EmployeePage>(
        `/employees/search/code?employeeCode=${encodeURIComponent(employeeCode)}&page=${page}&size=${size}`,
    )

    return response.data
}


export const exportEmployees = async (filters?: {
    categoryId?: string
    bankId?: string
    search?: string
}): Promise<Blob> => {
    const params = new URLSearchParams()

    if (filters?.categoryId) {
        params.set("categoryId", filters.categoryId)
    }

    if (filters?.bankId) {
        params.set("bankId", filters.bankId)
    }

    if (filters?.search?.trim()) {
        params.set("search", filters.search.trim())
    }

    const queryString = params.toString()

    const response = await apiClient.get<Blob>(
        `/employees/export${queryString ? `?${queryString}` : ""}`,
        {
            responseType: "blob",
        },
    )

    return response.data
}
