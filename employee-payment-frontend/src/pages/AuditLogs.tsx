// import { useCallback, useEffect, useState } from "react"
// import {
//     Search,
//     X,
//     RefreshCw,
// } from "lucide-react"
//
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
//
// import {
//     getAuditLogs,
//     type AuditLog,
//     type AuditLogFilters,
// } from "@/api/auditLogs"
//
// import { getAdmins, type Admin } from "@/api/admins"
//
// export default function AuditLogs() {
//
//     const [logs, setLogs] = useState<AuditLog[]>([])
//     const [admins, setAdmins] = useState<Admin[]>([])
//
//     const [loading, setLoading] = useState(false)
//     const [error, setError] = useState("")
//
//     const [action, setAction] = useState("")
//     const [entityType, setEntityType] = useState("")
//     const [adminId, setAdminId] = useState("")
//     const [search, setSearch] = useState("")
//     const [fromDate, setFromDate] = useState("")
//     const [toDate, setToDate] = useState("")
//
//     const [page, setPage] = useState(0)
//     const [totalPages, setTotalPages] = useState(0)
//     const [totalElements, setTotalElements] = useState(0)
//
//     const pageSize = 10
//
//     const loadAuditLogs = useCallback(
//         async (
//             pageNumber = 0,
//             filters: AuditLogFilters = {},
//         ) => {
//
//             try {
//
//                 setLoading(true)
//                 setError("")
//
//                 const response = await getAuditLogs(
//                     pageNumber,
//                     pageSize,
//                     filters,
//                 )
//
//                 setLogs(response.content)
//                 setPage(response.number)
//                 setTotalPages(response.totalPages)
//                 setTotalElements(response.totalElements)
//
//             } catch (err) {
//
//                 console.error(
//                     "Failed to load audit logs:",
//                     err,
//                 )
//
//                 setError(
//                     "Failed to load audit logs.",
//                 )
//
//             } finally {
//
//                 setLoading(false)
//             }
//         },
//         [],
//     )
//
//     const loadAdmins = useCallback(
//         async () => {
//
//             try {
//
//                 const response = await getAdmins()
//
//                 setAdmins(response)
//
//             } catch (err) {
//
//                 console.error(
//                     "Failed to load administrators:",
//                     err,
//                 )
//             }
//         },
//         [],
//     )
//
//     useEffect(() => {
//         void loadAdmins()
//         void loadAuditLogs()
//     }, [loadAdmins, loadAuditLogs])
//
//     const buildFilters = (): AuditLogFilters => {
//
//         return {
//             action: action || undefined,
//             entityType: entityType || undefined,
//             adminId: adminId
//                 ? Number(adminId)
//                 : undefined,
//             search: search.trim() || undefined,
//             fromDate: fromDate || undefined,
//             toDate: toDate || undefined,
//         }
//     }
//
//     const handleSearch = () => {
//
//         setPage(0)
//
//         void loadAuditLogs(
//             0,
//             buildFilters(),
//         )
//     }
//
//     const handleClear = () => {
//
//         setAction("")
//         setEntityType("")
//         setAdminId("")
//         setSearch("")
//         setFromDate("")
//         setToDate("")
//
//         setPage(0)
//
//         void loadAuditLogs(0, {})
//     }
//
//     const handleRefresh = () => {
//
//         void loadAuditLogs(
//             page,
//             buildFilters(),
//         )
//     }
//
//     const handlePrevious = () => {
//
//         if (page <= 0) {
//             return
//         }
//
//         void loadAuditLogs(
//             page - 1,
//             buildFilters(),
//         )
//     }
//
//     const handleNext = () => {
//
//         if (page >= totalPages - 1) {
//             return
//         }
//
//         void loadAuditLogs(
//             page + 1,
//             buildFilters(),
//         )
//     }
//
//     const formatDateTime = (
//         value: string,
//     ) => {
//
//         const date = new Date(value)
//
//         if (Number.isNaN(date.getTime())) {
//             return value
//         }
//
//         return date.toLocaleString(
//             "en-IN",
//             {
//                 day: "2-digit",
//                 month: "2-digit",
//                 year: "numeric",
//                 hour: "2-digit",
//                 minute: "2-digit",
//                 second: "2-digit",
//                 hour12: true,
//             },
//         )
//     }
//
//
//     return (
//         <div className="space-y-7">
//
//             {/* PAGE HEADER */}
//
//             <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
//
//                 <div>
//                     <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
//                         <RefreshCw className="h-4 w-4" />
//                         Administration
//                     </div>
//
//                     <h2 className="text-3xl font-bold tracking-tight text-slate-900">
//                         Audit Logs
//                     </h2>
//
//                     <p className="mt-1 text-sm text-slate-500">
//                         View administrator activities performed in the system.
//                     </p>
//                 </div>
//
//                 <Button
//                     type="button"
//                     variant="outline"
//                     onClick={handleRefresh}
//                     disabled={loading}
//                     className="h-10 rounded-xl border-slate-200 bg-white px-4 shadow-sm"
//                 >
//                     <RefreshCw className="mr-2 h-4 w-4" />
//                     Refresh
//                 </Button>
//
//             </div>
//
//
//             {/* ERROR */}
//
//             {error && (
//                 <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//                     {error}
//                 </div>
//             )}
//
//
//             {/* SEARCH & FILTERS */}
//
//             <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//
//                 <div className="border-b border-slate-100 bg-gradient-to-r from-primary/[0.035] via-white to-white px-5 py-5 md:px-6">
//
//                     <div className="flex items-center gap-3">
//
//                         <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
//                             <Search className="h-4 w-4" />
//                         </div>
//
//                         <div>
//                             <h3 className="text-base font-semibold text-slate-900">
//                                 Search & Filters
//                             </h3>
//
//                             <p className="mt-0.5 text-xs text-slate-500">
//                                 Filter administrator activity by action, entity, user or date.
//                             </p>
//                         </div>
//
//                     </div>
//
//                 </div>
//
//
//                 <div className="p-5 md:p-6">
//
//                     <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
//
//                         <div>
//                             <label className="mb-2 block text-sm font-medium text-slate-700">
//                                 Action
//                             </label>
//
//                             <select
//                                 value={action}
//                                 onChange={(event) => setAction(event.target.value)}
//                                 className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
//                             >
//                                 <option value="">All Actions</option>
//                                 <option value="LOGIN">Login</option>
//                                 <option value="CREATE">Create</option>
//                                 <option value="UPDATE">Update</option>
//                                 <option value="ACTIVATE">Activate</option>
//                                 <option value="DEACTIVATE">Deactivate</option>
//                             </select>
//                         </div>
//
//
//                         <div>
//                             <label className="mb-2 block text-sm font-medium text-slate-700">
//                                 Entity
//                             </label>
//
//                             <select
//                                 value={entityType}
//                                 onChange={(event) => setEntityType(event.target.value)}
//                                 className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
//                             >
//                                 <option value="">All Entities</option>
//                                 <option value="ADMIN">Administrator</option>
//                                 <option value="EMPLOYEE">Employee</option>
//                                 <option value="PAYMENT">Payment</option>
//                                 <option value="PAYMENT_PERIOD">Payment Period</option>
//                             </select>
//                         </div>
//
//
//                         <div>
//                             <label className="mb-2 block text-sm font-medium text-slate-700">
//                                 Administrator
//                             </label>
//
//                             <select
//                                 value={adminId}
//                                 onChange={(event) => setAdminId(event.target.value)}
//                                 className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
//                             >
//                                 <option value="">All Administrators</option>
//
//                                 {admins.map((admin) => (
//                                     <option key={admin.id} value={admin.id}>
//                                         {admin.name} ({admin.username})
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>
//
//                     </div>
//
//
//                     <div className="mt-5">
//
//                         <label className="mb-2 block text-sm font-medium text-slate-700">
//                             Search
//                         </label>
//
//                         <div className="relative">
//                             <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//
//                             <Input
//                                 value={search}
//                                 onChange={(event) => setSearch(event.target.value)}
//                                 onKeyDown={(event) => {
//                                     if (event.key === "Enter") {
//                                         handleSearch()
//                                     }
//                                 }}
//                                 placeholder="Search administrator or activity description..."
//                                 className="h-11 rounded-xl border-slate-200 bg-white pl-10 shadow-sm focus:border-primary focus:ring-primary/15"
//                             />
//
//                             {search && (
//                                 <button
//                                     type="button"
//                                     onClick={() => setSearch("")}
//                                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
//                                     aria-label="Clear search"
//                                 >
//                                     <X className="h-4 w-4" />
//                                 </button>
//                             )}
//                         </div>
//
//                     </div>
//
//
//                     <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
//
//                         <div>
//                             <label className="mb-2 block text-sm font-medium text-slate-700">
//                                 From Date
//                             </label>
//
//                             <Input
//                                 type="date"
//                                 value={fromDate}
//                                 onChange={(event) => setFromDate(event.target.value)}
//                                 className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-primary/15"
//                             />
//                         </div>
//
//                         <div>
//                             <label className="mb-2 block text-sm font-medium text-slate-700">
//                                 To Date
//                             </label>
//
//                             <Input
//                                 type="date"
//                                 value={toDate}
//                                 onChange={(event) => setToDate(event.target.value)}
//                                 className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-primary/15"
//                             />
//                         </div>
//
//                     </div>
//
//
//                     <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
//
//                         <Button
//                             type="button"
//                             variant="ghost"
//                             onClick={handleClear}
//                             disabled={loading}
//                             className="rounded-xl text-slate-600 hover:bg-slate-100"
//                         >
//                             <X className="mr-2 h-4 w-4" />
//                             Clear
//                         </Button>
//
//                         <Button
//                             type="button"
//                             onClick={handleSearch}
//                             disabled={loading}
//                             className="rounded-xl shadow-sm"
//                         >
//                             <Search className="mr-2 h-4 w-4" />
//                             Search
//                         </Button>
//
//                     </div>
//
//                 </div>
//
//             </section>
//
//
//             {/* ACTIVITY HISTORY */}
//
//             <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//
//                 <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
//
//                     <div>
//
//                         <div className="flex items-center gap-2">
//
//                             <h3 className="text-base font-semibold text-slate-900">
//                                 Activity History
//                             </h3>
//
//                             {loading && (
//                                 <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
//                                     <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
//                                     Updating
//                                 </span>
//                             )}
//
//                         </div>
//
//                         <p className="mt-1 text-xs text-slate-500">
//                             {totalElements} activity record
//                             {totalElements === 1 ? "" : "s"} found
//                         </p>
//
//                     </div>
//
//                     <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
//                         Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
//                     </div>
//
//                 </div>
//
//
//                 <div className="p-3 md:p-4">
//
//                     <div className="overflow-x-auto rounded-xl border border-slate-100">
//
//                         <table className="w-full min-w-[1050px] text-sm">
//
//                             <thead>
//                             <tr className="bg-slate-50 text-slate-500">
//
//                                 <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
//                                     Date & Time
//                                 </th>
//
//                                 <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
//                                     Administrator
//                                 </th>
//
//                                 <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
//                                     Action
//                                 </th>
//
//                                 <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
//                                     Entity
//                                 </th>
//
//                                 <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
//                                     Description
//                                 </th>
//
//                             </tr>
//                             </thead>
//
//
//                             <tbody>
//
//                             {loading ? (
//
//                                 <tr>
//                                     <td
//                                         colSpan={5}
//                                         className="px-4 py-12 text-center text-sm text-slate-400"
//                                     >
//                                         Loading audit logs...
//                                     </td>
//                                 </tr>
//
//                             ) : logs.length === 0 ? (
//
//                                 <tr>
//                                     <td
//                                         colSpan={5}
//                                         className="px-4 py-12 text-center text-sm text-slate-400"
//                                     >
//                                         No audit logs found.
//                                     </td>
//                                 </tr>
//
//                             ) : (
//
//                                 logs.map((log) => (
//
//                                     <tr
//                                         key={log.id}
//                                         className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
//                                     >
//
//                                         <td className="whitespace-nowrap px-4 py-4 text-slate-600">
//                                             {formatDateTime(log.createdAt)}
//                                         </td>
//
//                                         <td className="px-4 py-4">
//                                             <div className="font-semibold text-slate-800">
//                                                 {log.adminName}
//                                             </div>
//
//                                             <div className="mt-0.5 text-xs text-slate-400">
//                                                 {log.adminUsername}
//                                             </div>
//                                         </td>
//
//                                         <td className="px-4 py-4">
//                                             <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
//                                                 {log.action}
//                                             </span>
//                                         </td>
//
//                                         <td className="px-4 py-4">
//                                             <div className="font-medium text-slate-700">
//                                                 {log.entityType}
//                                             </div>
//
//                                             {log.entityId !== null && (
//                                                 <div className="mt-0.5 text-xs text-slate-400">
//                                                     ID: {log.entityId}
//                                                 </div>
//                                             )}
//                                         </td>
//
//                                         <td className="max-w-[500px] px-4 py-4 text-slate-600">
//                                             {log.description}
//                                         </td>
//
//                                     </tr>
//
//                                 ))
//
//                             )}
//
//                             </tbody>
//
//                         </table>
//
//                     </div>
//
//
//                     <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
//
//                         <p className="text-xs text-slate-400">
//                             Showing {totalElements === 0 ? 0 : page * pageSize + 1}
//                             {" "}to{" "}
//                             {Math.min((page + 1) * pageSize, totalElements)}
//                             {" "}of {totalElements}
//                         </p>
//
//                         <div className="flex items-center gap-2">
//
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 size="sm"
//                                 onClick={handlePrevious}
//                                 disabled={loading || page <= 0}
//                                 className="rounded-lg"
//                             >
//                                 Previous
//                             </Button>
//
//                             <span className="min-w-24 text-center text-xs font-medium text-slate-500">
//                                 Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
//                             </span>
//
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 size="sm"
//                                 onClick={handleNext}
//                                 disabled={
//                                     loading ||
//                                     totalPages === 0 ||
//                                     page >= totalPages - 1
//                                 }
//                                 className="rounded-lg"
//                             >
//                                 Next
//                             </Button>
//
//                         </div>
//
//                     </div>
//
//                 </div>
//
//             </section>
//
//         </div>
//     )
// }

import { useCallback, useEffect, useState } from "react"
import {
    Search,
    X,
    RefreshCw,
    ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
    getAuditLogs,
    type AuditLog,
    type AuditLogFilters,
} from "@/api/auditLogs"

import { getAdmins, type Admin } from "@/api/admins"

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [admins, setAdmins] = useState<Admin[]>([])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [action, setAction] = useState("")
    const [entityType, setEntityType] = useState("")
    const [adminId, setAdminId] = useState("")
    const [search, setSearch] = useState("")
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")

    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [totalElements, setTotalElements] = useState(0)

    const pageSize = 10

    const loadAuditLogs = useCallback(
        async (
            pageNumber = 0,
            filters: AuditLogFilters = {},
        ) => {
            try {
                setLoading(true)
                setError("")

                const response = await getAuditLogs(
                    pageNumber,
                    pageSize,
                    filters,
                )

                setLogs(response.content)
                setPage(response.number)
                setTotalPages(response.totalPages)
                setTotalElements(response.totalElements)
            } catch (err) {
                console.error(
                    "Failed to load audit logs:",
                    err,
                )

                setError(
                    "Failed to load audit logs.",
                )
            } finally {
                setLoading(false)
            }
        },
        [],
    )

    const loadAdmins = useCallback(
        async () => {
            try {
                const response = await getAdmins()

                setAdmins(response)
            } catch (err) {
                console.error(
                    "Failed to load administrators:",
                    err,
                )
            }
        },
        [],
    )

    useEffect(() => {
        void loadAdmins()
        void loadAuditLogs()
    }, [loadAdmins, loadAuditLogs])

    const buildFilters = (): AuditLogFilters => {
        return {
            action: action || undefined,
            entityType: entityType || undefined,
            adminId: adminId
                ? Number(adminId)
                : undefined,
            search: search.trim() || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        }
    }

    const handleSearch = () => {
        setPage(0)

        void loadAuditLogs(
            0,
            buildFilters(),
        )
    }

    const handleClear = () => {
        setAction("")
        setEntityType("")
        setAdminId("")
        setSearch("")
        setFromDate("")
        setToDate("")

        setPage(0)

        void loadAuditLogs(0, {})
    }

    const handleRefresh = () => {
        void loadAuditLogs(
            page,
            buildFilters(),
        )
    }

    const handlePrevious = () => {
        if (page <= 0) {
            return
        }

        void loadAuditLogs(
            page - 1,
            buildFilters(),
        )
    }

    const handleNext = () => {
        if (page >= totalPages - 1) {
            return
        }

        void loadAuditLogs(
            page + 1,
            buildFilters(),
        )
    }

    const formatDateTime = (
        value: string,
    ) => {
        const date = new Date(value)

        if (Number.isNaN(date.getTime())) {
            return value
        }

        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            },
        )
    }

    return (
        <div className="space-y-7">

            {/* PAGE HEADER */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <RefreshCw className="h-4 w-4" />
                        Administration
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        Audit Logs
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        View administrator activities performed in the system.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="h-10 rounded-xl border-slate-200 bg-white px-4 shadow-sm"
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>

            </div>


            {/* ERROR */}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}


            {/* SEARCH & FILTERS */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 bg-gradient-to-r from-primary/[0.035] via-white to-white px-5 py-5 md:px-6">

                    <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Search className="h-4 w-4" />
                        </div>

                        <div>
                            <h3 className="text-base font-semibold text-slate-900">
                                Search & Filters
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-500">
                                Filter administrator activity by action, entity, user or date.
                            </p>
                        </div>

                    </div>

                </div>


                <div className="p-5 md:p-6">

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

                        {/* ACTION */}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Action
                            </label>

                            <div className="relative">
                                <select
                                    value={action}
                                    onChange={(event) =>
                                        setAction(event.target.value)
                                    }
                                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                >
                                    <option value="">
                                        All Actions
                                    </option>

                                    <option value="LOGIN">
                                        Login
                                    </option>

                                    <option value="CREATE">
                                        Create
                                    </option>

                                    <option value="UPDATE">
                                        Update
                                    </option>

                                    <option value="ACTIVATE">
                                        Activate
                                    </option>

                                    <option value="DEACTIVATE">
                                        Deactivate
                                    </option>
                                </select>

                                <ChevronDown
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                                />
                            </div>
                        </div>


                        {/* ENTITY */}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Entity
                            </label>

                            <div className="relative">
                                <select
                                    value={entityType}
                                    onChange={(event) =>
                                        setEntityType(event.target.value)
                                    }
                                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                >
                                    <option value="">
                                        All Entities
                                    </option>

                                    <option value="ADMIN">
                                        Administrator
                                    </option>

                                    <option value="EMPLOYEE">
                                        Employee
                                    </option>

                                    <option value="PAYMENT">
                                        Payment
                                    </option>

                                    <option value="PAYMENT_PERIOD">
                                        Payment Period
                                    </option>
                                </select>

                                <ChevronDown
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                                />
                            </div>
                        </div>


                        {/* ADMINISTRATOR */}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Administrator
                            </label>

                            <div className="relative">
                                <select
                                    value={adminId}
                                    onChange={(event) =>
                                        setAdminId(event.target.value)
                                    }
                                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                                >
                                    <option value="">
                                        All Administrators
                                    </option>

                                    {admins.map((admin) => (
                                        <option
                                            key={admin.id}
                                            value={admin.id}
                                        >
                                            {admin.name} ({admin.username})
                                        </option>
                                    ))}
                                </select>

                                <ChevronDown
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                                />
                            </div>
                        </div>

                    </div>


                    {/* SEARCH */}

                    <div className="mt-5">

                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Search
                        </label>

                        <div className="relative">

                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        handleSearch()
                                    }
                                }}
                                placeholder="Search administrator or activity description..."
                                className="h-11 rounded-xl border-slate-200 bg-white pl-10 shadow-sm focus:border-primary focus:ring-primary/15"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}

                        </div>

                    </div>


                    {/* DATE FILTERS */}

                    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                From Date
                            </label>

                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(event) =>
                                    setFromDate(event.target.value)
                                }
                                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-primary/15"
                            />
                        </div>


                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                To Date
                            </label>

                            <Input
                                type="date"
                                value={toDate}
                                onChange={(event) =>
                                    setToDate(event.target.value)
                                }
                                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-primary/15"
                            />
                        </div>

                    </div>


                    {/* ACTION BUTTONS */}

                    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClear}
                            disabled={loading}
                            className="rounded-xl text-slate-600 hover:bg-slate-100"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Clear
                        </Button>

                        <Button
                            type="button"
                            onClick={handleSearch}
                            disabled={loading}
                            className="rounded-xl shadow-sm"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Search
                        </Button>

                    </div>

                </div>

            </section>


            {/* ACTIVITY HISTORY */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">

                    <div>

                        <div className="flex items-center gap-2">

                            <h3 className="text-base font-semibold text-slate-900">
                                Activity History
                            </h3>

                            {loading && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                                    Updating
                                </span>
                            )}

                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                            {totalElements} activity record
                            {totalElements === 1 ? "" : "s"} found
                        </p>

                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                        Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
                    </div>

                </div>


                <div className="p-3 md:p-4">

                    <div className="overflow-x-auto rounded-xl border border-slate-100">

                        <table className="w-full min-w-[1050px] text-sm">

                            <thead>
                            <tr className="bg-slate-50 text-slate-500">

                                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                    Date & Time
                                </th>

                                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                    Administrator
                                </th>

                                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                    Action
                                </th>

                                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                    Entity
                                </th>

                                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                    Description
                                </th>

                            </tr>
                            </thead>


                            <tbody>

                            {loading ? (

                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-400"
                                    >
                                        Loading audit logs...
                                    </td>
                                </tr>

                            ) : logs.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-sm text-slate-400"
                                    >
                                        No audit logs found.
                                    </td>
                                </tr>

                            ) : (

                                logs.map((log) => (

                                    <tr
                                        key={log.id}
                                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                                    >

                                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                                            {formatDateTime(log.createdAt)}
                                        </td>

                                        <td className="px-4 py-4">

                                            <div className="font-semibold text-slate-800">
                                                {log.adminName}
                                            </div>

                                            <div className="mt-0.5 text-xs text-slate-400">
                                                {log.adminUsername}
                                            </div>

                                        </td>

                                        <td className="px-4 py-4">

                                                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                                    {log.action}
                                                </span>

                                        </td>

                                        <td className="px-4 py-4">

                                            <div className="font-medium text-slate-700">
                                                {log.entityType}
                                            </div>

                                            {log.entityId !== null && (
                                                <div className="mt-0.5 text-xs text-slate-400">
                                                    ID: {log.entityId}
                                                </div>
                                            )}

                                        </td>

                                        <td className="max-w-[500px] px-4 py-4 text-slate-600">
                                            {log.description}
                                        </td>

                                    </tr>

                                ))

                            )}

                            </tbody>

                        </table>

                    </div>


                    {/* PAGINATION */}

                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-xs text-slate-400">
                            Showing{" "}
                            {totalElements === 0
                                ? 0
                                : page * pageSize + 1}
                            {" "}to{" "}
                            {Math.min(
                                (page + 1) * pageSize,
                                totalElements,
                            )}
                            {" "}of {totalElements}
                        </p>

                        <div className="flex items-center gap-2">

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePrevious}
                                disabled={
                                    loading ||
                                    page <= 0
                                }
                                className="rounded-lg"
                            >
                                Previous
                            </Button>

                            <span className="min-w-24 text-center text-xs font-medium text-slate-500">
                                Page{" "}
                                {totalPages === 0
                                    ? 0
                                    : page + 1}{" "}
                                of {totalPages}
                            </span>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleNext}
                                disabled={
                                    loading ||
                                    totalPages === 0 ||
                                    page >= totalPages - 1
                                }
                                className="rounded-lg"
                            >
                                Next
                            </Button>

                        </div>

                    </div>

                </div>

            </section>

        </div>
    )
}