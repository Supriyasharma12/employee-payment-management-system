import { useCallback, useEffect, useRef, useState } from "react"
import {
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    Search,
    UserRound,
    X,
} from "lucide-react"

import {
    exportPaymentSummary,
    getPaymentSummary,
    type PaymentSummary as PaymentSummaryRecord,
} from "@/api/paymentSummary"

import {
    getBanks,
    getEmployeeCategories,
    searchEmployeesByCode,
    searchEmployeesByName,
    type Bank,
    type Employee,
    type EmployeeCategory,
} from "@/api/employees"

import { getPaymentPeriods, type PaymentPeriod } from "@/api/payment"

import { getApiErrorMessage } from "@/api/error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PrintButton from "@/components/PrintButton"

export default function PaymentSummary() {
    const [payments, setPayments] = useState<PaymentSummaryRecord[]>([])
    const [paymentPeriods, setPaymentPeriods] = useState<PaymentPeriod[]>([])
    const [categories, setCategories] = useState<EmployeeCategory[]>([])
    const [banks, setBanks] = useState<Bank[]>([])

    const [paymentPeriodId, setPaymentPeriodId] = useState("")
    const [employeeCode, setEmployeeCode] = useState("")
    const [employeeName, setEmployeeName] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [bankId, setBankId] = useState("")

    const [codeSuggestions, setCodeSuggestions] = useState<Employee[]>([])
    const [nameSuggestions, setNameSuggestions] = useState<Employee[]>([])
    const [activeSuggestionField, setActiveSuggestionField] = useState<"code" | "name" | null>(null)
    const suggestionRequestId = useRef(0)

    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [totalElements, setTotalElements] = useState(0)
    const pageSize = 10

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        const loadFilterData = async () => {
            try {
                const [periods, employeeCategories, employeeBanks] = await Promise.all([
                    getPaymentPeriods(),
                    getEmployeeCategories(),
                    getBanks(),
                ])
                setPaymentPeriods(periods)
                setCategories(employeeCategories)
                setBanks(employeeBanks)
            } catch (error) {
                console.error(error)
                setErrorMessage(getApiErrorMessage(error, "Failed to load summary filters."))
            }
        }
        void loadFilterData()
    }, [])

    const loadSummary = useCallback(async (page = 0, silent = false) => {
        try {
            if (silent) setRefreshing(true)
            else setLoading(true)
            setErrorMessage("")

            const data = await getPaymentSummary(page, pageSize, {
                paymentPeriodId: paymentPeriodId ? Number(paymentPeriodId) : undefined,
                categoryId: categoryId ? Number(categoryId) : undefined,
                bankId: bankId ? Number(bankId) : undefined,
                employeeCode: employeeCode.trim() || undefined,
                employeeName: employeeName.trim() || undefined,
            })

            setPayments(data.content ?? [])
            setCurrentPage(data.number)
            setTotalPages(data.totalPages)
            setTotalElements(data.totalElements)
        } catch (error) {
            console.error(error)
            if (!silent) {
                setPayments([])
                setTotalPages(0)
                setTotalElements(0)
            }
            setErrorMessage(getApiErrorMessage(error, "Failed to load payment summary."))
        } finally {
            if (silent) setRefreshing(false)
            else setLoading(false)
        }
    }, [bankId, categoryId, employeeCode, employeeName, paymentPeriodId])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadSummary(0)
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }

        // Initial request only.
        // Filters are applied explicitly through Search.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadSuggestions = useCallback(async (value: string) => {
        const normalized = value.trim()
        if (normalized.length < 2) {
            setCodeSuggestions([])
            setNameSuggestions([])
            return
        }

        const requestId = ++suggestionRequestId.current
        try {
            const [codeResult, nameResult] = await Promise.allSettled([
                searchEmployeesByCode(normalized),
                searchEmployeesByName(normalized),
            ])
            if (requestId !== suggestionRequestId.current) return

            const codeEmployees = codeResult.status === "fulfilled" ? (codeResult.value?.content ?? []) : []
            const nameEmployees = nameResult.status === "fulfilled" ? (nameResult.value?.content ?? []) : []

            const unique = (items: Employee[]) => items.filter(
                (employee, index, array) => array.findIndex((item) => item.id === employee.id) === index,
            )

            setCodeSuggestions(unique(codeEmployees).slice(0, 6))
            setNameSuggestions(unique(nameEmployees).slice(0, 6))
        } catch (error) {
            console.error(error)
        }
    }, [])

    useEffect(() => {
        const hasTextFilter = employeeCode.trim().length > 0 || employeeName.trim().length > 0
        if (!hasTextFilter) return

        const timer = window.setTimeout(() => {
            void loadSummary(0, true)
        }, 450)
        return () => window.clearTimeout(timer)
    }, [employeeCode, employeeName, loadSummary])

    const handleSearch = () => {
        setActiveSuggestionField(null)
        setCodeSuggestions([])
        setNameSuggestions([])
        void loadSummary(0, true)
    }

    const clearFilters = () => {
        setPaymentPeriodId("")
        setEmployeeCode("")
        setEmployeeName("")
        setCategoryId("")
        setBankId("")
        setCodeSuggestions([])
        setNameSuggestions([])
        setActiveSuggestionField(null)
        setErrorMessage("")
        void loadSummary(0, true)
    }

    const selectEmployeeForCode = (employee: Employee) => {
        setEmployeeCode(employee.employeeCode)
        setEmployeeName("")
        setCodeSuggestions([])
        setNameSuggestions([])
        setActiveSuggestionField(null)
        void loadSummary(0, true)
    }

    const selectEmployeeForName = (employee: Employee) => {
        setEmployeeName(employee.name)
        setEmployeeCode("")
        setCodeSuggestions([])
        setNameSuggestions([])
        setActiveSuggestionField(null)
        void loadSummary(0, true)
    }

    const goToPreviousPage = () => {
        if (currentPage <= 0 || loading || refreshing) return
        void loadSummary(currentPage - 1, true)
    }

    const goToNextPage = () => {
        if (currentPage >= totalPages - 1 || loading || refreshing) return
        void loadSummary(currentPage + 1, true)
    }

    const handleExport = async () => {
        try {
            setExporting(true)
            setErrorMessage("")
            const blob = await exportPaymentSummary({
                paymentPeriodId: paymentPeriodId ? Number(paymentPeriodId) : undefined,
                categoryId: categoryId ? Number(categoryId) : undefined,
                bankId: bankId ? Number(bankId) : undefined,
                employeeCode: employeeCode.trim() || undefined,
                employeeName: employeeName.trim() || undefined,
            })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = "payment-summary.xlsx"
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            setErrorMessage(getApiErrorMessage(error, "Failed to export payment summary."))
        } finally {
            setExporting(false)
        }
    }

    const formatAmount = (amount: number) => `₹${Number(amount || 0).toFixed(2)}`
    const formatPeriod = (month: number, year: number) => `${String(month).padStart(2, "0")}/${year}`

    const selectClassName = "h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
    const inputClassName = "h-10 rounded-lg border-slate-200 bg-white pl-9 pr-9 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15"

    return (
        <div className="space-y-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <FileText className="h-4 w-4" />
                        Financial Records
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Payment Summary</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Review employee payment records, apply filters, and export the required payment information.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleExport()}
                        disabled={exporting || loading}
                        className="border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {exporting ? "Exporting..." : "Export Excel"}
                    </Button>
                    <PrintButton title="Payment Summary" />
                </div>
            </div>

            {errorMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                        {/*<p className="mt-1 text-xs text-slate-500">Narrow the payment records by period or employee.</p>*/}
                    </div>
                    {refreshing && <span className="text-xs font-semibold text-primary">Updating results…</span>}
                </div>

                <div className="px-5 py-4 md:px-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="summaryPeriod" className="text-xs font-semibold text-slate-600">Payment Period</Label>
                            <div className="relative">
                                <select id="summaryPeriod" value={paymentPeriodId} onChange={(event) => setPaymentPeriodId(event.target.value)} className={selectClassName}>
                                    <option value="">All Payment Periods</option>
                                    {paymentPeriods.map((period) => (
                                        <option key={period.id} value={period.id}>
                                            {formatPeriod(period.month, period.year)} — {period.status}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summaryEmployeeCode" className="text-xs font-semibold text-slate-600">Employee Code</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="summaryEmployeeCode"
                                    value={employeeCode}
                                    onChange={(event) => {
                                        const value = event.target.value
                                        setEmployeeCode(value)
                                        setActiveSuggestionField(value.trim().length >= 2 ? "code" : null)
                                        void loadSuggestions(value)
                                    }}
                                    onFocus={() => codeSuggestions.length > 0 && setActiveSuggestionField("code")}
                                    onBlur={() => window.setTimeout(() => setActiveSuggestionField(null), 150)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") { event.preventDefault(); handleSearch() }
                                        if (event.key === "Escape") setActiveSuggestionField(null)
                                    }}
                                    placeholder="Search employee code..."
                                    autoComplete="off"
                                    className={inputClassName}
                                />
                                {employeeCode && (
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setEmployeeCode(""); setCodeSuggestions([]); setActiveSuggestionField(null) }} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear employee code">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                                {activeSuggestionField === "code" && codeSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Matching employees</div>
                                        {codeSuggestions.map((employee) => (
                                            <button key={employee.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectEmployeeForCode(employee)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-primary/[0.04]">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-slate-800">{employee.employeeCode}</span>
                                                    <span className="block truncate text-xs text-slate-500">{employee.name}{employee.designation ? ` • ${employee.designation}` : ""}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summaryEmployeeName" className="text-xs font-semibold text-slate-600">Employee Name</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="summaryEmployeeName"
                                    value={employeeName}
                                    onChange={(event) => {
                                        const value = event.target.value
                                        setEmployeeName(value)
                                        setActiveSuggestionField(value.trim().length >= 2 ? "name" : null)
                                        void loadSuggestions(value)
                                    }}
                                    onFocus={() => nameSuggestions.length > 0 && setActiveSuggestionField("name")}
                                    onBlur={() => window.setTimeout(() => setActiveSuggestionField(null), 150)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") { event.preventDefault(); handleSearch() }
                                        if (event.key === "Escape") setActiveSuggestionField(null)
                                    }}
                                    placeholder="Search employee name..."
                                    autoComplete="off"
                                    className={inputClassName}
                                />
                                {employeeName && (
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setEmployeeName(""); setNameSuggestions([]); setActiveSuggestionField(null) }} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear employee name">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                                {activeSuggestionField === "name" && nameSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Matching employees</div>
                                        {nameSuggestions.map((employee) => (
                                            <button key={employee.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectEmployeeForName(employee)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-primary/[0.04]">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-slate-800">{employee.name}</span>
                                                    <span className="block text-xs text-slate-500">{employee.employeeCode}{employee.designation ? ` • ${employee.designation}` : ""}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summaryCategory" className="text-xs font-semibold text-slate-600">Category</Label>
                            <div className="relative">
                                <select id="summaryCategory" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={selectClassName}>
                                    <option value="">All Categories</option>
                                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summaryBank" className="text-xs font-semibold text-slate-600">Bank</Label>
                            <div className="relative">
                                <select id="summaryBank" value={bankId} onChange={(event) => setBankId(event.target.value)} className={selectClassName}>
                                    <option value="">All Banks</option>
                                    {banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.bankName}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={clearFilters} disabled={loading || refreshing} className="text-slate-600 hover:bg-slate-100">
                                <X className="mr-2 h-4 w-4" /> Clear
                            </Button>
                            <Button type="button" onClick={handleSearch} disabled={loading || refreshing} className="shadow-sm">
                                <Search className="mr-2 h-4 w-4" /> Search
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">Payment Records</h3>
                            {refreshing && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Updating</span>}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{totalElements} payment record{totalElements === 1 ? "" : "s"} found</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                        <FileText className="h-3.5 w-3.5" /> Page {totalPages === 0 ? 0 : currentPage + 1} of {totalPages}
                    </div>
                </div>

                <div className="p-3 md:p-4">
                    {loading ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                            <div><p className="text-sm font-medium text-slate-700">Loading payment records</p><p className="mt-1 text-xs text-slate-400">Please wait…</p></div>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileText className="h-5 w-5" /></div>
                            <p className="mt-4 text-sm font-semibold text-slate-700">No payment records found</p>
                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">Try changing the selected filters or search for another employee.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full min-w-[1100px] text-sm">
                                    <thead>
                                    <tr className="bg-slate-50 text-slate-500">
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">Employee Code</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">Employee Name</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">Period</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Running TA</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Fixed TA</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Other</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Gross Total</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Deduction Total</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Net Payment</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {payments.map((payment) => (
                                        <tr
                                            key={payment.id}
                                            className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                                        >
                                            {/* Employee Code */}
                                            <td className="px-4 py-4">
                                                <div className="font-semibold text-slate-800">
                                                    {payment.employeeCode}
                                                </div>
                                            </td>

                                            {/* Employee Name */}
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-slate-900">
                                                    {payment.employeeName}
                                                </div>
                                            </td>

                                            {/* Period */}
                                            <td className="px-4 py-4 font-medium text-slate-600">
                                                {formatPeriod(payment.month ?? 0, payment.year ?? 0)}
                                            </td>

                                            {/* Running TA */}
                                            <td className="px-4 py-4 text-right tabular-nums text-slate-600">
                                                {formatAmount(payment.runningTa)}
                                            </td>

                                            {/* Fixed TA */}
                                            <td className="px-4 py-4 text-right tabular-nums text-slate-600">
                                                {formatAmount(payment.fixedTa)}
                                            </td>

                                            {/* Other */}
                                            <td className="px-4 py-4 text-right tabular-nums text-slate-600">
                                                {formatAmount(payment.other)}
                                            </td>

                                            {/* Gross Total */}
                                            <td className="px-4 py-4 text-right tabular-nums font-semibold text-slate-800">
                                                {formatAmount(payment.grossTotal)}
                                            </td>

                                            {/* Deduction Total */}
                                            <td className="px-4 py-4 text-right tabular-nums text-slate-600">
                                                {formatAmount(payment.deductionTotal)}
                                            </td>

                                            {/* Net Payment */}
                                            <td className="px-4 py-4 text-right">
                <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 font-bold tabular-nums text-emerald-700">
                    {formatAmount(payment.netPayment)}
                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {payment.status === "ACTIVE" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}

                    {payment.status}
                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-4 px-1 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{currentPage * pageSize + 1}</span>–<span className="font-semibold text-slate-700">{Math.min((currentPage + 1) * pageSize, totalElements)}</span> of <span className="font-semibold text-slate-700">{totalElements}</span> payments</p>
                                <div className="flex items-center justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 0 || loading || refreshing} className="border-slate-200 bg-white"><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button>
                                    <span className="min-w-[90px] rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600">Page {currentPage + 1} of {totalPages}</span>
                                    <Button type="button" variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= totalPages - 1 || loading || refreshing} className="border-slate-200 bg-white">Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}
