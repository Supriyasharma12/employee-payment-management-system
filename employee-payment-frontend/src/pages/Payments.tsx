import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2, ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    Lock,
    Pencil,
    RefreshCw,
    Save,
    Search, ShieldCheck,
    X,
} from "lucide-react"


import {
    cancelDraftPayment,
    approvePayment,
    createMultiMonthPayment,
    updateMultiMonthPayment,
    getPaymentById,
    getEligiblePaymentPeriods,
    getAllMultiMonthDrafts,
    type EligiblePaymentPeriod,
    type PaymentMonthlyDetailRequest,
} from "@/api/payment"

import {
    getOpenPaymentBatches,
    getPaymentBatches,
    createPaymentBatch,
    closePaymentBatch,
    type PaymentBatch,
} from "../api/paymentBatches"

import {
    getPaymentPeriods,
    type PaymentPeriod,
} from "@/api/paymentPeriods"
import {
    getEmployees,
    getBanks,
    getEmployeeCategories,
    type Bank,
    type Employee,
    type EmployeeCategory,
} from "@/api/employees"
import {
    getPaymentSummary,
    type PaymentSummary as PaymentSummaryRecord,
} from "@/api/paymentSummary"
import { getApiErrorMessage } from "@/api/error"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EmployeePage {
    content: Employee[]
    totalPages: number
    totalElements: number
}

interface DraftPayment {
    runningTa: string
    fixedTa: string
    other: string
    miscellaneous: string
    advanceTa: string
    advanceOther: string
}

const EMPLOYEE_LOAD_SIZE = 100
const PAYMENT_LOAD_SIZE = 100
const ROWS_PER_PAGE = 25

const emptyDraft = (): DraftPayment => ({
    runningTa: "",
    fixedTa: "",
    other: "",
    miscellaneous: "",
    advanceTa: "",
    advanceOther: "",
})

const toAmount = (value: string) => {
    if (!value) return 0

    const amount = Number(value)

    return Number.isFinite(amount)
        ? Math.max(0, amount)
        : 0
}

const formatAmount = (amount: number) =>
    amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

const formatInputAmount = (amount: number) =>
    amount.toFixed(2)

const getToday = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

const getMonthName = (month: number) =>
    new Date(2000, month - 1, 1).toLocaleString(
        "en-IN",
        { month: "long" },
    )

const getEmployeeTrackingStart = (
    employee: Employee,
): { year: number; month: number } | null => {
    const value = employee.paymentTrackingStartMonth

    if (!value) {
        return null
    }

    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value)

    if (!match) {
        return null
    }

    const year = Number(match[1])
    const month = Number(match[2])

    if (month < 1 || month > 12) {
        return null
    }

    return { year, month }
}

// const formatPeriod = (period: PaymentPeriod) =>
//     `${String(period.month).padStart(2, "0")}/${period.year}`

const paymentToDraft = (
    payment: PaymentSummaryRecord,
): DraftPayment => ({
    runningTa: formatInputAmount(payment.runningTa),
    fixedTa: formatInputAmount(payment.fixedTa),
    other: formatInputAmount(payment.other),
    miscellaneous: formatInputAmount(payment.miscellaneous),
    advanceTa: formatInputAmount(payment.advanceTa),
    advanceOther: formatInputAmount(payment.advanceOther),
})

const getGross = (draft: DraftPayment) =>
    toAmount(draft.runningTa) +
    toAmount(draft.fixedTa) +
    toAmount(draft.other)

const getDeduction = (draft: DraftPayment) =>
    toAmount(draft.miscellaneous) +
    toAmount(draft.advanceTa) +
    toAmount(draft.advanceOther)

const getNet = (draft: DraftPayment) =>
    getGross(draft) - getDeduction(draft)

const isValidAmountInput = (value: string) =>
    value === "" || /^\d*\.?\d{0,2}$/.test(value)

export default function Payments() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [paymentPeriods, setPaymentPeriods] = useState<PaymentPeriod[]>([])
    const [categories, setCategories] = useState<EmployeeCategory[]>([])
    const [banks, setBanks] = useState<Bank[]>([])

    const [selectedPaymentPeriodId, setSelectedPaymentPeriodId] =
        useState("")
    const [paymentDate, setPaymentDate] = useState(getToday)
    // Payment Batch (V2)
    const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([])
    const [selectedPaymentBatchId, setSelectedPaymentBatchId] = useState("")
    const [loadingPaymentBatches, setLoadingPaymentBatches] = useState(false)
    const [selectedMonthToCreate, setSelectedMonthToCreate] = useState("")
    const [batchCalendarExpanded, setBatchCalendarExpanded] = useState(false)
    const [monthCalendarYear, setMonthCalendarYear] = useState(
        new Date().getFullYear()
    )
    const [creatingPaymentBatch, setCreatingPaymentBatch] = useState(false)

    // V2: separate employee and per-period values for a multi-month payment.
    const [multiMonthEmployeeId, setMultiMonthEmployeeId] = useState("")
    const [multiMonthModalOpen, setMultiMonthModalOpen] = useState(false)
    const [multiMonthPaymentId, setMultiMonthPaymentId] =
        useState<number | null>(null)

    const [loadingMultiMonthDraft, setLoadingMultiMonthDraft] =
        useState(false)
    const [selectedMultiPeriodIds, setSelectedMultiPeriodIds] = useState<number[]>([])
    const [multiMonthAmounts, setMultiMonthAmounts] = useState<
        Record<number, PaymentMonthlyDetailRequest>
    >({})

    const [eligiblePeriods, setEligiblePeriods] =
        useState<EligiblePaymentPeriod[]>([])

    const [loadingEligiblePeriods, setLoadingEligiblePeriods] =
        useState(false)


    // Keep the months already saved in a draft visible even when they fall
    // outside the rolling 12-month window used for new payment selection.
    const displayedEligiblePeriods = useMemo(() => {
        const byId = new Map<number, EligiblePaymentPeriod>()
        for (const period of eligiblePeriods) byId.set(period.id, period)

        if (multiMonthPaymentId) {
            for (const periodId of selectedMultiPeriodIds) {
                if (byId.has(periodId)) continue
                const configured = paymentPeriods.find((item) => item.id === periodId)
                if (!configured) continue
                byId.set(periodId, {
                    id: configured.id,
                    month: configured.month,
                    year: configured.year,
                    status: "RESERVED",
                    eligible: true,
                    reason: "This month belongs to the draft currently being edited.",
                })
            }
        }

        return [...byId.values()].sort((a, b) => a.year - b.year || a.month - b.month)
    }, [eligiblePeriods, paymentPeriods, selectedMultiPeriodIds, multiMonthPaymentId])

    const [existingPayments, setExistingPayments] =
        useState<Record<number, PaymentSummaryRecord>>({})
    const [drafts, setDrafts] =
        useState<Record<number, DraftPayment>>({})
    type MultiMonthDraft = Awaited<ReturnType<typeof getPaymentById>>

    // Complete batch history: OPEN and CLOSED
    const [allPaymentBatches, setAllPaymentBatches] = useState<PaymentBatch[]>([])
    const [loadingBatchHistory, setLoadingBatchHistory] = useState(false)
    const [batchHistoryExpanded, setBatchHistoryExpanded] = useState(false)


// Batch dialogs
    const [batchToClose, setBatchToClose] = useState<PaymentBatch | null>(null)
    const [batchToView, setBatchToView] = useState<PaymentBatch | null>(null)

    const [multiMonthDrafts, setMultiMonthDrafts] =
        useState<MultiMonthDraft[]>([])
    const [paymentHistory, setPaymentHistory] = useState<
        { paymentPeriodId: number; payment: PaymentSummaryRecord }[]
    >([])
    const [, setEditingIds] =
        useState<Set<number>>(new Set())

    const [dirtyIds, setDirtyIds] =
        useState<Set<number>>(new Set())

    const [search, setSearch] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [bankId, setBankId] = useState("")
    const [statusFilter, setStatusFilter] = useState<
        "ALL" | "DRAFT" | "APPROVED"
    >("ALL")

    const [currentPage, setCurrentPage] = useState(0)

    const [loading, setLoading] = useState(true)
    const [loadingPayments, setLoadingPayments] = useState(false)
    const [saving, setSaving] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const [errorMessage, setErrorMessage] = useState("")
    const [successMessage, setSuccessMessage] = useState("")

    const [approvalToConfirm, setApprovalToConfirm] = useState<{
        paymentId: number
        employeeName: string
        employeeCode: string
    } | null>(null)

    // True only when the selected batch exists in the OPEN batch list.
    const hasSelectedOpenBatch = useMemo(
        () =>
            Boolean(selectedPaymentBatchId) &&
            paymentBatches.some(
                (batch) =>
                    String(batch.id) === selectedPaymentBatchId &&
                    batch.status === "OPEN",
            ),
        [paymentBatches, selectedPaymentBatchId],
    )


    const loadAllEmployees = useCallback(async () => {
        const firstPage =
            (await getEmployees(
                0,
                EMPLOYEE_LOAD_SIZE,
            )) as EmployeePage

        const firstEmployees = firstPage.content ?? []

        if (firstPage.totalPages <= 1) {
            return firstEmployees
        }

        const remainingPages = await Promise.all(
            Array.from(
                { length: firstPage.totalPages - 1 },
                (_, index) =>
                    getEmployees(
                        index + 1,
                        EMPLOYEE_LOAD_SIZE,
                    ) as Promise<EmployeePage>,
            ),
        )

        return [
            ...firstEmployees,
            ...remainingPages.flatMap(
                (page) => page.content ?? [],
            ),
        ]
    }, [])

    const loadAllPaymentsForPeriod = useCallback(
        async (paymentPeriodId: number) => {
            const firstPage =
                await getPaymentSummary(
                    0,
                    PAYMENT_LOAD_SIZE,
                    { paymentPeriodId },
                )

            const firstPayments = firstPage.content ?? []

            if (firstPage.totalPages <= 1) {
                return firstPayments
            }

            const remainingPages = await Promise.all(
                Array.from(
                    { length: firstPage.totalPages - 1 },
                    (_, index) =>
                        getPaymentSummary(
                            index + 1,
                            PAYMENT_LOAD_SIZE,
                            { paymentPeriodId },
                        ),
                ),
            )

            return [
                ...firstPayments,
                ...remainingPages.flatMap(
                    (page) => page.content ?? [],
                ),
            ]
        },
        [],
    )


    const loadAllPaymentHistory = useCallback(async (periods: PaymentPeriod[]) => {
        const historyByPeriod = await Promise.all(
            periods.map(async (period) => ({
                paymentPeriodId: period.id,
                payments: await loadAllPaymentsForPeriod(period.id),
            })),
        )

        return historyByPeriod.flatMap(({ paymentPeriodId, payments }) =>
            payments.map((payment) => ({ paymentPeriodId, payment })),
        )
    }, [loadAllPaymentsForPeriod])

    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true)
            setErrorMessage("")

            const [
                employeeList,
                periods,
                categoryList,
                bankList,
                multiMonthDraftList,
                batchList,
            ] = await Promise.all([
                loadAllEmployees(),
                getPaymentPeriods(),
                getEmployeeCategories(),
                getBanks(),
                getAllMultiMonthDrafts(),
                getPaymentBatches(),
            ])

            const paymentHistoryList = await loadAllPaymentHistory(periods)

            setEmployees(employeeList)
            setPaymentPeriods(periods)
            setPaymentHistory(paymentHistoryList)
            setCategories(categoryList)
            setBanks(bankList)
            setMultiMonthDrafts(multiMonthDraftList)

            setAllPaymentBatches(
                [...batchList].sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                ),
            )

            const openPeriod = periods.find(
                (period) =>
                    period.status?.toUpperCase() === "OPEN",
            )

            const initialPeriod =
                openPeriod ?? periods[0]

            if (initialPeriod) {
                setSelectedPaymentPeriodId(
                    String(initialPeriod.id),
                )
            }
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to load payment entry data.",
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [loadAllEmployees, loadAllPaymentHistory])

    const loadPaymentsForSelectedPeriod = useCallback(
        async (periodId: string) => {
            if (!periodId) {
                setExistingPayments({})
                setDrafts({})
                setEditingIds(new Set())
                setDirtyIds(new Set())
                return
            }

            try {
                setLoadingPayments(true)
                setErrorMessage("")
                setSuccessMessage("")

                const payments =
                    await loadAllPaymentsForPeriod(
                        Number(periodId),
                    )

                const paymentMap: Record<
                    number,
                    PaymentSummaryRecord
                > = {}

                const draftMap: Record<
                    number,
                    DraftPayment
                > = {}

                for (const payment of payments) {
                    paymentMap[payment.employeeId] = payment
                    draftMap[payment.employeeId] =
                        paymentToDraft(payment)
                }

                setExistingPayments(paymentMap)
                setDrafts(draftMap)
                setEditingIds(new Set())
                setDirtyIds(new Set())
                setCurrentPage(0)
            } catch (error) {
                console.error(error)
                setExistingPayments({})
                setDrafts({})
                setEditingIds(new Set())
                setDirtyIds(new Set())
                setErrorMessage(
                    getApiErrorMessage(
                        error,
                        "Failed to load payments for the selected period.",
                    ),
                )
            } finally {
                setLoadingPayments(false)
            }
        },
        [loadAllPaymentsForPeriod],
    )

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadInitialData()
        }, 0)

        return () => window.clearTimeout(timer)
    }, [loadInitialData])

    useEffect(() => {
        if (!selectedPaymentPeriodId) return

        const timer = window.setTimeout(() => {
            void loadPaymentsForSelectedPeriod(
                selectedPaymentPeriodId,
            )
        }, 0)

        return () => window.clearTimeout(timer)
    }, [
        selectedPaymentPeriodId,
        loadPaymentsForSelectedPeriod,
    ])

    useEffect(() => {
        if (!multiMonthEmployeeId || !multiMonthModalOpen) {
            return
        }

        let cancelled = false

        const loadEligiblePeriods = async () => {
            setLoadingEligiblePeriods(true)
            setEligiblePeriods([])

            try {
                const periods = await getEligiblePaymentPeriods(
                    Number(multiMonthEmployeeId),
                )

                if (!cancelled) {
                    setEligiblePeriods(periods)
                }
            } catch (error) {
                if (!cancelled) {
                    setEligiblePeriods([])
                    setSelectedMultiPeriodIds([])

                    setErrorMessage(
                        getApiErrorMessage(
                            error,
                            "Failed to load eligible payment periods.",
                        ),
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoadingEligiblePeriods(false)
                }
            }
        }

        void loadEligiblePeriods()

        return () => {
            cancelled = true
        }
    }, [multiMonthEmployeeId, multiMonthModalOpen])

    const filteredEmployees = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()

        return employees.filter((employee) => {
            const matchesSearch =
                !normalizedSearch ||
                employee.employeeCode
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                employee.name
                    .toLowerCase()
                    .includes(normalizedSearch)

            const matchesCategory =
                !categoryId ||
                String(employee.categoryId) === categoryId

            const matchesBank =
                !bankId ||
                String(employee.bankId ?? "") === bankId

            // Same draft sources used by the employee table.
            const hasDraft =
                multiMonthDrafts.some(
                    (payment) =>
                        payment.employeeId === employee.id &&
                        payment.status === "DRAFT" &&
                        (payment.monthlyDetails?.length ?? 0) >= 1
                ) ||
                existingPayments[employee.id]?.status === "DRAFT"

            // Check approved/paid payment records across payment history.
            const hasApprovedPayment =
                paymentHistory.some(
                    ({ payment }) =>
                        payment.employeeId === employee.id &&
                        ["APPROVED", "PAID"].includes(
                            String(payment.status ?? "").toUpperCase()
                        )
                )

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "DRAFT" && hasDraft) ||
                (statusFilter === "APPROVED" &&
                    !hasDraft &&
                    hasApprovedPayment)

            return (
                matchesSearch &&
                matchesCategory &&
                matchesBank &&
                matchesStatus
            )
        })
    }, [
        employees,
        search,
        categoryId,
        bankId,
        statusFilter,
        existingPayments,
        multiMonthDrafts,
        paymentHistory,
    ])

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredEmployees.length /
            ROWS_PER_PAGE,
        ),
    )

    const safeCurrentPage = Math.min(
        currentPage,
        totalPages - 1,
    )

    const visibleEmployees = useMemo(() => {
        const start =
            safeCurrentPage * ROWS_PER_PAGE

        return filteredEmployees.slice(
            start,
            start + ROWS_PER_PAGE,
        )
    }, [
        filteredEmployees,
        safeCurrentPage,
    ])

    const pendingCount = useMemo(
        () =>
            employees.filter(
                (employee) =>
                    !existingPayments[employee.id],
            ).length,
        [employees, existingPayments],
    )

    const enteredCount = employees.length - pendingCount

    const dirtyCount = dirtyIds.size

    const invalidDirtyIds = useMemo(
        () => {
            const invalid = new Set<number>()

            for (const employeeId of dirtyIds) {
                const draft =
                    drafts[employeeId] ??
                    emptyDraft()

                if (getNet(draft) < 0) {
                    invalid.add(employeeId)
                }
            }

            return invalid
        },
        [dirtyIds, drafts],
    )

    const invalidDirtyCount = invalidDirtyIds.size

    const startEditing = (employeeId: number) => {
        const existing = existingPayments[employeeId]

        setDrafts((current) => ({
            ...current,
            [employeeId]: paymentToDraft(existing),
        }))

        setEditingIds((current) => {
            const next = new Set(current)
            next.add(employeeId)
            return next
        })

        setDirtyIds((current) => {
            const next = new Set(current)
            next.delete(employeeId)
            return next
        })

        setErrorMessage("")
        setSuccessMessage("")
    }

    const handleApprove = async (employeeId: number) => {
        const existing = existingPayments[employeeId]

        if (!existing || existing.status !== "DRAFT") {
            return
        }

        if (!existing.paymentId) {
            setErrorMessage(
                "Payment ID is missing. Cannot approve payment.",
            )
            return
        }

        const draft =
            drafts[employeeId] ??
            paymentToDraft(existing)

        if (getNet(draft) < 0) {
            setErrorMessage(
                "Net Payment cannot be negative. Deduction total cannot exceed gross total. Correct the amounts before approval."
            )
            return
        }

        try {
            setSaving(true)

            setErrorMessage("")
            setSuccessMessage("")

            const response =
                await approvePayment(
                    existing.paymentId,
                )

            // Update local payment
            setExistingPayments((current) => ({
                ...current,
                [employeeId]: {
                    ...current[employeeId],
                    paymentId: response.id,
                    runningTa: response.runningTa,
                    fixedTa: response.fixedTa,
                    other: response.other,
                    grossTotal:
                    response.grossTotal,
                    miscellaneous:
                    response.miscellaneous,
                    advanceTa:
                    response.advanceTa,
                    advanceOther:
                    response.advanceOther,
                    deductionTotal:
                    response.deductionTotal,
                    netPayment:
                    response.netPayment,
                    status:
                    response.status,
                    paymentDate:
                    response.paymentDate,
                },
            }))

            // Approved payment must leave edit mode
            setEditingIds((current) => {
                const next = new Set(current)
                next.delete(employeeId)
                return next
            })

            setDirtyIds((current) => {
                const next = new Set(current)
                next.delete(employeeId)
                return next
            })

            // Reload the selected month's payment data.
            if (selectedPaymentPeriodId) {
                await loadPaymentsForSelectedPeriod(
                    selectedPaymentPeriodId,
                )
            }

// IMPORTANT: Refresh payment history so employee progress
// reflects the newly approved payment.
            setPaymentHistory(
                await loadAllPaymentHistory(paymentPeriods)
            )

            setSuccessMessage(
                `Payment approved successfully for ${response.employeeName} (${response.employeeCode}).`,
            )
        } catch (error) {
            console.error(error)

            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to approve payment.",
                ),
            )
        } finally {
            setSaving(false)
        }
    }

    const handleApproveMultiMonthDraft = (
        paymentId: number,
        employeeName: string,
        employeeCode: string,
    ) => {
        setApprovalToConfirm({
            paymentId,
            employeeName,
            employeeCode,
        })
    }

    const confirmApproveMultiMonthDraft = async () => {
        if (!approvalToConfirm) return

        const { paymentId, employeeName, employeeCode } =
            approvalToConfirm

        try {
            setSaving(true)
            setErrorMessage("")
            setSuccessMessage("")

            await approvePayment(paymentId)

            setMultiMonthDrafts(await getAllMultiMonthDrafts())

            if (selectedPaymentPeriodId) {
                await loadPaymentsForSelectedPeriod(
                    selectedPaymentPeriodId,
                )
            }

            setPaymentHistory(
                await loadAllPaymentHistory(paymentPeriods)
            )

            setApprovalToConfirm(null)

            setSuccessMessage(
                `Payment approved successfully for ${employeeName} (${employeeCode}).`
            )
        } catch (error) {
            console.error(error)

            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to approve the multi-month draft.",
                )
            )
        } finally {
            setSaving(false)
        }
    }

    const clearFilters = () => {
        setSearch("")
        setCategoryId("")
        setBankId("")
        setStatusFilter("ALL")
        setCurrentPage(0)
        setErrorMessage("")
        setSuccessMessage("")
    }

    const refresh = async () => {
        try {
            setRefreshing(true)
            setErrorMessage("")
            setSuccessMessage("")

            const employeeList =
                await loadAllEmployees()

            setEmployees(employeeList)
            setPaymentHistory(await loadAllPaymentHistory(paymentPeriods))
            await Promise.all([
                loadOpenPaymentBatches(),
                loadBatchHistory(),
            ])

            if (selectedPaymentPeriodId) {
                setMultiMonthDrafts(await getAllMultiMonthDrafts())
                await loadPaymentsForSelectedPeriod(
                    selectedPaymentPeriodId,
                )
            }
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to refresh payment entry.",
                ),
            )
        } finally {
            setRefreshing(false)
        }
    }


    const loadOpenPaymentBatches = useCallback(async () => {
        try {
            setLoadingPaymentBatches(true)

            const batches = await getOpenPaymentBatches()

            // Show the newest batch month first.
            const sortedBatches = [...batches].sort((a, b) =>
                (b.batchMonth ?? "").localeCompare(a.batchMonth ?? "")
            )

            setPaymentBatches(sortedBatches)

            // Preserve the user's selection if it is still OPEN.
            // Otherwise, automatically select the latest OPEN batch.
            setSelectedPaymentBatchId((current) => {
                const currentBatchStillOpen = sortedBatches.some(
                    (batch) =>
                        String(batch.id) === current &&
                        batch.status?.toUpperCase() === "OPEN"
                )

                if (currentBatchStillOpen) {
                    return current
                }

                const latestOpenBatch = sortedBatches.find(
                    (batch) => batch.status?.toUpperCase() === "OPEN"
                )

                return latestOpenBatch
                    ? String(latestOpenBatch.id)
                    : ""
            })
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to load open payment batches."
                )
            )
        } finally {
            setLoadingPaymentBatches(false)
        }
    }, [])


    const loadBatchHistory = useCallback(async () => {
        try {
            setLoadingBatchHistory(true)

            const batches = await getPaymentBatches()

            setAllPaymentBatches(
                [...batches].sort((a, b) => {
                    return (
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                }),
            )
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(error, "Failed to load batch history."),
            )
        } finally {
            setLoadingBatchHistory(false)
        }
    }, [])


    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadOpenPaymentBatches()
        }, 0)

        return () => window.clearTimeout(timer)
    }, [loadOpenPaymentBatches])

    const handleCreatePaymentBatch = async () => {
        if (!selectedMonthToCreate) {
            setErrorMessage("Please select a month to create its payment batch.")
            return
        }

        const batchMonth = `${selectedMonthToCreate}-01`

        try {
            setCreatingPaymentBatch(true)
            setErrorMessage("")
            setSuccessMessage("")

            const createdBatch = await createPaymentBatch(batchMonth)

            const batches = await getOpenPaymentBatches()

            await loadBatchHistory()

            setPaymentBatches(batches)
            setSelectedPaymentBatchId(String(createdBatch.id))
            setSelectedMonthToCreate("")

            setSuccessMessage(
                `${createdBatch.batchName} created and selected successfully.`
            )
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to create the payment batch."
                )
            )
        } finally {
            setCreatingPaymentBatch(false)
        }
    }

    const updateMultiMonthAmount = (
        periodId: number,
        field: keyof Omit<PaymentMonthlyDetailRequest, "paymentPeriodId">,
        value: string,
    ) => {
        if (!isValidAmountInput(value)) return

        setMultiMonthAmounts((current) => ({
            ...current,
            [periodId]: {
                paymentPeriodId: periodId,
                runningTa: current[periodId]?.runningTa ?? 0,
                fixedTa: current[periodId]?.fixedTa ?? 0,
                other: current[periodId]?.other ?? 0,
                miscellaneous: current[periodId]?.miscellaneous ?? 0,
                advanceTa: current[periodId]?.advanceTa ?? 0,
                advanceOther: current[periodId]?.advanceOther ?? 0,
                [field]: value === "" ? 0 : Number(value),
            },
        }))
        setErrorMessage("")
        setSuccessMessage("")
    }


    const loadMultiMonthDraft = async (
        paymentIdOverride?: number,
        employeeIdOverride?: number,
    ) => {
        const employeeId = employeeIdOverride ?? Number(multiMonthEmployeeId)

        if (!employeeId) {
            setErrorMessage("Please select an employee first.")
            return
        }

        const existing = existingPayments[employeeId]
        const paymentId = paymentIdOverride ?? existing?.paymentId

        if (!paymentId) {
            setErrorMessage(
                "No draft payment ID is available for this employee in the selected period. Select the period containing the draft or open the draft from its row.",
            )
            return
        }

        try {
            setLoadingMultiMonthDraft(true)
            setErrorMessage("")
            setSuccessMessage("")

            const payment = await getPaymentById(paymentId)

            if (payment.status !== "DRAFT") {
                setErrorMessage("Only draft payments can be edited.")
                return
            }
            if (payment.employeeId !== employeeId) {
                setErrorMessage("This draft does not belong to the selected employee.")
                return
            }

            const details = payment.monthlyDetails ?? []
            if (details.length === 0) {
                setErrorMessage("This payment has no monthly details to edit.")
                return
            }

            const amounts: Record<number, PaymentMonthlyDetailRequest> = {}
            for (const detail of details) {
                amounts[detail.paymentPeriodId] = {
                    paymentPeriodId: detail.paymentPeriodId,
                    runningTa: detail.runningTa,
                    fixedTa: detail.fixedTa,
                    other: detail.other,
                    miscellaneous: detail.miscellaneous,
                    advanceTa: detail.advanceTa,
                    advanceOther: detail.advanceOther,
                }
            }

            setMultiMonthEmployeeId(String(employeeId))
            setMultiMonthPaymentId(payment.id)
            setPaymentDate(payment.paymentDate)
            setSelectedMultiPeriodIds(details.map((detail) => detail.paymentPeriodId))
            setMultiMonthAmounts(amounts)
            setMultiMonthModalOpen(true)
            setSuccessMessage("")
        } catch (error) {
            console.error(error)
            setErrorMessage(getApiErrorMessage(error, "Failed to load the multi-month draft."))
        } finally {
            setLoadingMultiMonthDraft(false)
        }
    }


    const saveMultiMonthPayment = async () => {
        setErrorMessage("")
        setSuccessMessage("")

        if (!multiMonthEmployeeId) {
            setErrorMessage("Please select an employee for the multi-month payment.")
            return
        }
        if (!multiMonthPaymentId && !selectedPaymentBatchId) {
            setErrorMessage(
                "No batch selected. Please select a batch before payment entry.",
            )
            return
        }
        if (!paymentDate) {
            setErrorMessage("Please select a payment date.")
            return
        }
        if (selectedMultiPeriodIds.length === 0) {
            setErrorMessage("Select at least one payment month.")
            return
        }



        const monthlyDetails = selectedMultiPeriodIds
            .slice()
            .sort((a, b) => {
                const pa = paymentPeriods.find((p) => p.id === a)
                const pb = paymentPeriods.find((p) => p.id === b)
                if (!pa || !pb) return a - b
                return pa.year - pb.year || pa.month - pb.month
            })
            .map((periodId) => {
                const amount = multiMonthAmounts[periodId]
                return {
                    paymentPeriodId: periodId,
                    runningTa: Number(amount?.runningTa ?? 0),
                    fixedTa: Number(amount?.fixedTa ?? 0),
                    other: Number(amount?.other ?? 0),
                    miscellaneous: Number(amount?.miscellaneous ?? 0),
                    advanceTa: Number(amount?.advanceTa ?? 0),
                    advanceOther: Number(amount?.advanceOther ?? 0),
                }
            })

        const hasNegativeNet = monthlyDetails.some((detail) => {
            const gross = detail.runningTa + detail.fixedTa + detail.other
            const deductions = detail.miscellaneous + detail.advanceTa + detail.advanceOther
            return deductions > gross
        })

        if (hasNegativeNet) {
            setErrorMessage(
                "At least one selected month has deductions greater than gross payment. Correct the highlighted month amounts before saving.",
            )
            return
        }

        try {
            setSaving(true)
            const response = multiMonthPaymentId
                ? await updateMultiMonthPayment(multiMonthPaymentId, {
                    paymentDate,
                    monthlyDetails,
                })
                : await createMultiMonthPayment({
                    employeeId: Number(multiMonthEmployeeId),
                    paymentBatchId: Number(selectedPaymentBatchId),
                    paymentDate,
                    monthlyDetails,
                })

            const savedPaymentId = response.payment.id

            setMultiMonthPaymentId(savedPaymentId)
            setSuccessMessage(
                multiMonthPaymentId
                    ? "Payment draft updated successfully."
                    : "Payment draft saved successfully."
            )

            await loadPaymentsForSelectedPeriod(selectedPaymentPeriodId)
            setMultiMonthDrafts(await getAllMultiMonthDrafts())
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(error, "Failed to save the multi-month payment."),
            )
        } finally {
            setSaving(false)
        }
    }

    const handleCancelMultiMonthDraft = async () => {
        if (!multiMonthPaymentId) return

        const confirmed = window.confirm(
            "Are you sure you want to cancel this draft? Its reserved months will be released.",
        )

        if (!confirmed) return

        try {
            setSaving(true)
            setErrorMessage("")
            setSuccessMessage("")

            await cancelDraftPayment(multiMonthPaymentId)

            setMultiMonthPaymentId(null)
            setSelectedMultiPeriodIds([])
            setMultiMonthAmounts({})
            setMultiMonthModalOpen(false)

            await loadPaymentsForSelectedPeriod(selectedPaymentPeriodId)
            setMultiMonthDrafts(await getAllMultiMonthDrafts())

            setPaymentHistory(
                await loadAllPaymentHistory(paymentPeriods),
            )

            setSuccessMessage("Multi-month draft cancelled successfully.")
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to cancel the multi-month draft.",
                ),
            )
        } finally {
            setSaving(false)
        }
    }

    const handleClosePaymentBatch = () => {
        if (!hasSelectedOpenBatch) {
            setErrorMessage(
                "No batch selected. Please select an open batch before closing.",
            )
            return
        }

        const selectedBatch = paymentBatches.find(
            (batch) => String(batch.id) === selectedPaymentBatchId,
        )

        if (!selectedBatch) {
            setErrorMessage("The selected payment batch could not be found.")
            return
        }

        setErrorMessage("")
        setBatchToClose(selectedBatch)
    }

    const confirmClosePaymentBatch = async () => {
        if (!batchToClose) return

        try {
            setSaving(true)
            setErrorMessage("")
            setSuccessMessage("")

            await closePaymentBatch(batchToClose.id)

            const closedBatchName = batchToClose.batchName

            setBatchToClose(null)
            setSelectedPaymentBatchId("")

            await Promise.all([
                loadOpenPaymentBatches(),
                loadBatchHistory(),
            ])

            setSuccessMessage(`${closedBatchName} closed successfully.`)
        } catch (error) {
            console.error(error)
            setErrorMessage(
                getApiErrorMessage(error, "Failed to close the payment batch."),
            )
        } finally {
            setSaving(false)
        }
    }

    const goToPreviousPage = () => {
        if (safeCurrentPage <= 0 || saving) return
        setCurrentPage(safeCurrentPage - 1)
    }

    const goToNextPage = () => {
        if (
            safeCurrentPage >= totalPages - 1 ||
            saving
        ) {
            return
        }

        setCurrentPage(safeCurrentPage + 1)
    }

    const showingFrom =
        filteredEmployees.length === 0
            ? 0
            : safeCurrentPage * ROWS_PER_PAGE + 1

    const showingTo = Math.min(
        (safeCurrentPage + 1) *
        ROWS_PER_PAGE,
        filteredEmployees.length,
    )

    if (loading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading payment entry...
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    {/*<div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">*/}
                    {/*    <CalendarDays className="h-4 w-4" />*/}
                    {/*    Payment Administration*/}
                    {/*</div>*/}

                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Payment Entry
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Create single-month or multi-month employee TA payments.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refresh()}
                    disabled={refreshing || saving}
                    className="h-10 rounded-xl border-slate-200 bg-white px-4"
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                            refreshing
                                ? "animate-spin"
                                : ""
                        }`}
                    />
                    Refresh
                </Button>
            </div>

            {errorMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {successMessage && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {invalidDirtyCount > 0 && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm"
                >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <div>
                        <div className="font-semibold">
                            Negative Net Payment
                        </div>
                        <div className="mt-0.5">
                            {invalidDirtyCount} unsaved{" "}
                            {invalidDirtyCount === 1
                                ? "entry has"
                                : "entries have"}{" "}
                            deductions greater than gross payment. Negative net payment cannot be saved.
                        </div>
                    </div>
                </div>
            )}

            <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* Payment Batch Heading */}
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Payment Batch
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Create or select an open batch. New payment entries will be saved to the selected batch.
                        </p>
                    </div>

                    {/* Payment Date - Right Side */}
                    <div className="w-full space-y-1.5 sm:w-[220px] sm:shrink-0">
                        <Label
                            htmlFor="payment-date"
                            className="text-sm font-medium text-slate-700"
                        >
                            Payment Date
                        </Label>

                        <Input
                            id="payment-date"
                            type="date"
                            value={paymentDate}
                            onChange={(event) =>
                                setPaymentDate(event.target.value)
                            }
                            className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                    </div>

                </div>



                <div className="space-y-5">

                    {/* Existing Open Batch */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                            <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor="payment-batch">
                                    Selected Open Batch
                                </Label>

                                <select
                                    id="payment-batch"
                                    value={selectedPaymentBatchId}
                                    onChange={(event) =>
                                        setSelectedPaymentBatchId(event.target.value)
                                    }
                                    disabled={
                                        loadingPaymentBatches ||
                                        creatingPaymentBatch ||
                                        saving
                                    }
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                >
                                    <option value="">
                                        {loadingPaymentBatches
                                            ? "Loading open batches..."
                                            : "Select an open batch"}
                                    </option>

                                    {paymentBatches.map((batch) => (
                                        <option
                                            key={batch.id}
                                            value={String(batch.id)}
                                        >
                                            {batch.batchName}
                                        </option>
                                    ))}
                                </select>

                                {selectedPaymentBatchId && (
                                    <p className="text-xs text-slate-500">
                                        Selected batch:
                                        {" "}
                                        {paymentBatches.find(
                                            (batch) =>
                                                String(batch.id) === selectedPaymentBatchId
                                        )?.batchName ?? "Not found"}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="button"
                                onClick={handleClosePaymentBatch}
                                disabled={
                                    !hasSelectedOpenBatch ||
                                    loadingPaymentBatches ||
                                    creatingPaymentBatch ||
                                    saving
                                }
                                className="h-8 shrink-0 rounded-full border-0 bg-red-100 px-4 text-sm font-medium text-red-600 shadow-none hover:bg-red-200"
                            >
                                <Lock className="mr-1.5 h-3.5 w-3.5" />
                                {(() => {
                                    const batch = paymentBatches.find(
                                        (item) =>
                                            String(item.id) === selectedPaymentBatchId
                                    )

                                    return batch
                                        ? `Close ${new Date(
                                            `${batch.batchMonth.slice(0, 7)}-01T00:00:00`
                                        ).toLocaleString("en-IN", {
                                            month: "long",
                                        })} Batch`
                                        : "Close Batch"
                                })()}
                            </Button>
                        </div>
                    </div>

                    {/* Create New Monthly Batch */}
                    <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                            {/* Collapsible Calendar Heading */}
                            <button
                                type="button"
                                onClick={() =>
                                    setBatchCalendarExpanded((current) => !current)
                                }
                                aria-expanded={batchCalendarExpanded}
                                className="flex items-center gap-3 text-left"
                            >
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        Create New Monthly Batch
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Select an available month. Each month can have only one batch.
                                    </p>
                                </div>

                                <ChevronDown
                                    className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
                                        batchCalendarExpanded ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {/* Year Navigation */}
                            {batchCalendarExpanded && (
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setMonthCalendarYear((year) => year - 1)
                                        }
                                        disabled={creatingPaymentBatch || saving}
                                        className="h-8 w-8 rounded-lg p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <span className="min-w-[90px] text-center font-semibold text-slate-800">
                {monthCalendarYear}
            </span>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setMonthCalendarYear((year) => year + 1)
                                        }
                                        disabled={creatingPaymentBatch || saving}
                                        className="h-8 w-8 rounded-lg p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                        </div>

                        {batchCalendarExpanded && (
                            <>

                        {/* Month Status Legend */}
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                Open
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                                Closed
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full border border-indigo-400 bg-white" />
                                Available
                            </div>
                        </div>

                        {/* Month Calendar */}
                        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">

                            {Array.from({ length: 12 }, (_, index) => {
                                const monthNumber = index + 1
                                const monthValue =
                                    `${monthCalendarYear}-${String(monthNumber).padStart(2, "0")}`

                                const existingBatch = allPaymentBatches.find(
                                    (batch) =>
                                        batch.batchMonth?.slice(0, 7) === monthValue
                                )

                                const isPreLaunch = monthValue < "2026-11"

                                const isOpen =
                                    !isPreLaunch && existingBatch?.status === "OPEN"

                                const isClosed =
                                    !isPreLaunch && existingBatch?.status === "CLOSED"

                                const isAvailable =
                                    !isPreLaunch && !existingBatch

                                const isSelected =
                                    selectedMonthToCreate === monthValue

                                const monthLabel = new Date(
                                    monthCalendarYear,
                                    index,
                                    1
                                ).toLocaleString("en-IN", {
                                    month: "short",
                                })

                                return (
                                    <button
                                        key={monthValue}
                                        type="button"
                                        disabled={
                                            !isAvailable ||
                                            creatingPaymentBatch ||
                                            saving
                                        }
                                        onClick={() => {
                                            setSelectedMonthToCreate((current) =>
                                                current === monthValue ? "" : monthValue
                                            )
                                            setErrorMessage("")
                                            setSuccessMessage("")
                                        }}
                                        className={`flex min-h-[76px] flex-col items-center justify-center rounded-xl border px-2 py-3 transition
    ${
                                            isPreLaunch
                                                ? "border-slate-200 bg-slate-100 text-slate-400"
                                                : isSelected
                                                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                                                    : isOpen
                                                        ? "border-emerald-200 bg-emerald-50"
                                                        : isClosed
                                                            ? "border-slate-200 bg-slate-100"
                                                            : "border-indigo-100 bg-white hover:border-indigo-400 hover:bg-indigo-50"
                                        }
    ${
                                            !isAvailable
                                                ? "cursor-not-allowed"
                                                : "cursor-pointer"
                                        }`}
                                    >
                        <span className="text-sm font-semibold text-slate-800">
                            {monthLabel}
                        </span>

                                        <span
                                            className={`mt-1 text-[10px] font-semibold uppercase tracking-wide
                                ${
                                                isOpen
                                                    ? "text-emerald-700"
                                                    : isClosed
                                                        ? "text-slate-500"
                                                        : isSelected
                                                            ? "text-indigo-700"
                                                            : "text-indigo-500"
                                            }`}
                                        >
                            {isPreLaunch
                                ? "Pre-launch"
                                : isOpen
                                    ? "Open"
                                    : isClosed
                                        ? "Closed"
                                        : isSelected
                                            ? "Selected"
                                            : "Available"}
                        </span>
                                    </button>
                                )
                            })}

                        </div>

                        {/* Selected Month and Create Button */}
                        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                            <div className="text-sm text-slate-600">
                                {selectedMonthToCreate ? (
                                    <>
                                        New batch month:
                                        {" "}
                                        <span className="font-semibold text-slate-900">
                            {new Date(
                                `${selectedMonthToCreate}-01T00:00:00`
                            ).toLocaleString("en-IN", {
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                                    </>
                                ) : (
                                    "Select an available month from the calendar."
                                )}
                            </div>

                            <Button
                                type="button"
                                onClick={() => void handleCreatePaymentBatch()}
                                disabled={
                                    !selectedMonthToCreate ||
                                    creatingPaymentBatch ||
                                    loadingPaymentBatches ||
                                    saving
                                }
                                className="h-8 rounded-full bg-emerald-100 px-4 text-sm font-medium text-emerald-700 shadow-none hover:bg-emerald-200"
                            >
                                {creatingPaymentBatch ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                                        Create
                                        {" "}
                                        {selectedMonthToCreate
                                            ? new Date(
                                                `${selectedMonthToCreate}-01T00:00:00`
                                            ).toLocaleString("en-IN", {
                                                month: "long",
                                            })
                                            : "Monthly"}
                                        {" "}Batch
                                    </>
                                )}
                            </Button>
                        </div>
                            </>
                        )}
                    </div>

                </div>
            </section>

                {/* Batch History */}
            {/* Collapsible Batch History */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* Always visible header */}
                <button
                    type="button"
                    onClick={() => setBatchHistoryExpanded((current) => !current)}
                    aria-expanded={batchHistoryExpanded}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/70"
                >
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Batch History
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            View previously created batches and their current status.
                            <span className="ml-2 font-medium text-slate-700">
                    ({allPaymentBatches.length} batches)
                </span>
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
            {/*<span className="hidden text-xs text-slate-500 sm:inline">*/}
            {/*    {batchHistoryExpanded ? "Hide History" : "Show History"}*/}
            {/*</span>*/}

                        <ChevronDown
                            className={`h-5 w-5 text-slate-500 transition-transform ${
                                batchHistoryExpanded ? "rotate-180" : ""
                            }`}
                        />

                    </div>
                </button>

                {/* Expandable content */}
                {batchHistoryExpanded && (
                    <>
                        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void loadBatchHistory()}
                                disabled={loadingBatchHistory}
                                className="h-9 rounded-lg"
                            >
                                {loadingBatchHistory ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Refresh History
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-sm">
                                <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-left">
                                    <th className="px-5 py-3 font-semibold text-slate-700">
                                        Batch Name
                                    </th>
                                    <th className="px-5 py-3 font-semibold text-slate-700">
                                        Created On
                                    </th>
                                    <th className="px-5 py-3 font-semibold text-slate-700">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 text-right font-semibold text-slate-700">
                                        Action
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {loadingBatchHistory ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                                            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                            Loading batch history...
                                        </td>
                                    </tr>
                                ) : allPaymentBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                                            No payment batches have been created yet.
                                        </td>
                                    </tr>
                                ) : (
                                    allPaymentBatches.map((batch) => {
                                        const isPreLaunch =
                                            !batch.batchMonth ||
                                            batch.batchMonth.slice(0, 7) < "2026-11";

                                        return (
                                        <tr
                                            key={batch.id}
                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="font-medium text-slate-900">
                                                    {batch.batchName}
                                                </div>
                                                <div className="mt-0.5 text-xs text-slate-400">
                                                    Batch #{batch.id}
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-slate-600">
                                                {batch.createdAt
                                                    ? new Date(batch.createdAt).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })
                                                    : "—"}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap items-center gap-2">

                                                    {isPreLaunch && (
                                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                PRE-LAUNCH / TEST
            </span>
                                                    )}

                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                            batch.status === "OPEN"
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
            {batch.status}
        </span>

                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setBatchToView(batch)}
                                                    className="h-8 rounded-lg text-primary"
                                                >
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>

                                    );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                            <p className="text-xs text-slate-500">
                                Closed batches are read-only. Their approved payment records
                                remain available in Payment Summary and Payment Advice.
                            </p>
                        </div>
                    </>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
                        <div className="space-y-2">
                            <Label
                                htmlFor="payment-date"
                                className="text-sm font-medium text-slate-700"
                            >
                                Payment Record Entry
                            </Label>
                        </div>

                        {/*    <Input*/}
                        {/*        id="payment-date"*/}
                        {/*        type="date"*/}
                        {/*        value={paymentDate}*/}
                        {/*        onChange={(event) =>*/}
                        {/*            setPaymentDate(event.target.value)*/}
                        {/*        }*/}
                        {/*        className="h-11 rounded-xl border-slate-200 bg-white shadow-sm"*/}
                        {/*    />*/}
                        {/*</div>*/}


                    </div>
                </div>

                <div className="border-b border-slate-100 px-6 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                        <div className="min-w-0 flex-1 space-y-2">
                            <Label
                                htmlFor="employee-search"
                                className="text-sm font-medium text-slate-700"
                            >
                                Search Employee
                            </Label>

                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                <Input
                                    id="employee-search"
                                    value={search}
                                    onChange={(
                                        event,
                                    ) => {
                                        setSearch(
                                            event.target
                                                .value,
                                        )
                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    placeholder="Search employee code or name..."
                                    className="h-11 rounded-xl border-slate-200 pl-10 pr-10"
                                />

                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch("")
                                            setCurrentPage(
                                                0,
                                            )
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:w-[650px]">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Category
                                </Label>

                                <select
                                    value={categoryId}
                                    onChange={(event) => {
                                        setCategoryId(
                                            event.target.value,
                                        )
                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                >
                                    <option value="">
                                        All Categories
                                    </option>

                                    {categories.map(
                                        (category) => (
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
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Bank
                                </Label>

                                <select
                                    value={bankId}
                                    onChange={(event) => {
                                        setBankId(
                                            event.target.value,
                                        )
                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                >
                                    <option value="">
                                        All Banks
                                    </option>

                                    {banks.map(
                                        (bank: Bank) => (
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
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Payment Status
                                </Label>

                                <select
                                    value={statusFilter}
                                    onChange={(event) => {
                                        setStatusFilter(
                                            event.target.value as "ALL" | "DRAFT" | "APPROVED"
                                        )
                                        setCurrentPage(0)
                                    }}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                >
                                    <option value="ALL">All</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="APPROVED">Approved</option>
                                </select>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={clearFilters}
                            className="h-11 rounded-xl border-slate-200"
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-4">
                    <div className="border-r border-slate-100 px-6 py-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total Employees
                        </div>
                        <div className="mt-1 text-xl font-semibold text-slate-900">
                            {employees.length}
                        </div>
                    </div>

                    <div className="border-r border-slate-100 px-6 py-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Entered
                        </div>
                        <div className="mt-1 text-xl font-semibold text-emerald-700">
                            {enteredCount}
                        </div>
                    </div>

                    <div className="border-r border-slate-100 px-6 py-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Pending
                        </div>
                        <div className="mt-1 text-xl font-semibold text-amber-700">
                            {pendingCount}
                        </div>
                    </div>

                    <div className="px-6 py-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Unsaved
                        </div>
                        <div className="mt-1 text-xl font-semibold text-slate-900">
                            {dirtyCount}
                        </div>
                    </div>
                </div>

                <div className="relative">
                    {loadingPayments && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading payment records...
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1320px] text-sm">
                            <thead className="bg-slate-50/80">
                            <tr className="border-b border-slate-200 text-left">
                                <th className="px-5 py-4 font-semibold text-slate-700">Employee</th>
                                <th className="px-5 py-4 font-semibold text-slate-700">Completed through</th>
                                <th className="px-5 py-4 font-semibold text-slate-700">Pending months</th>
                                <th className="px-5 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-5 py-4 text-right font-semibold text-slate-700">Gross</th>
                                <th className="px-5 py-4 text-right font-semibold text-slate-700">Deduction</th>
                                <th className="px-5 py-4 text-right font-semibold text-slate-700">Net payment</th>
                                <th className="px-5 py-4 font-semibold text-slate-700">Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {visibleEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-14 text-center text-sm text-slate-500">
                                        No employees match the selected filters.
                                    </td>
                                </tr>
                            ) : visibleEmployees.map((employee) => {


                                const trackingStart = getEmployeeTrackingStart(employee)

                                const employeePeriods = [...paymentPeriods].sort(
                                    (a, b) => a.year - b.year || a.month - b.month,
                                )

// Include months covered by both single-month and multi-month payments.
                                const approvedPeriodIds = new Set<number>()

                                paymentHistory
                                    .filter(({ payment }) =>
                                        payment.employeeId === employee.id &&
                                        ["APPROVED", "PAID"].includes(
                                            String(payment.status ?? "").toUpperCase(),
                                        ),
                                    )
                                    .forEach(({ payment, paymentPeriodId }) => {
                                        if (paymentPeriodId) {
                                            approvedPeriodIds.add(paymentPeriodId)
                                        }

                                        const monthlyDetails = (
                                            payment as PaymentSummaryRecord & {
                                                monthlyDetails?: Array<{
                                                    paymentPeriodId: number
                                                }>
                                            }
                                        ).monthlyDetails ?? []

                                        monthlyDetails.forEach((detail) => {
                                            if (detail.paymentPeriodId) {
                                                approvedPeriodIds.add(detail.paymentPeriodId)
                                            }
                                        })
                                    })

                                const today = new Date()
                                const currentYear = today.getFullYear()
                                const currentMonth = today.getMonth() + 1

                                const timelinePeriods = trackingStart
                                    ? employeePeriods.filter((period) => {
                                        const isOnOrAfterStart =
                                            period.year > trackingStart.year ||
                                            (
                                                period.year === trackingStart.year &&
                                                period.month >= trackingStart.month
                                            )

                                        const isNotFuture =
                                            period.year < currentYear ||
                                            (
                                                period.year === currentYear &&
                                                period.month <= currentMonth
                                            )

                                        return isOnOrAfterStart && isNotFuture
                                    })
                                    : []

                                let completedThrough: PaymentPeriod | undefined

                                for (const period of timelinePeriods) {
                                    if (!approvedPeriodIds.has(period.id)) {
                                        break
                                    }

                                    completedThrough = period
                                }

                                const pendingMonths = timelinePeriods.filter(
                                    (period) => !approvedPeriodIds.has(period.id),
                                ).length

                                const employeeDrafts = multiMonthDrafts
                                    .filter((payment) =>
                                        payment.employeeId === employee.id &&
                                        payment.status === "DRAFT" &&
                                        (payment.monthlyDetails?.length ?? 0) >= 1,
                                    )
                                    .sort((a, b) => b.id - a.id)
                                const selectedSingleDraft = existingPayments[employee.id]
                                const currentDraft = employeeDrafts[0]
                                const displayPayment = currentDraft ?? existingPayments[employee.id]

                                const openEntry = () => {
                                    // If a single-month draft exists, preserve its existing edit workflow.
                                    if (selectedSingleDraft?.status === "DRAFT") {
                                        startEditing(employee.id)
                                        return
                                    }

                                    // Otherwise, open a new multi-month payment entry.
                                    // This also applies when previous claims are APPROVED
                                    // but the employee still has pending months.

                                    setMultiMonthEmployeeId(String(employee.id))
                                    setMultiMonthPaymentId(null)
                                    setSelectedMultiPeriodIds([])
                                    setMultiMonthAmounts({})
                                    setEligiblePeriods([])
                                    setPaymentDate(getToday())

                                    setErrorMessage("")
                                    setSuccessMessage("")

                                    setMultiMonthModalOpen(true)
                                }


                                return (
                                    <tr key={employee.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">{employee.name}</div>
                                            <div className="mt-1 text-xs text-slate-500">{employee.employeeCode} · {employee.categoryName ?? "Uncategorized"}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {completedThrough ? (
                                                <span className="font-medium text-slate-800">{getMonthName(completedThrough.month).slice(0, 3)} {completedThrough.year}</span>
                                            ) : (
                                                <span className="text-slate-400">Not completed</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pendingMonths === 0 ? "bg-emerald-100 text-emerald-700" : pendingMonths <= 2 ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700"}`}>
                                                    {pendingMonths} {pendingMonths === 1 ? "month" : "months"}
                                                </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {currentDraft || selectedSingleDraft?.status === "DRAFT" ? (
                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            DRAFT
        </span>
                                            ) : pendingMonths === 0 && timelinePeriods.length > 0 ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            ALL MONTHS APPROVED
        </span>
                                            ) : completedThrough ? (
                                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
            IN PROGRESS
        </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            NOT STARTED
        </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                                            {displayPayment
                                                ? `₹${formatAmount(displayPayment.grossTotal ?? 0)}`
                                                : <span className="text-slate-400">Not entered</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-slate-700">
                                            {displayPayment
                                                ? `₹${formatAmount(displayPayment.deductionTotal ?? 0)}`
                                                : <span className="text-slate-400">Not entered</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums font-semibold text-slate-900">
                                            {displayPayment
                                                ? `₹${formatAmount(displayPayment.netPayment ?? 0)}`
                                                : <span className="text-slate-400">Not entered</span>}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-[230px] flex-wrap items-center gap-2">
                                                {currentDraft || selectedSingleDraft?.status === "DRAFT" ? (
                                                    <>
                                                        <div className="group relative inline-flex">
                                                            {!hasSelectedOpenBatch && (
                                                                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                                                    No batch selected. Please select a batch before payment entry.
                                                                </div>
                                                            )}

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (currentDraft) {
                                                                        void loadMultiMonthDraft(currentDraft.id, employee.id)
                                                                    } else {
                                                                        startEditing(employee.id)
                                                                    }
                                                                }}
                                                                disabled={
                                                                    !hasSelectedOpenBatch ||
                                                                    loadingPaymentBatches ||
                                                                    saving ||
                                                                    loadingMultiMonthDraft
                                                                }
                                                                className="h-9 rounded-lg px-3"
                                                            >
                                                                <Pencil className="mr-1.5 h-4 w-4" />
                                                                Update
                                                            </Button>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (currentDraft) {
                                                                    void handleApproveMultiMonthDraft(currentDraft.id, employee.name, employee.employeeCode)
                                                                } else {
                                                                    void handleApprove(employee.id)
                                                                }
                                                            }}
                                                            disabled={saving || loadingMultiMonthDraft || (currentDraft ? currentDraft.status !== "DRAFT" : selectedSingleDraft?.status !== "DRAFT")}
                                                            className="h-9 rounded-lg bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                                                        >
                                                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                            Approve
                                                        </Button>
                                                    </>
                                                ) : pendingMonths === 0 && timelinePeriods.length > 0 ? (
                                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        All Months Approved
    </span>
                                                ) : (
                                                    <div className="group relative inline-flex">
                                                        {!hasSelectedOpenBatch && (
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                                                No batch selected. Please select a batch before payment entry.
                                                            </div>
                                                        )}

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={openEntry}
                                                            disabled={
                                                                !hasSelectedOpenBatch ||
                                                                loadingPaymentBatches ||
                                                                saving ||
                                                                loadingMultiMonthDraft
                                                            }
                                                            className="h-9 rounded-lg px-3"
                                                        >
                                                            <CalendarDays className="mr-1.5 h-4 w-4" />
                                                            {pendingMonths > 0 ? "Enter Pending Claims" : "Create Draft"}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-sm text-slate-500">
                            Showing{" "}
                            <span className="font-medium text-slate-700">
                                {showingFrom}
                            </span>
                            {" – "}
                            <span className="font-medium text-slate-700">
                                {showingTo}
                            </span>
                            {" of "}
                            <span className="font-medium text-slate-700">
                                {filteredEmployees.length}
                            </span>
                            {" employees"}
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={
                                    goToPreviousPage
                                }
                                disabled={
                                    safeCurrentPage ===
                                    0 ||
                                    saving
                                }
                                className="rounded-lg"
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Previous
                            </Button>

                            <span className="px-2 text-sm text-slate-500">
                                Page{" "}
                                <span className="font-medium text-slate-800">
                                    {safeCurrentPage +
                                        1}
                                </span>{" "}
                                of{" "}
                                <span className="font-medium text-slate-800">
                                    {totalPages}
                                </span>
                            </span>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={
                                    goToNextPage
                                }
                                disabled={
                                    safeCurrentPage >=
                                    totalPages -
                                    1 ||
                                    saving
                                }
                                className="rounded-lg"
                            >
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500">
                            {invalidDirtyCount > 0 ? (
                                <span className="font-medium text-red-600">
                                    Correct the negative net payment before saving.
                                </span>
                            ) : (
                                <>
                                    Use Open TA to enter payment amounts. Saved drafts can be reopened for editing; approved payments are locked.
                                </>
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void refresh()}
                            disabled={refreshing || loadingPayments}
                            className="h-10 rounded-xl px-5 shadow-sm"
                        >
                            {refreshing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {refreshing ? "Refreshing…" : "Refresh progress"}
                        </Button>
                    </div>
                </div>
            </section>

            {multiMonthModalOpen && hasSelectedOpenBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="multi-month-modal-title">
                    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-20 flex shrink-0 flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7">
                            <div>
                                <h2 id="multi-month-modal-title" className="text-xl font-semibold text-slate-900">Multi-month TA Payment</h2>
                                <p className="mt-1 text-sm text-slate-500">{employees.find((item) => String(item.id) === multiMonthEmployeeId)?.employeeCode} — {employees.find((item) => String(item.id) === multiMonthEmployeeId)?.name}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setMultiMonthModalOpen(false)
                                        setEligiblePeriods([])
                                        setLoadingEligiblePeriods(false)
                                    }}
                                    disabled={saving}
                                    className="h-9 rounded-lg"
                                >
                                    <X className="mr-1 h-4 w-4" />
                                    Close
                                </Button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
                            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="multi-month-payment-date">Payment Date</Label>
                                    <Input id="multi-month-payment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} disabled={saving} className="h-10 rounded-lg" />
                                </div>
                                {/*<div className="flex items-end text-sm text-slate-500">Monthly amounts are calculated separately; the table will refresh after saving.</div>*/}
                            </div>
                            {loadingEligiblePeriods ? (
                                <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading all configured payment months…</div>
                            ) : displayedEligiblePeriods.length === 0 ? (
                                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No payment periods are configured. Add the required months in Payment Periods first.</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" />Available</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-indigo-500" />In this draft</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Unavailable</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Paid</span></div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {displayedEligiblePeriods.map((period) => {
                                            const checked = selectedMultiPeriodIds.includes(period.id)
                                            const isCurrentDraftMonth = Boolean(multiMonthPaymentId && checked)
                                            const canSelect = period.eligible || isCurrentDraftMonth
                                            const statusLabel = isCurrentDraftMonth
                                                ? "In this draft"
                                                : period.status === "RESERVED"
                                                    ? "Unavailable"
                                                    : period.status
                                            return (
                                                <label key={period.id} className={`flex items-center gap-3 rounded-xl border p-3 ${checked ? "border-indigo-300 bg-indigo-50" : canSelect ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-80"}`} title={period.reason ?? statusLabel}>
                                                    <input type="checkbox" checked={checked} disabled={saving || (!canSelect && !checked)} onChange={(event) => {
                                                        const isChecked = event.target.checked
                                                        setSelectedMultiPeriodIds((current) => isChecked ? [...current.filter((id) => id !== period.id), period.id] : current.filter((id) => id !== period.id))
                                                        if (isChecked) setMultiMonthAmounts((current) => ({ ...current, [period.id]: current[period.id] ?? { paymentPeriodId: period.id, runningTa: 0, fixedTa: 0, other: 0, miscellaneous: 0, advanceTa: 0, advanceOther: 0 } }))
                                                    }} className="h-4 w-4 accent-indigo-600" />
                                                    <span className="font-medium text-slate-800">{getMonthName(period.month)} {period.year}</span>
                                                    <span className={`ml-auto rounded-md px-2 py-1 text-[11px] font-semibold ${checked ? "bg-indigo-100 text-indigo-700" : period.status === "PAID" ? "bg-emerald-100 text-emerald-700" : period.status === "RESERVED" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                            {selectedMultiPeriodIds.length > 0 && (
                                <div className="space-y-4">
                                    {selectedMultiPeriodIds.slice().sort((a, b) => { const pa = paymentPeriods.find((p) => p.id === a); const pb = paymentPeriods.find((p) => p.id === b); return !pa || !pb ? a - b : pa.year - pb.year || pa.month - pb.month }).map((periodId) => {
                                        const period = paymentPeriods.find((p) => p.id === periodId)
                                        const amount = multiMonthAmounts[periodId]
                                        const gross = Number(amount?.runningTa ?? 0) + Number(amount?.fixedTa ?? 0) + Number(amount?.other ?? 0)
                                        const deductions = Number(amount?.miscellaneous ?? 0) + Number(amount?.advanceTa ?? 0) + Number(amount?.advanceOther ?? 0)
                                        const fields: { key: keyof Omit<PaymentMonthlyDetailRequest, "paymentPeriodId">; label: string }[] = [{ key: "runningTa", label: "Running TA" }, { key: "fixedTa", label: "Fixed TA" }, { key: "other", label: "Other" }, { key: "miscellaneous", label: "Miscellaneous" }, { key: "advanceTa", label: "Advance TA" }, { key: "advanceOther", label: "Advance Other" }]
                                        return <div key={periodId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-semibold text-slate-900">{period ? `${getMonthName(period.month)} ${period.year}` : `Period ${periodId}`}</h3>
                                            <div className="text-sm text-slate-600">Gross ₹{formatAmount(gross)} · Deduction ₹{formatAmount(deductions)} · <span className={gross - deductions < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>Net ₹{formatAmount(gross - deductions)}</span></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {fields.map((field) => <div key={field.key} className="space-y-1.5"><Label htmlFor={`multi-${periodId}-${field.key}`}>{field.label}</Label>
                                                <Input
                                                    id={`multi-${periodId}-${field.key}`}
                                                    type="text"
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    value={
                                                        Number(amount?.[field.key] ?? 0) === 0
                                                            ? ""
                                                            : String(amount?.[field.key])
                                                    }
                                                    disabled={saving}
                                                    onChange={(event) =>
                                                        updateMultiMonthAmount(
                                                            periodId,
                                                            field.key,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="h-9 rounded-lg text-right"
                                                />
                                            </div>
                                            )}
                                        </div>
                                        </div>
                                    })}
                                </div>
                            )}
                            <div className="sticky bottom-0 -mx-5 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 bg-white px-5 pb-1 pt-4 sm:-mx-7 sm:flex-row sm:items-center sm:px-7">
                                <div className="flex-1" />
                                <div className="flex flex-wrap items-center gap-2">
                                    {multiMonthPaymentId && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => void handleCancelMultiMonthDraft()}
                                            disabled={saving}
                                            className="h-10 rounded-xl border-red-200 px-4 text-red-600 hover:bg-red-50"
                                        >
                                            Cancel Draft
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        onClick={() => void saveMultiMonthPayment()}
                                        disabled={
                                            saving ||
                                            loadingEligiblePeriods ||
                                            !multiMonthEmployeeId ||
                                            selectedMultiPeriodIds.length === 0 ||
                                            selectedMultiPeriodIds.some((periodId) => {
                                                const a = multiMonthAmounts[periodId]
                                                const gross =
                                                    Number(a?.runningTa ?? 0) +
                                                    Number(a?.fixedTa ?? 0) +
                                                    Number(a?.other ?? 0)
                                                const d =
                                                    Number(a?.miscellaneous ?? 0) +
                                                    Number(a?.advanceTa ?? 0) +
                                                    Number(a?.advanceOther ?? 0)

                                                return d > gross
                                            })
                                        }
                                        className="h-10 rounded-xl px-5"
                                    >
                                        {saving ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="mr-2 h-4 w-4" />
                                        )}
                                        {saving
                                            ? "Saving draft…"
                                            : multiMonthPaymentId
                                                ? "Update Draft"
                                                : "Save as Draft"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-month Approval Confirmation */}
            {approvalToConfirm && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="approve-payment-title"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                            </div>

                            <div>
                                <h2
                                    id="approve-payment-title"
                                    className="text-lg font-semibold text-slate-900"
                                >
                                    Approve Payment?
                                </h2>

                                <p className="text-xs text-slate-500">
                                    Payment Entry · Confirmation required
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-6 text-slate-700">
                            Are you sure you want to approve the payment draft for{" "}
                            <strong>{approvalToConfirm.employeeName}</strong>{" "}
                            ({approvalToConfirm.employeeCode})?
                        </p>

                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-sm font-semibold text-emerald-800">
                                After approval:
                            </p>

                            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-emerald-800">
                                <li>• The selected payment months will be finalized.</li>
                                <li>• The approved payment entry will become read-only.</li>
                                <li>• The verified payment data will be available for Payment Advice export.</li>
                            </ul>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={saving}
                                onClick={() => setApprovalToConfirm(null)}
                                className="rounded-lg"
                            >
                                Go Back
                            </Button>

                            <Button
                                type="button"
                                disabled={saving}
                                onClick={() => void confirmApproveMultiMonthDraft()}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Approving...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Confirm Approval
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Batch Confirmation */}
            {batchToClose && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="close-batch-title"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                <Lock className="h-5 w-5 text-slate-700" />
                            </div>

                            <h2
                                id="close-batch-title"
                                className="text-lg font-semibold text-slate-900"
                            >
                                Close Payment Batch?
                            </h2>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">
                            Are you sure you want to close{" "}
                            <strong>{batchToClose.batchName}</strong>?
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Once closed, payment entries in this batch cannot be
                            modified through normal payment operations.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={saving}
                                onClick={() => setBatchToClose(null)}
                                className="rounded-lg"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                disabled={saving}
                                onClick={() => void confirmClosePaymentBatch()}
                                className="rounded-lg"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Closing...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Confirm Close
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Details - Read Only */}
            {batchToView && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="batch-details-title"
                    onClick={() => setBatchToView(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2
                                    id="batch-details-title"
                                    className="text-lg font-semibold text-slate-900"
                                >
                                    Batch Details
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Read-only batch information
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setBatchToView(null)}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Batch Name
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                    {batchToView.batchName}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Batch ID
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                    #{batchToView.id}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Status
                                </p>
                                <span
                                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                        batchToView.status === "OPEN"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                    }`}
                                >
                                    {batchToView.status}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Created On
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                    {batchToView.createdAt
                                        ? new Date(batchToView.createdAt).toLocaleString("en-IN")
                                        : "—"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Last Updated
                                </p>
                                <p className="mt-1 text-sm text-slate-800">
                                    {batchToView.updatedAt
                                        ? new Date(batchToView.updatedAt).toLocaleString("en-IN")
                                        : "—"}
                                </p>
                            </div>

                            {batchToView.status === "CLOSED" && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                    This batch is closed. Its payment entries
                                    cannot be modified through normal payment
                                    operations.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
                            <Button
                                type="button"
                                onClick={() => setBatchToView(null)}
                                className="rounded-lg px-5"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
