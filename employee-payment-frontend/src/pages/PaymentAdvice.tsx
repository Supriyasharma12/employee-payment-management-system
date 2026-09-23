import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react"

import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    Landmark,
    Search,
    UserRound,
    X,
} from "lucide-react"

import PrintButton from "@/components/PrintButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    exportPaymentAdvice,
    getPaymentAdvice,
    type PaymentAdvice as PaymentAdviceRecord,
} from "@/api/paymentAdvice"

import {
    getBanks,
    getEmployeeCategories,
    searchEmployeesByCode,
    searchEmployeesByName,
    type Bank,
    type Employee,
    type EmployeeCategory,
} from "@/api/employees"

import {
    getPaymentPeriods,
    type PaymentPeriod,
} from "@/api/paymentPeriods"


const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 450


export default function PaymentAdvice() {

    // ---------------------------------------------------------
    // DATA
    // ---------------------------------------------------------

    const [records, setRecords] =
        useState<PaymentAdviceRecord[]>([])

    const [paymentPeriods, setPaymentPeriods] =
        useState<PaymentPeriod[]>([])

    const [categories, setCategories] =
        useState<EmployeeCategory[]>([])

    const [banks, setBanks] =
        useState<Bank[]>([])


    // ---------------------------------------------------------
    // FILTER VALUES
    // ---------------------------------------------------------

    const [paymentPeriodId, setPaymentPeriodId] =
        useState("")

    const [employeeCode, setEmployeeCode] =
        useState("")

    const [employeeName, setEmployeeName] =
        useState("")

    const [categoryId, setCategoryId] =
        useState("")

    const [bankId, setBankId] =
        useState("")


    // These are the values actually applied to the API.
    // Text search updates these after the debounce delay.

    const [appliedEmployeeCode, setAppliedEmployeeCode] =
        useState("")

    const [appliedEmployeeName, setAppliedEmployeeName] =
        useState("")


    // ---------------------------------------------------------
    // SUGGESTIONS
    // ---------------------------------------------------------

    const [codeSuggestions, setCodeSuggestions] =
        useState<Employee[]>([])

    const [nameSuggestions, setNameSuggestions] =
        useState<Employee[]>([])

    const [activeSuggestionField, setActiveSuggestionField] =
        useState<"code" | "name" | null>(null)

    const suggestionRequestId =
        useRef(0)


    // ---------------------------------------------------------
    // PAGINATION
    // ---------------------------------------------------------

    const [currentPage, setCurrentPage] =
        useState(0)

    const [totalPages, setTotalPages] =
        useState(0)

    const [totalElements, setTotalElements] =
        useState(0)


    // ---------------------------------------------------------
    // UI STATE
    // ---------------------------------------------------------

    const [loading, setLoading] =
        useState(true)

    const [refreshing, setRefreshing] =
        useState(false)

    const [exporting, setExporting] =
        useState(false)

    const [errorMessage, setErrorMessage] =
        useState("")


    // ---------------------------------------------------------
    // LOAD FILTER DATA
    // ---------------------------------------------------------

    useEffect(() => {

        const loadFilterData = async () => {

            try {

                const [
                    periods,
                    employeeCategories,
                    employeeBanks,
                ] = await Promise.all([
                    getPaymentPeriods(),
                    getEmployeeCategories(),
                    getBanks(),
                ])

                setPaymentPeriods(periods)
                setCategories(employeeCategories)
                setBanks(employeeBanks)

            } catch (error) {

                console.error(error)

                setErrorMessage(
                    "Failed to load Payment Advice filters.",
                )
            }
        }

        void loadFilterData()

    }, [])


    // ---------------------------------------------------------
    // LOAD PAYMENT ADVICE
    // ---------------------------------------------------------

    const loadAdvice = useCallback(
        async (
            page = 0,
            silent = false,
        ) => {

            try {

                if (silent) {
                    setRefreshing(true)
                } else {
                    setLoading(true)
                }

                setErrorMessage("")

                const data =
                    await getPaymentAdvice(
                        page,
                        PAGE_SIZE,
                        {
                            paymentPeriodId:
                                paymentPeriodId
                                    ? Number(paymentPeriodId)
                                    : undefined,

                            categoryId:
                                categoryId
                                    ? Number(categoryId)
                                    : undefined,

                            bankId:
                                bankId
                                    ? Number(bankId)
                                    : undefined,

                            employeeCode:
                                appliedEmployeeCode.trim() ||
                                undefined,

                            employeeName:
                                appliedEmployeeName.trim() ||
                                undefined,
                        },
                    )

                setRecords(
                    data.content ?? [],
                )

                setCurrentPage(
                    data.number,
                )

                setTotalPages(
                    data.totalPages,
                )

                setTotalElements(
                    data.totalElements,
                )

            } catch (error) {

                console.error(error)

                if (!silent) {

                    setRecords([])

                    setTotalPages(0)

                    setTotalElements(0)
                }

                setErrorMessage(
                    "Failed to load Payment Advice.",
                )

            } finally {

                if (silent) {
                    setRefreshing(false)
                } else {
                    setLoading(false)
                }
            }
        },
        [
            paymentPeriodId,
            categoryId,
            bankId,
            appliedEmployeeCode,
            appliedEmployeeName,
        ],
    )

// ---------------------------------------------------------
// INITIAL LOAD + FILTER CHANGE
// ---------------------------------------------------------

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadAdvice(
                0,
                appliedEmployeeCode.trim().length > 0 ||
                appliedEmployeeName.trim().length > 0,
            )
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }
    }, [loadAdvice])

    // ---------------------------------------------------------
    // AUTOMATIC TEXT SEARCH
    // ---------------------------------------------------------

    useEffect(() => {

        const timer =
            window.setTimeout(() => {

                setAppliedEmployeeCode(
                    employeeCode.trim(),
                )

                setAppliedEmployeeName(
                    employeeName.trim(),
                )

            }, SEARCH_DEBOUNCE_MS)

        return () =>
            window.clearTimeout(timer)

    }, [
        employeeCode,
        employeeName,
    ])


    // ---------------------------------------------------------
    // LOAD EMPLOYEE SUGGESTIONS
    // ---------------------------------------------------------

    const loadSuggestions = async (
        value: string,
        field: "code" | "name",
    ) => {

        const normalized =
            value.trim()

        if (normalized.length < 2) {

            if (field === "code") {
                setCodeSuggestions([])
            } else {
                setNameSuggestions([])
            }

            return
        }

        const requestId =
            ++suggestionRequestId.current

        try {

            if (field === "code") {

                const result =
                    await searchEmployeesByCode(
                        normalized,
                    )

                if (
                    requestId !==
                    suggestionRequestId.current
                ) {
                    return
                }

                const employees =
                    result?.content ?? []

                setCodeSuggestions(
                    employees
                        .slice(0, 6),
                )

            } else {

                const result =
                    await searchEmployeesByName(
                        normalized,
                    )

                if (
                    requestId !==
                    suggestionRequestId.current
                ) {
                    return
                }

                const employees =
                    result?.content ?? []

                setNameSuggestions(
                    employees
                        .slice(0, 6),
                )
            }

        } catch (error) {

            console.error(error)

        }
    }


    // ---------------------------------------------------------
    // SEARCH BUTTON
    // ---------------------------------------------------------

    const handleSearch = () => {

        setActiveSuggestionField(null)

        setCodeSuggestions([])

        setNameSuggestions([])

        setAppliedEmployeeCode(
            employeeCode.trim(),
        )

        setAppliedEmployeeName(
            employeeName.trim(),
        )

        setCurrentPage(0)
    }


    // ---------------------------------------------------------
    // SELECT EMPLOYEE FROM CODE SUGGESTIONS
    // ---------------------------------------------------------

    const selectEmployeeForCode = (
        employee: Employee,
    ) => {

        setEmployeeCode(
            employee.employeeCode,
        )

        setEmployeeName("")

        setAppliedEmployeeCode(
            employee.employeeCode,
        )

        setAppliedEmployeeName("")

        setCodeSuggestions([])

        setNameSuggestions([])

        setActiveSuggestionField(null)

        setCurrentPage(0)
    }


    // ---------------------------------------------------------
    // SELECT EMPLOYEE FROM NAME SUGGESTIONS
    // ---------------------------------------------------------

    const selectEmployeeForName = (
        employee: Employee,
    ) => {

        setEmployeeName(
            employee.name,
        )

        setEmployeeCode("")

        setAppliedEmployeeName(
            employee.name,
        )

        setAppliedEmployeeCode("")

        setCodeSuggestions([])

        setNameSuggestions([])

        setActiveSuggestionField(null)

        setCurrentPage(0)
    }


    // ---------------------------------------------------------
    // CLEAR FILTERS
    // ---------------------------------------------------------

    const clearFilters = () => {

        suggestionRequestId.current += 1

        setPaymentPeriodId("")

        setEmployeeCode("")

        setEmployeeName("")

        setAppliedEmployeeCode("")

        setAppliedEmployeeName("")

        setCategoryId("")

        setBankId("")

        setCodeSuggestions([])

        setNameSuggestions([])

        setActiveSuggestionField(null)

        setErrorMessage("")

        setCurrentPage(0)
    }


    // ---------------------------------------------------------
    // PAGINATION
    // ---------------------------------------------------------

    const goToPreviousPage = () => {

        if (
            currentPage <= 0 ||
            loading ||
            refreshing
        ) {
            return
        }

        void loadAdvice(
            currentPage - 1,
            true,
        )
    }


    const goToNextPage = () => {

        if (
            currentPage >= totalPages - 1 ||
            loading ||
            refreshing
        ) {
            return
        }

        void loadAdvice(
            currentPage + 1,
            true,
        )
    }


    // ---------------------------------------------------------
    // EXPORT
    // ---------------------------------------------------------

    const handleExport = async () => {

        try {

            setExporting(true)

            setErrorMessage("")

            const blob =
                await exportPaymentAdvice({
                    paymentPeriodId:
                        paymentPeriodId
                            ? Number(paymentPeriodId)
                            : undefined,

                    categoryId:
                        categoryId
                            ? Number(categoryId)
                            : undefined,

                    bankId:
                        bankId
                            ? Number(bankId)
                            : undefined,

                    employeeCode:
                        appliedEmployeeCode.trim() ||
                        undefined,

                    employeeName:
                        appliedEmployeeName.trim() ||
                        undefined,
                })


            const url =
                window.URL.createObjectURL(
                    blob,
                )

            const link =
                document.createElement("a")

            link.href = url

            link.download =
                "payment-advice.xlsx"

            document.body.appendChild(
                link,
            )

            link.click()

            link.remove()

            window.URL.revokeObjectURL(
                url,
            )

        } catch (error) {

            console.error(error)

            setErrorMessage(
                "Failed to export Payment Advice.",
            )

        } finally {

            setExporting(false)
        }
    }


    // ---------------------------------------------------------
    // FORMATTING
    // ---------------------------------------------------------

    const formatCurrency = (
        amount: number,
    ) =>
        `₹${Number(
    amount || 0,
).toFixed(2)}`


    const formatPeriod = (
        month: number,
        year: number,
    ) =>
        `${String(month).padStart(
    2,
    "0",
)}/${year}`


// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------

const selectClassName =
    "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"


const inputClassName =
    "h-11 rounded-xl border-slate-200 bg-white pl-9 pr-9 shadow-sm focus:border-primary focus:ring-primary/15"


// ---------------------------------------------------------
// PAGINATION DISPLAY
// ---------------------------------------------------------

const firstRecord =
    totalElements === 0
        ? 0
        : currentPage * PAGE_SIZE + 1


const lastRecord =
    Math.min(
        (currentPage + 1) *
        PAGE_SIZE,
        totalElements,
    )


// ---------------------------------------------------------
// UI
// ---------------------------------------------------------

return (
    <>
        <style>{`
                @media print {
                    .payment-advice-print-hide {
                        display: none !important;
                    }
                }
            `}</style>

        <div className="space-y-7">

            {/* -------------------------------------------------
                PAGE HEADER
            ------------------------------------------------- */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                <div>

                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">

                        <Landmark className="h-4 w-4" />

                        Financial Records

                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        Payment Advice
                    </h2>

                </div>


                <div className="flex flex-wrap gap-2">

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            void handleExport()
                        }
                        disabled={
                            exporting ||
                            loading
                        }
                        className="border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                    >

                        <Download className="mr-2 h-4 w-4" />

                        {exporting
                            ? "Exporting..."
                            : "Export Excel"}

                    </Button>


                    <PrintButton
                        title="Payment Advice"
                    />

                </div>

            </div>


            {/* -------------------------------------------------
                ERROR
            ------------------------------------------------- */}

            {errorMessage && (

                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">

                    <X className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>
                        {errorMessage}
                    </span>

                </div>

            )}


            {/* -------------------------------------------------
                FILTERS
            ------------------------------------------------- */}

            <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 md:px-6">

                    <h3 className="text-sm font-semibold text-slate-900">
                        Filters
                    </h3>

                </div>


                <div className="px-5 py-5 md:px-6">

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">


                        {/* Payment Period */}

                        <div className="space-y-2">

                            <Label
                                htmlFor="advicePeriod"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Payment Period
                            </Label>

                            <div className="relative">

                                <select
                                    id="advicePeriod"
                                    value={
                                        paymentPeriodId
                                    }
                                    onChange={(event) => {

                                        setPaymentPeriodId(
                                            event.target.value,
                                        )

                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    className={
                                        selectClassName
                                    }
                                >

                                    <option value="">
                                        All Payment Periods
                                    </option>

                                    {paymentPeriods.map(
                                        (period) => (

                                            <option
                                                key={
                                                    period.id
                                                }
                                                value={
                                                    period.id
                                                }
                                            >
                                                {formatPeriod(
                                                    period.month,
                                                    period.year,
                                                )}{" "}
                                                —{" "}
                                                {
                                                    period.status
                                                }
                                            </option>

                                        ),
                                    )}

                                </select>

                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            </div>

                        </div>


                        {/* Employee Code */}

                        <div className="space-y-2">

                            <Label
                                htmlFor="adviceEmployeeCode"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Employee Code
                            </Label>

                            <div className="relative">

                                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />


                                <Input
                                    id="adviceEmployeeCode"
                                    value={
                                        employeeCode
                                    }
                                    onChange={(
                                        event,
                                    ) => {

                                        const value =
                                            event
                                                .target
                                                .value

                                        setEmployeeCode(
                                            value,
                                        )

                                        setEmployeeName(
                                            "",
                                        )

                                        setNameSuggestions(
                                            [],
                                        )

                                        setActiveSuggestionField(
                                            value.trim()
                                                .length >= 2
                                                ? "code"
                                                : null,
                                        )

                                        void loadSuggestions(
                                            value,
                                            "code",
                                        )
                                    }}
                                    onFocus={() => {

                                        if (
                                            codeSuggestions.length >
                                            0
                                        ) {
                                            setActiveSuggestionField(
                                                "code",
                                            )
                                        }
                                    }}
                                    onBlur={() => {

                                        window.setTimeout(
                                            () => {
                                                setActiveSuggestionField(
                                                    null,
                                                )
                                            },
                                            150,
                                        )
                                    }}
                                    onKeyDown={(
                                        event,
                                    ) => {

                                        if (
                                            event.key ===
                                            "Enter"
                                        ) {

                                            event.preventDefault()

                                            handleSearch()
                                        }

                                        if (
                                            event.key ===
                                            "Escape"
                                        ) {

                                            setActiveSuggestionField(
                                                null,
                                            )
                                        }
                                    }}
                                    placeholder="Search employee code..."
                                    autoComplete="off"
                                    className={
                                        inputClassName
                                    }
                                />


                                {employeeCode && (

                                    <button
                                        type="button"
                                        onMouseDown={(
                                            event,
                                        ) =>
                                            event.preventDefault()
                                        }
                                        onClick={() => {

                                            setEmployeeCode(
                                                "",
                                            )

                                            setCodeSuggestions(
                                                [],
                                            )

                                            setActiveSuggestionField(
                                                null,
                                            )
                                        }}
                                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        aria-label="Clear employee code"
                                    >

                                        <X className="h-4 w-4" />

                                    </button>

                                )}


                                {/* Code suggestions */}

                                {activeSuggestionField ===
                                    "code" &&
                                    codeSuggestions.length >
                                    0 && (

                                        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

                                            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                Matching employees
                                            </div>

                                            {codeSuggestions.map(
                                                (
                                                    employee,
                                                ) => (

                                                    <button
                                                        key={
                                                            employee.id
                                                        }
                                                        type="button"
                                                        onMouseDown={(
                                                            event,
                                                        ) =>
                                                            event.preventDefault()
                                                        }
                                                        onClick={() =>
                                                            selectEmployeeForCode(
                                                                employee,
                                                            )
                                                        }
                                                        className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-primary/[0.04]"
                                                    >

                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                                                            <UserRound className="h-4 w-4" />

                                                        </span>


                                                        <span className="min-w-0">

                                                            <span className="block text-sm font-semibold text-slate-800">

                                                                {
                                                                    employee.employeeCode
                                                                }

                                                            </span>

                                                            <span className="block truncate text-xs text-slate-500">

                                                                {
                                                                    employee.name
                                                                }

                                                                {employee.designation
                                                                    ? ` • ${employee.designation}`
                                                                    : ""}

                                                            </span>

                                                        </span>

                                                    </button>

                                                ),
                                            )}

                                        </div>

                                    )}

                            </div>

                        </div>


                        {/* Employee Name */}

                        <div className="space-y-2">

                            <Label
                                htmlFor="adviceEmployeeName"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Employee Name
                            </Label>

                            <div className="relative">

                                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />


                                <Input
                                    id="adviceEmployeeName"
                                    value={
                                        employeeName
                                    }
                                    onChange={(
                                        event,
                                    ) => {

                                        const value =
                                            event
                                                .target
                                                .value

                                        setEmployeeName(
                                            value,
                                        )

                                        setEmployeeCode(
                                            "",
                                        )

                                        setCodeSuggestions(
                                            [],
                                        )

                                        setActiveSuggestionField(
                                            value.trim()
                                                .length >= 2
                                                ? "name"
                                                : null,
                                        )

                                        void loadSuggestions(
                                            value,
                                            "name",
                                        )
                                    }}
                                    onFocus={() => {

                                        if (
                                            nameSuggestions.length >
                                            0
                                        ) {
                                            setActiveSuggestionField(
                                                "name",
                                            )
                                        }
                                    }}
                                    onBlur={() => {

                                        window.setTimeout(
                                            () => {
                                                setActiveSuggestionField(
                                                    null,
                                                )
                                            },
                                            150,
                                        )
                                    }}
                                    onKeyDown={(
                                        event,
                                    ) => {

                                        if (
                                            event.key ===
                                            "Enter"
                                        ) {

                                            event.preventDefault()

                                            handleSearch()
                                        }

                                        if (
                                            event.key ===
                                            "Escape"
                                        ) {

                                            setActiveSuggestionField(
                                                null,
                                            )
                                        }
                                    }}
                                    placeholder="Search employee name..."
                                    autoComplete="off"
                                    className={
                                        inputClassName
                                    }
                                />


                                {employeeName && (

                                    <button
                                        type="button"
                                        onMouseDown={(
                                            event,
                                        ) =>
                                            event.preventDefault()
                                        }
                                        onClick={() => {

                                            setEmployeeName(
                                                "",
                                            )

                                            setNameSuggestions(
                                                [],
                                            )

                                            setActiveSuggestionField(
                                                null,
                                            )
                                        }}
                                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        aria-label="Clear employee name"
                                    >

                                        <X className="h-4 w-4" />

                                    </button>

                                )}


                                {/* Name suggestions */}

                                {activeSuggestionField ===
                                    "name" &&
                                    nameSuggestions.length >
                                    0 && (

                                        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

                                            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                Matching employees
                                            </div>

                                            {nameSuggestions.map(
                                                (
                                                    employee,
                                                ) => (

                                                    <button
                                                        key={
                                                            employee.id
                                                        }
                                                        type="button"
                                                        onMouseDown={(
                                                            event,
                                                        ) =>
                                                            event.preventDefault()
                                                        }
                                                        onClick={() =>
                                                            selectEmployeeForName(
                                                                employee,
                                                            )
                                                        }
                                                        className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-primary/[0.04]"
                                                    >

                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                                                            <UserRound className="h-4 w-4" />

                                                        </span>


                                                        <span className="min-w-0">

                                                            <span className="block truncate text-sm font-semibold text-slate-800">

                                                                {
                                                                    employee.name
                                                                }

                                                            </span>

                                                            <span className="block text-xs text-slate-500">

                                                                {
                                                                    employee.employeeCode
                                                                }

                                                                {employee.designation
                                                                    ? ` • ${employee.designation}`
                                                                    : ""}

                                                            </span>

                                                        </span>

                                                    </button>

                                                ),
                                            )}

                                        </div>

                                    )}

                            </div>

                        </div>


                        {/* Category */}

                        <div className="space-y-2">

                            <Label
                                htmlFor="adviceCategory"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Category
                            </Label>

                            <div className="relative">

                                <select
                                    id="adviceCategory"
                                    value={
                                        categoryId
                                    }
                                    onChange={(event) => {

                                        setCategoryId(
                                            event.target.value,
                                        )

                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    className={
                                        selectClassName
                                    }
                                >

                                    <option value="">
                                        All Categories
                                    </option>

                                    {categories.map(
                                        (
                                            category,
                                        ) => (

                                            <option
                                                key={
                                                    category.id
                                                }
                                                value={
                                                    category.id
                                                }
                                            >
                                                {
                                                    category.name
                                                }
                                            </option>

                                        ),
                                    )}

                                </select>

                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            </div>

                        </div>


                        {/* Bank */}

                        <div className="space-y-2">

                            <Label
                                htmlFor="adviceBank"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Bank
                            </Label>

                            <div className="relative">

                                <select
                                    id="adviceBank"
                                    value={
                                        bankId
                                    }
                                    onChange={(event) => {

                                        setBankId(
                                            event.target.value,
                                        )

                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    className={
                                        selectClassName
                                    }
                                >

                                    <option value="">
                                        All Banks
                                    </option>

                                    {banks.map(
                                        (bank) => (

                                            <option
                                                key={
                                                    bank.id
                                                }
                                                value={
                                                    bank.id
                                                }
                                            >
                                                {
                                                    bank.bankName
                                                }
                                            </option>

                                        ),
                                    )}

                                </select>

                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            </div>

                        </div>

                    </div>


                    {/* Filter Actions */}

                    <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">

                        <div className="flex flex-wrap justify-end gap-2">

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={
                                    clearFilters
                                }
                                disabled={
                                    loading ||
                                    refreshing
                                }
                                className="text-slate-600 hover:bg-slate-100"
                            >

                                <X className="mr-2 h-4 w-4" />

                                Clear

                            </Button>


                            <Button
                                type="button"
                                onClick={
                                    handleSearch
                                }
                                disabled={
                                    loading ||
                                    refreshing
                                }
                                className="shadow-sm"
                            >

                                <Search className="mr-2 h-4 w-4" />

                                Search

                            </Button>

                        </div>

                    </div>

                </div>

            </section>


            {/* -------------------------------------------------
                PAYMENT ADVICE RECORDS
            ------------------------------------------------- */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* Records Header */}

                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">

                    <div>

                        <div className="flex items-center gap-2">

                            <h3 className="text-sm font-semibold text-slate-900">
                                Payment Advice Records
                            </h3>

                            {refreshing && (

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">

                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />

                                    Updating

                                </span>

                            )}

                        </div>


                        <p className="mt-1 text-xs text-slate-500">

                            {totalElements} payment advice record
                            {totalElements === 1
                                ? ""
                                : "s"} found

                        </p>

                    </div>


                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">

                        <FileText className="h-3.5 w-3.5" />

                        Page{" "}

                        {totalPages === 0
                            ? 0
                            : currentPage + 1}

                        {" "}of{" "}

                        {totalPages}

                    </div>

                </div>


                {/* Records Content */}

                <div className="p-3 md:p-4">

                    {loading ? (

                        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">

                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />

                            <p className="text-sm font-medium text-slate-700">
                                Loading payment advice
                            </p>

                        </div>

                    ) : records.length === 0 ? (

                        <div className="flex min-h-[260px] flex-col items-center justify-center text-center">

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                                <FileText className="h-5 w-5" />

                            </div>


                            <p className="mt-4 text-sm font-semibold text-slate-700">
                                No payment advice found
                            </p>


                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                                Try changing the selected filters or search for another employee.
                            </p>

                        </div>

                    ) : (

                        <>

                            <div className="overflow-x-auto rounded-xl border border-slate-100">

                                <table className="w-full min-w-[1150px] text-sm">

                                    <thead>

                                    <tr className="bg-slate-50 text-slate-500">

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Employee Code
                                        </th>

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Employee Name
                                        </th>

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Period
                                        </th>

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Bank
                                        </th>

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Account Number
                                        </th>

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            IFSC
                                        </th>

                                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Category
                                        </th>

                                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">
                                            Net Payment
                                        </th>

                                        <th className="print:hidden px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide">
                                            Status
                                        </th>

                                    </tr>

                                    </thead>


                                    <tbody>

                                    {records.map(
                                        (record) => (

                                            <tr
                                                key={
                                                    record.paymentId
                                                }
                                                className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                                            >

                                                <td className="px-4 py-4">

                                                    <div className="font-semibold text-slate-800">
                                                        {
                                                            record.employeeCode
                                                        }
                                                    </div>

                                                </td>

                                                <td className="px-4 py-4">


                                                    <div className="mt-0.5 text-xs text-slate-500">
                                                        {
                                                            record.employeeName
                                                        }
                                                    </div>

                                                </td>


                                                <td className="px-4 py-4 font-medium text-slate-600">

                                                    {formatPeriod(
                                                        record.month,
                                                        record.year,
                                                    )}

                                                </td>


                                                <td className="px-4 py-4 text-slate-600">

                                                    {
                                                        record.bankName
                                                    }

                                                </td>


                                                <td className="px-4 py-4 font-mono text-xs text-slate-600">

                                                    {
                                                        record.accountNumber
                                                    }

                                                </td>


                                                <td className="px-4 py-4 font-mono text-xs font-medium text-slate-600">

                                                    {
                                                        record.ifscCode
                                                    }

                                                </td>


                                                <td className="px-4 py-4">

                                                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">

                                                            {
                                                                record.categoryName
                                                            }

                                                        </span>

                                                </td>


                                                <td className="px-4 py-4 text-right">

                                                        <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 font-bold tabular-nums text-emerald-700">

                                                            {formatCurrency(
                                                                record.netPayment,
                                                            )}

                                                        </span>

                                                </td>


                                                <td className="payment-advice-print-hide px-4 py-4">

                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">

                                                            {
                                                                record.status
                                                            }

                                                        </span>

                                                </td>

                                            </tr>

                                        ),
                                    )}

                                    </tbody>

                                </table>

                            </div>


                            {/* Pagination */}

                            <div className="flex flex-col gap-4 px-1 pt-5 sm:flex-row sm:items-center sm:justify-between">

                                <p className="text-xs text-slate-500">

                                    Showing{" "}

                                    <span className="font-semibold text-slate-700">
                                        {firstRecord}
                                    </span>

                                    {" – "}

                                    <span className="font-semibold text-slate-700">
                                        {lastRecord}
                                    </span>

                                    {" "}of{" "}

                                    <span className="font-semibold text-slate-700">
                                        {totalElements}
                                    </span>

                                    {" "}payment advice records

                                </p>


                                <div className="flex items-center justify-end gap-2">

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={
                                            goToPreviousPage
                                        }
                                        disabled={
                                            currentPage ===
                                            0 ||
                                            loading ||
                                            refreshing
                                        }
                                        className="border-slate-200 bg-white"
                                    >

                                        <ChevronLeft className="mr-1 h-4 w-4" />

                                        Previous

                                    </Button>


                                    <span className="min-w-[90px] rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600">

                                        Page{" "}

                                        {currentPage + 1}

                                        {" "}of{" "}

                                        {totalPages}

                                    </span>


                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={
                                            goToNextPage
                                        }
                                        disabled={
                                            currentPage >=
                                            totalPages - 1 ||
                                            loading ||
                                            refreshing
                                        }
                                        className="border-slate-200 bg-white"
                                    >

                                        Next

                                        <ChevronRight className="ml-1 h-4 w-4" />

                                    </Button>

                                </div>

                            </div>

                        </>

                    )}

                </div>

            </section>

        </div>
    </>
)
}
