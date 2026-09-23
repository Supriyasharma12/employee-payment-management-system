
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Filter,
    Loader2,
    Pencil,
    RefreshCw,
    Save,
    Search,
    X,
} from "lucide-react"

import {
    createPayment,
    updatePayment,
    approvePayment,
} from "@/api/payment"
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

const formatPeriod = (period: PaymentPeriod) =>
    `${String(period.month).padStart(2, "0")}/${period.year}`

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

    const [existingPayments, setExistingPayments] =
        useState<Record<number, PaymentSummaryRecord>>({})
    const [drafts, setDrafts] =
        useState<Record<number, DraftPayment>>({})
    const [editingIds, setEditingIds] =
        useState<Set<number>>(new Set())

    const [updatingIds, setUpdatingIds] =
        useState<Set<number>>(new Set())
    const [dirtyIds, setDirtyIds] =
        useState<Set<number>>(new Set())

    const [search, setSearch] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [bankId, setBankId] = useState("")
    const [statusFilter, setStatusFilter] = useState<
        "ALL" | "PENDING" | "DRAFT" | "APPROVED"
    >("ALL")

    const [currentPage, setCurrentPage] = useState(0)

    const [loading, setLoading] = useState(true)
    const [loadingPayments, setLoadingPayments] = useState(false)
    const [saving, setSaving] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const [errorMessage, setErrorMessage] = useState("")
    const [successMessage, setSuccessMessage] = useState("")

    const selectedPeriod = useMemo(
        () =>
            paymentPeriods.find(
                (period) =>
                    String(period.id) === selectedPaymentPeriodId,
            ),
        [paymentPeriods, selectedPaymentPeriodId],
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

    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true)
            setErrorMessage("")

            const [
                employeeList,
                periods,
                categoryList,
                bankList,
            ] = await Promise.all([
                loadAllEmployees(),
                getPaymentPeriods(),
                getEmployeeCategories(),
                getBanks(),
            ])

            setEmployees(employeeList)
            setPaymentPeriods(periods)
            setCategories(categoryList)
            setBanks(bankList)

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
    }, [loadAllEmployees])

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

    const filteredEmployees = useMemo(() => {
        const normalizedSearch =
            search.trim().toLowerCase()

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

            const hasPayment =
                Boolean(existingPayments[employee.id])

            const paymentStatus =
                existingPayments[employee.id]?.status

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "PENDING" && !hasPayment) ||
                (statusFilter === "DRAFT" && paymentStatus === "DRAFT") ||
                (statusFilter === "APPROVED" && paymentStatus === "APPROVED")

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
        [dirtyIds, drafts, existingPayments],
    )

    const invalidDirtyCount = invalidDirtyIds.size

    const updateDraft = (
        employeeId: number,
        field: keyof DraftPayment,
        value: string,
    ) => {
        if (!isValidAmountInput(value)) return

        setDrafts((current) => ({
            ...current,
            [employeeId]: {
                ...(current[employeeId] ??
                    emptyDraft()),
                [field]: value,
            },
        }))

        setDirtyIds((current) => {
            const next = new Set(current)
            next.add(employeeId)
            return next
        })

        setSuccessMessage("")
        setErrorMessage("")
    }

    const startEditing = (employeeId: number) => {
        const existing = existingPayments[employeeId]

        if (!existing || existing.status !== "DRAFT") return

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

    const startNewEntry = (employeeId: number) => {
        setErrorMessage("")
        setSuccessMessage("")

        const input = document.querySelector(
            `[data-payment-entry="${employeeId}"]`,
        ) as HTMLInputElement | null

        input?.focus()
    }

    const cancelEditing = (employeeId: number) => {
        const existing = existingPayments[employeeId]

        if (existing) {
            setDrafts((current) => ({
                ...current,
                [employeeId]: paymentToDraft(existing),
            }))
        }

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

        setErrorMessage("")
        setSuccessMessage("")
    }

    // const handleUpdate = async (employeeId: number) => {
    //     const existing = existingPayments[employeeId]
    //     const draft = drafts[employeeId] ?? emptyDraft()
    //
    //     if (!existing || existing.status !== "DRAFT") return
    //
    //     if (getNet(draft) < 0) {
    //         window.alert("Net Payment cannot be negative. Please reduce the deductions.")
    //         return
    //     }
    //
    //     try {
    //         setSaving(true)
    //         setUpdatingIds((current) => {
    //             const next = new Set(current)
    //             next.add(employeeId)
    //             return next
    //         })
    //         setErrorMessage("")
    //         setSuccessMessage("")
    //
    //         const response = await updatePayment(existing.id, {
    //             paymentDate,
    //             runningTa: toAmount(draft.runningTa),
    //             fixedTa: toAmount(draft.fixedTa),
    //             other: toAmount(draft.other),
    //             miscellaneous: toAmount(draft.miscellaneous),
    //             advanceTa: toAmount(draft.advanceTa),
    //             advanceOther: toAmount(draft.advanceOther),
    //         })
    //
    //         setExistingPayments((current) => ({
    //             ...current,
    //             [employeeId]: {
    //                 ...current[employeeId],
    //                 id: response.id,
    //                 runningTa: response.runningTa,
    //                 fixedTa: response.fixedTa,
    //                 other: response.other,
    //                 grossTotal: response.grossTotal,
    //                 miscellaneous: response.miscellaneous,
    //                 advanceTa: response.advanceTa,
    //                 advanceOther: response.advanceOther,
    //                 deductionTotal: response.deductionTotal,
    //                 netPayment: response.netPayment,
    //                 status: response.status,
    //             },
    //         }))
    //
    //         setDrafts((current) => ({
    //             ...current,
    //             [employeeId]: {
    //                 runningTa: response.runningTa.toFixed(2),
    //                 fixedTa: response.fixedTa.toFixed(2),
    //                 other: response.other.toFixed(2),
    //                 miscellaneous: response.miscellaneous.toFixed(2),
    //                 advanceTa: response.advanceTa.toFixed(2),
    //                 advanceOther: response.advanceOther.toFixed(2),
    //             },
    //         }))
    //
    //         setEditingIds((current) => {
    //             const next = new Set(current)
    //             next.delete(employeeId)
    //             return next
    //         })
    //
    //         setUpdatingIds((current) => {
    //             const next = new Set(current)
    //             next.delete(employeeId)
    //             return next
    //         })
    //
    //         setDirtyIds((current) => {
    //             const next = new Set(current)
    //             next.delete(employeeId)
    //             return next
    //         })
    //
    //         setSuccessMessage(`Payment updated successfully for ${response.employeeName} (${response.employeeCode}).`)
    //     } catch (error) {
    //         console.error(error)
    //         setErrorMessage(getApiErrorMessage(error, "Failed to update payment."))
    //     } finally {
    //         setUpdatingIds((current) => {
    //             const next = new Set(current)
    //             next.delete(employeeId)
    //             return next
    //         })
    //         setSaving(false)
    //     }
    // }
    const handleUpdate = async (employeeId: number) => {
        const existing = existingPayments[employeeId]
        const draft = drafts[employeeId] ?? emptyDraft()

        if (!existing || existing.status !== "DRAFT") {
            return
        }

        if (!existing.paymentId) {
            setErrorMessage(
                "Payment ID is missing. Cannot update payment.",
            )
            return
        }

        if (getNet(draft) < 0) {
            window.alert(
                "Net Payment cannot be negative. Please reduce the deductions.",
            )
            return
        }

        try {
            setSaving(true)

            setUpdatingIds((current) => {
                const next = new Set(current)
                next.add(employeeId)
                return next
            })

            setErrorMessage("")
            setSuccessMessage("")

            const response = await updatePayment(
                existing.paymentId,
                {
                    paymentDate,
                    runningTa: toAmount(draft.runningTa),
                    fixedTa: toAmount(draft.fixedTa),
                    other: toAmount(draft.other),
                    miscellaneous: toAmount(
                        draft.miscellaneous,
                    ),
                    advanceTa: toAmount(
                        draft.advanceTa,
                    ),
                    advanceOther: toAmount(
                        draft.advanceOther,
                    ),
                },
            )

            // Update local values
            setExistingPayments((current) => ({
                ...current,
                [employeeId]: {
                    ...current[employeeId],
                    paymentId: response.id,
                    runningTa: response.runningTa,
                    fixedTa: response.fixedTa,
                    other: response.other,
                    grossTotal: response.grossTotal,
                    miscellaneous:
                    response.miscellaneous,
                    advanceTa: response.advanceTa,
                    advanceOther:
                    response.advanceOther,
                    deductionTotal:
                    response.deductionTotal,
                    netPayment: response.netPayment,
                    status: response.status,
                    paymentDate:
                    response.paymentDate,
                },
            }))

            // Update draft values
            setDrafts((current) => ({
                ...current,
                [employeeId]: {
                    runningTa:
                        response.runningTa.toFixed(2),
                    fixedTa:
                        response.fixedTa.toFixed(2),
                    other:
                        response.other.toFixed(2),
                    miscellaneous:
                        response.miscellaneous.toFixed(2),
                    advanceTa:
                        response.advanceTa.toFixed(2),
                    advanceOther:
                        response.advanceOther.toFixed(2),
                },
            }))

            // ------------------------------------------
            // IMPORTANT:
            // Exit edit mode after successful update
            // ------------------------------------------

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

            // ------------------------------------------
            // Reload from backend
            // ------------------------------------------

            await loadPaymentsForSelectedPeriod(
                selectedPaymentPeriodId,
            )

            setSuccessMessage(
                `Payment updated successfully for ${response.employeeName} (${response.employeeCode}).`,
            )
        } catch (error) {
            console.error(error)

            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to update payment.",
                ),
            )
        } finally {
            setUpdatingIds((current) => {
                const next = new Set(current)
                next.delete(employeeId)
                return next
            })

            setSaving(false)
        }
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
            window.alert(
                "Net Payment cannot be negative. This payment cannot be approved.",
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

            // Reload from backend
            await loadPaymentsForSelectedPeriod(
                selectedPaymentPeriodId,
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

            if (selectedPaymentPeriodId) {
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

    const savePayments = async () => {
        setErrorMessage("")
        setSuccessMessage("")

        if (!selectedPaymentPeriodId) {
            setErrorMessage(
                "Please select a payment period.",
            )
            return
        }

        if (!paymentDate) {
            setErrorMessage(
                "Please select a payment date.",
            )
            return
        }

        if (dirtyIds.size === 0) {
            setErrorMessage(
                "There are no unsaved payment entries.",
            )
            return
        }

        const dirtyEmployees = employees.filter(
            (employee) =>
                dirtyIds.has(employee.id) &&
                !existingPayments[employee.id],
        )

        if (dirtyEmployees.length === 0) {
            setErrorMessage(
                "The selected payment entries have already been saved.",
            )
            return
        }

        if (invalidDirtyCount > 0) {
            setErrorMessage(
                `${invalidDirtyCount} payment ${
                    invalidDirtyCount === 1
                        ? "entry has"
                        : "entries have"
                } a negative net payment. Deduction Total cannot exceed Gross Total. Please correct the highlighted entries before saving.`,
            )
            return
        }

        try {
            setSaving(true)

            let savedCount = 0
            const failed: string[] = []

            for (const employee of dirtyEmployees) {
                const draft =
                    drafts[employee.id] ??
                    emptyDraft()

                try {
                    await createPayment({
                        employeeId: employee.id,
                        paymentPeriodId:
                            Number(
                                selectedPaymentPeriodId,
                            ),
                        paymentDate,
                        runningTa: toAmount(
                            draft.runningTa,
                        ),
                        fixedTa: toAmount(
                            draft.fixedTa,
                        ),
                        other: toAmount(
                            draft.other,
                        ),
                        miscellaneous:
                            toAmount(
                                draft.miscellaneous,
                            ),
                        advanceTa:
                            toAmount(
                                draft.advanceTa,
                            ),
                        advanceOther:
                            toAmount(
                                draft.advanceOther,
                            ),
                    })

                    savedCount += 1
                } catch (error) {
                    console.error(
                        `Failed to save ${employee.employeeCode}`,
                        error,
                    )

                    failed.push(
                        employee.employeeCode,
                    )
                }
            }

            setDirtyIds((current) => {
                const next = new Set(current)

                for (const employee of dirtyEmployees) {
                    if (
                        !failed.includes(
                            employee.employeeCode,
                        )
                    ) {
                        next.delete(employee.id)
                    }
                }

                return next
            })

            await loadPaymentsForSelectedPeriod(
                selectedPaymentPeriodId,
            )

            if (failed.length > 0) {
                setErrorMessage(
                    `${savedCount} payment ${
                        savedCount === 1
                            ? "was"
                            : "were"
                    } saved. Failed employee code${
                        failed.length === 1
                            ? ""
                            : "s"
                    }: ${failed.join(", ")}.`,
                )
            } else {
                setSuccessMessage(
                    `${savedCount} payment ${
                        savedCount === 1
                            ? "entry"
                            : "entries"
                    } saved successfully for ${
                        selectedPeriod
                            ? formatPeriod(
                                selectedPeriod,
                            )
                            : "the selected period"
                    }.`,
                )
            }
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
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        Payment Administration
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Payment Entry
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Process employee payments for a selected payment period.
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

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_220px_220px]">
                        <div className="space-y-2">
                            <Label
                                htmlFor="payment-period"
                                className="text-sm font-medium text-slate-700"
                            >
                                Payment Period
                            </Label>

                            <select
                                id="payment-period"
                                value={
                                    selectedPaymentPeriodId
                                }
                                onChange={(event) => {
                                    setSelectedPaymentPeriodId(
                                        event.target.value,
                                    )
                                    setCurrentPage(0)
                                }}
                                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                            >
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
                                                period,
                                            )}{" "}
                                            —{" "}
                                            {
                                                period.status
                                            }
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                        <div className="space-y-2">
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
                                    setPaymentDate(
                                        event.target
                                            .value,
                                    )
                                }
                                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm"
                            />
                        </div>

                        <div className="flex items-end">
                            <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                                <div className="text-xs text-slate-500">
                                    Selected Period
                                </div>
                                <div className="mt-1 font-semibold text-slate-900">
                                    {selectedPeriod
                                        ? `${getMonthName(
                                            selectedPeriod.month,
                                        )} ${
                                            selectedPeriod.year
                                        }`
                                        : "-"}
                                </div>
                            </div>
                        </div>
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
                                    onChange={(
                                        event,
                                    ) => {
                                        setStatusFilter(
                                            event
                                                .target
                                                .value as
                                                | "ALL"
                                                | "PENDING"
                                                | "DRAFT"
                                                | "APPROVED",
                                        )
                                        setCurrentPage(
                                            0,
                                        )
                                    }}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                >
                                    <option value="ALL">
                                        All
                                    </option>
                                    <option value="PENDING">
                                        Pending
                                    </option>
                                    <option value="DRAFT">
                                        Draft
                                    </option>
                                    <option value="APPROVED">
                                        Approved
                                    </option>
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
                        <table className="w-full min-w-[1750px] text-sm">
                            <thead className="bg-slate-50/80">
                            <tr className="border-b border-slate-200">
                                <th
                                    rowSpan={2}
                                    className="sticky left-0 z-[2] bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700"
                                >
                                    Employee Code
                                </th>
                                <th
                                    rowSpan={2}
                                    className="sticky left-[130px] z-[2] bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700"
                                >
                                    Employee Name
                                </th>
                                <th
                                    rowSpan={2}
                                    className="px-4 py-3 text-left font-semibold text-slate-700"
                                >
                                    Category
                                </th>
                                <th
                                    colSpan={4}
                                    className="border-l border-slate-200 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-700"
                                >
                                    Gross Payment
                                </th>
                                <th
                                    colSpan={4}
                                    className="border-l border-slate-200 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-700"
                                >
                                    Deduction
                                </th>
                                <th
                                    rowSpan={2}
                                    className="border-l border-slate-200 px-3 py-3 text-right font-semibold text-slate-700"
                                >
                                    Net Payment
                                </th>
                                <th
                                    rowSpan={2}
                                    className="w-[105px] px-3 py-3 text-left font-semibold text-slate-700"
                                >
                                    Status
                                </th>
                                <th
                                    rowSpan={2}
                                    className="w-[195px] border-l border-slate-100 px-3 py-3 text-left font-semibold text-slate-700"
                                >
                                    Actions
                                </th>
                            </tr>

                            <tr className="border-b border-slate-200">
                                <th className="border-l border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Running TA
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Fixed TA
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Other
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Gross Total
                                </th>
                                <th className="border-l border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Miscellaneous
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Advance TA
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Advance Other
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                                    Deduction Total
                                </th>
                            </tr>
                            </thead>

                            <tbody>
                            {visibleEmployees.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={14}
                                        className="px-6 py-14 text-center text-sm text-slate-500"
                                    >
                                        No employees match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                visibleEmployees.map(
                                    (employee) => {
                                        const existing =
                                            existingPayments[
                                                employee.id
                                                ]

                                        const draft =
                                            drafts[
                                                employee.id
                                                ] ??
                                            emptyDraft()

                                        const gross = getGross(draft)

                                        const deduction = getDeduction(draft)

                                        const net = getNet(draft)

                                        const dirty =
                                            dirtyIds.has(
                                                employee.id,
                                            )

                                        const isEditing =
                                            editingIds.has(employee.id)

                                        const isApproved =
                                            existing?.status === "APPROVED"

                                        const locked =
                                            isApproved ||
                                            (Boolean(existing) && !isEditing)

                                        return (
                                            <tr
                                                key={
                                                    employee.id
                                                }
                                                className={`border-b border-slate-100 last:border-0 ${
                                                    dirty
                                                        ? "bg-amber-50/40"
                                                        : "hover:bg-slate-50/70"
                                                }`}
                                            >
                                                <td className="sticky left-0 z-[1] bg-white px-4 py-3 font-semibold text-slate-800">
                                                    {
                                                        employee.employeeCode
                                                    }
                                                </td>

                                                <td className="sticky left-[130px] z-[1] bg-white px-4 py-3">
                                                    <div className="font-medium text-slate-900">
                                                        {
                                                            employee.name
                                                        }
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 text-slate-600">
                                                    {
                                                        employee.categoryName ??
                                                        "-"
                                                    }
                                                </td>

                                                <td className="border-l border-slate-100 px-2 py-2">
                                                    <Input
                                                        data-payment-entry={employee.id}
                                                        value={draft.runningTa}
                                                        disabled={locked || saving}
                                                        onChange={(event) =>
                                                            updateDraft(
                                                                employee.id,
                                                                "runningTa",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                        className="h-9 w-[105px] rounded-lg border-slate-200 bg-white px-2 text-right tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <Input
                                                        value={draft.fixedTa}
                                                        disabled={locked || saving}
                                                        onChange={(event) =>
                                                            updateDraft(
                                                                employee.id,
                                                                "fixedTa",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                        className="h-9 w-[105px] rounded-lg border-slate-200 bg-white px-2 text-right tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <Input
                                                        value={draft.other}
                                                        disabled={locked || saving}
                                                        onChange={(event) =>
                                                            updateDraft(
                                                                employee.id,
                                                                "other",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                        className="h-9 w-[105px] rounded-lg border-slate-200 bg-white px-2 text-right tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-800">
                                                    ₹{formatAmount(gross)}
                                                </td>

                                                <td className="border-l border-slate-100 px-2 py-2">
                                                    <Input
                                                        value={draft.miscellaneous}
                                                        disabled={locked || saving}
                                                        onChange={(event) =>
                                                            updateDraft(
                                                                employee.id,
                                                                "miscellaneous",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                        className="h-9 w-[105px] rounded-lg border-slate-200 bg-white px-2 text-right tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <Input
                                                        value={draft.advanceTa}
                                                        disabled={locked || saving}
                                                        onChange={(event) =>
                                                            updateDraft(
                                                                employee.id,
                                                                "advanceTa",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                        className="h-9 w-[105px] rounded-lg border-slate-200 bg-white px-2 text-right tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-2 py-2">
                                                    <Input
                                                        value={draft.advanceOther}
                                                        disabled={locked || saving}
                                                        onChange={(event) =>
                                                            updateDraft(
                                                                employee.id,
                                                                "advanceOther",
                                                                event.target.value,
                                                            )
                                                        }
                                                        inputMode="decimal"
                                                        className="h-9 w-[105px] rounded-lg border-slate-200 bg-white px-2 text-right tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </td>

                                                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-700">
                                                    ₹{formatAmount(deduction)}
                                                </td>

                                                <td className="border-l border-slate-100 px-3 py-3 text-right">
                                                        <span
                                                            className={`inline-flex rounded-lg px-2.5 py-1.5 font-bold tabular-nums ${
                                                                net < 0
                                                                    ? "bg-red-50 text-red-700"
                                                                    : "bg-emerald-50 text-emerald-700"
                                                            }`}
                                                        >
                                                            ₹{formatAmount(net)}
                                                        </span>

                                                    {net < 0 && !locked && (
                                                        <div className="mt-1 whitespace-nowrap text-[11px] font-medium text-red-600">
                                                            Cannot save
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="w-[105px] px-3 py-3 align-middle">
                                                    {existing?.status === "APPROVED" ? (
                                                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                                            Approved
                                                        </span>
                                                    ) : existing?.status === "DRAFT" ? (
                                                        <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                                            Draft
                                                        </span>
                                                    ) : dirty ? (
                                                        <span className="inline-flex rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                                                            Unsaved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="w-[195px] border-l border-slate-100 px-3 py-3 align-middle">
                                                    {existing?.status === "APPROVED" ? (
                                                        <div className="flex items-center justify-start">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={saving}
                                                                className="h-8 min-w-[76px] rounded-md border-slate-200 bg-slate-50 px-2.5 text-slate-600 shadow-none hover:bg-slate-100"
                                                            >
                                                                <Eye className="mr-1.5 h-4 w-4" />
                                                                View
                                                            </Button>
                                                        </div>
                                                    ) : existing?.status === "DRAFT" ? (
                                                        <div className="flex items-center justify-start gap-1.5 whitespace-nowrap">
                                                            {isEditing ? (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        onClick={() => void handleUpdate(employee.id)}
                                                                        disabled={saving || getNet(draft) < 0}
                                                                        className="h-8 min-w-[78px] rounded-md bg-slate-100 px-2.5 font-medium text-slate-700 shadow-none hover:bg-slate-200"
                                                                    >
                                                                        {updatingIds.has(employee.id) ? (
                                                                            <>
                                                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                                                Updating
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Save className="mr-1.5 h-4 w-4" />
                                                                                Update
                                                                            </>
                                                                        )}
                                                                    </Button>

                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => cancelEditing(employee.id)}
                                                                        disabled={saving}
                                                                        className="h-8 min-w-[78px] rounded-md border-slate-200 bg-white px-2.5 text-slate-600 shadow-none hover:bg-slate-50"
                                                                    >
                                                                        <X className="mr-1.5 h-4 w-4" />
                                                                        Cancel
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => startEditing(employee.id)}
                                                                        disabled={saving}
                                                                        className="h-8 min-w-[68px] rounded-md border-slate-200 bg-slate-50 px-2.5 text-slate-600 shadow-none hover:bg-slate-100"
                                                                    >
                                                                        <Pencil className="mr-1.5 h-4 w-4" />
                                                                        Edit
                                                                    </Button>

                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        onClick={() => void handleApprove(employee.id)}
                                                                        disabled={saving || getNet(draft) < 0}
                                                                        className="h-8 min-w-[82px] rounded-md border border-emerald-200 bg-emerald-50 px-2.5 font-medium text-emerald-700 shadow-none hover:bg-emerald-100"
                                                                    >
                                                                        <Check className="mr-1.5 h-4 w-4" />
                                                                        Approve
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-start">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => startNewEntry(employee.id)}
                                                                disabled={saving}
                                                                className="h-8 min-w-[76px] rounded-md border-blue-200 bg-blue-50 px-2.5 font-medium text-blue-700 shadow-none hover:bg-blue-100"
                                                            >
                                                                <Pencil className="mr-1.5 h-4 w-4" />
                                                                Enter
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    },
                                )
                            )}
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
                                    Enter amounts directly in the table.
                                    Draft payments can be edited and approved. Approved payments are locked.
                                </>
                            )}
                        </div>

                        <Button
                            type="button"
                            onClick={() =>
                                void savePayments()
                            }
                            disabled={
                                saving ||
                                loadingPayments ||
                                dirtyCount === 0 ||
                                invalidDirtyCount > 0
                            }
                            className="h-10 rounded-xl px-5 shadow-sm"
                        >
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {saving
                                ? "Saving..."
                                : `Save ${dirtyCount} ${
                                    dirtyCount === 1
                                        ? "Entry"
                                        : "Entries"
                                }`}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}
