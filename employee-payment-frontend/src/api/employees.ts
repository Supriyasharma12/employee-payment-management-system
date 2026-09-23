// import apiClient from "./client"
//
// export interface EmployeeCategory {
//     id: number
//     name: string
//     active: boolean
// }
//
// export interface Bank {
//     id: number
//     bankName: string
//     active: boolean
// }
//
// export interface Employee {
//     id: number
//     employeeCode: string
//     name: string
//     accountNumber: string
//     ifscCode: string
//     position: string
//     phoneNumber: string
//     email: string
//     gradePay: number
//     scale: string
//     headquarters: string
//     designation: string
//     categoryId: number
//     categoryName?: string
//     bankId?: number
//     bankName?: string
//     active: boolean
// }
//
// export interface EmployeeRequest {
//     employeeCode: string
//     name: string
//     accountNumber: string
//     ifscCode: string
//     position: string
//     phoneNumber: string
//     email: string
//     gradePay: number
//     scale: string
//     headquarters: string
//     designation: string
//     categoryId: number
//     bankId?: number
// }
//
// export interface EmployeePage {
//     content: Employee[]
//     totalElements: number
//     totalPages: number
//     number: number
//     size: number
//     first: boolean
//     last: boolean
// }
//
// export const getEmployees = async (
//     page = 0,
//     size = 10,
// ): Promise<EmployeePage> => {
//     const response = await apiClient.get<EmployeePage>(
//         `/employees?page=${page}&size=${size}`,
//     )
//
//     return response.data
// }
//
// export const getEmployeeCategories = async (): Promise<
//     EmployeeCategory[]
// > => {
//     const response = await apiClient.get(
//         "/employee-categories",
//     )
//
//     return response.data
// }
//
// export const getBanks = async (): Promise<Bank[]> => {
//     const response = await apiClient.get("/banks")
//
//     return response.data
// }
//
// export const createEmployee = async (
//     employee: EmployeeRequest,
// ): Promise<Employee> => {
//     const response = await apiClient.post(
//         "/employees",
//         employee,
//     )
//
//     return response.data
// }
//
// export const updateEmployee = async (
//     id: number,
//     employee: EmployeeRequest,
// ): Promise<Employee> => {
//     const response = await apiClient.put(
//         `/employees/${id}`,
//         employee,
//     )
//
//     return response.data
// }
//
// export const searchEmployeesByName = async (
//     name: string,
// ): Promise<Employee[]> => {
//     const response = await apiClient.get(
//         `/employees/search/name?name=${encodeURIComponent(name)}`,
//     )
//
//     return response.data
// }
//
// export const searchEmployeesByCode = async (
//     employeeCode: string,
// ): Promise<Employee[]> => {
//     const response = await apiClient.get(
//         `/employees/search/code?employeeCode=${encodeURIComponent(employeeCode)}`,
//     )
//
//     return response.data
// }
//
// export const activateEmployee = async (
//     id: number,
// ) => {
//     const response = await apiClient.patch(
//         `/employees/${id}/activate`,
//     )
//
//     return response.data
// }
//
// export const deactivateEmployee = async (
//     id: number,
// ) => {
//     const response = await apiClient.patch(
//         `/employees/${id}/deactivate`,
//     )
//
//     return response.data
// }

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
    accountNumber: string
    ifscCode: string
    position: string
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
    accountNumber: string
    ifscCode: string
    position: string
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
): Promise<EmployeePage> => {
    const response = await apiClient.get<EmployeePage>(
        `/employees?page=${page}&size=${size}`,
    )

    return response.data
}

export const getEmployeeCategories = async (): Promise<
    EmployeeCategory[]
> => {
    const response = await apiClient.get(
        "/employee-categories",
    )

    return response.data
}

export const getBanks = async (): Promise<Bank[]> => {
    const response = await apiClient.get("/banks")

    return response.data
}

export const createEmployee = async (
    employee: EmployeeRequest,
): Promise<Employee> => {
    const response = await apiClient.post(
        "/employees",
        employee,
    )

    return response.data
}

export const updateEmployee = async (
    id: number,
    employee: EmployeeRequest,
): Promise<Employee> => {
    const response = await apiClient.put(
        `/employees/${id}`,
        employee,
    )

    return response.data
}

export const activateEmployee = async (
    id: number,
) => {
    const response = await apiClient.patch(
        `/employees/${id}/activate`,
    )

    return response.data
}

export const deactivateEmployee = async (
    id: number,
) => {
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