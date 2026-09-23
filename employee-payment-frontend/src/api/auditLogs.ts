import apiClient from "./client"

export interface AuditLog {
    id: number
    adminId: number
    adminName: string
    adminUsername: string
    action: string
    entityType: string
    entityId: number | null
    description: string
    createdAt: string
}

export interface AuditLogPage {
    content: AuditLog[]
    totalElements: number
    totalPages: number
    number: number
    size: number
    first: boolean
    last: boolean
}

export interface AuditLogFilters {
    action?: string
    entityType?: string
    adminId?: number
    search?: string
    fromDate?: string
    toDate?: string
}

export const getAuditLogs = async (
    page = 0,
    size = 10,
    filters?: AuditLogFilters,
): Promise<AuditLogPage> => {

    const params = new URLSearchParams()

    params.set("page", String(page))
    params.set("size", String(size))

    if (filters?.action?.trim()) {
        params.set("action", filters.action.trim())
    }

    if (filters?.entityType?.trim()) {
        params.set("entityType", filters.entityType.trim())
    }

    if (filters?.adminId) {
        params.set("adminId", String(filters.adminId))
    }

    if (filters?.search?.trim()) {
        params.set("search", filters.search.trim())
    }

    if (filters?.fromDate) {
        params.set("fromDate", filters.fromDate)
    }

    if (filters?.toDate) {
        params.set("toDate", filters.toDate)
    }

    const response = await apiClient.get<AuditLogPage>(
        `/audit-logs?${params.toString()}`,
    )

    return response.data
}