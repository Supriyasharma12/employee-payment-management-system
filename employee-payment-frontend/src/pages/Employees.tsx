import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"

import {
    activateEmployee,
    createEmployee,
    deactivateEmployee,
    getBanks,
    getEmployeeCategories,
    getEmployees,
    searchEmployeesByCode,
    searchEmployeesByName,
    updateEmployee,
    type Bank,
    type Employee,
    type EmployeeCategory,
    type EmployeeRequest,
} from "@/api/employees"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import {
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Landmark,
    Pencil,
    Plus,
    Search,
    UserRound,
    Users,
    X,
} from "lucide-react"

interface FormFieldProps {
    label: string
    required?: boolean
    error?: string
    children: ReactNode
    className?: string
}

function FormField({
                       label,
                       required = false,
                       error,
                       children,
                       className = "",
                   }: FormFieldProps) {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label className="text-xs font-semibold text-slate-600">
                {label}
                {required && (
                    <span className="ml-1 text-red-500">*</span>
                )}
            </Label>

            {children}

            {error && (
                <p className="text-xs text-red-600">{error}</p>
            )}
        </div>
    )
}

export default function Employees() {
    // =========================================================
    // DATA
    // =========================================================

    const [employees, setEmployees] =
        useState<Employee[]>([])

    const [categories, setCategories] =
        useState<EmployeeCategory[]>([])

    const [banks, setBanks] =
        useState<Bank[]>([])

    // =========================================================
    // SEARCH
    // =========================================================

    const [search, setSearch] =
        useState("")

    const [activeSearch, setActiveSearch] =
        useState("")

    const [suggestions, setSuggestions] =
        useState<Employee[]>([])

    const [showSuggestions, setShowSuggestions] =
        useState(false)

    const [searching, setSearching] =
        useState(false)

    const searchRequestId =
        useRef(0)

    // =========================================================
    // LOADING
    // =========================================================

    const [loading, setLoading] =
        useState(false)

    const [saving, setSaving] =
        useState(false)

    const [actionLoadingId, setActionLoadingId] =
        useState<number | null>(null)

    // =========================================================
    // PAGINATION
    // =========================================================

    const [currentPage, setCurrentPage] =
        useState(0)

    const [totalPages, setTotalPages] =
        useState(0)

    const [totalElements, setTotalElements] =
        useState(0)

    const pageSize = 10

    // =========================================================
    // ERRORS
    // =========================================================

    const [error, setError] =
        useState("")

    const [fieldErrors, setFieldErrors] =
        useState<Record<string, string>>({})

    // =========================================================
    // DIALOG
    // =========================================================

    const [dialogOpen, setDialogOpen] =
        useState(false)

    const [editingEmployeeId, setEditingEmployeeId] =
        useState<number | null>(null)

    // =========================================================
    // FORM
    // =========================================================

    const emptyForm: EmployeeRequest = {
        employeeCode: "",
        name: "",
        accountNumber: "",
        ifscCode: "",
        position: "",
        phoneNumber: "",
        email: "",
        gradePay: 0,
        scale: "",
        headquarters: "",
        designation: "",
        categoryId: 0,
        bankId: undefined,
    }

    const [form, setForm] =
        useState<EmployeeRequest>(
            emptyForm,
        )

    // =========================================================
    // LOAD EMPLOYEES
    // =========================================================

    const loadEmployees =
        useCallback(
            async (page = 0) => {
                try {
                    setLoading(true)
                    setError("")

                    const data =
                        await getEmployees(
                            page,
                            pageSize,
                        )

                    setEmployees(
                        data.content ?? [],
                    )

                    setCurrentPage(
                        data.number ?? 0,
                    )

                    setTotalPages(
                        data.totalPages ?? 0,
                    )

                    setTotalElements(
                        data.totalElements ?? 0,
                    )
                } catch (err) {
                    console.error(err)

                    setError(
                        "Failed to load employees.",
                    )
                } finally {
                    setLoading(false)
                }
            },
            [],
        )

    // =========================================================
    // LOAD MASTER DATA
    // =========================================================

    const loadMasterData =
        useCallback(
            async () => {
                try {
                    const [
                        categoryData,
                        bankData,
                    ] =
                        await Promise.all([
                            getEmployeeCategories(),
                            getBanks(),
                        ])

                    setCategories(
                        categoryData,
                    )

                    setBanks(bankData)
                } catch (err) {
                    console.error(err)

                    setError(
                        "Failed to load categories and banks.",
                    )
                }
            },
            [],
        )

    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadEmployees(0)
            void loadMasterData()
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }
    }, [
        loadEmployees,
        loadMasterData,
    ])

    // =========================================================
    // SEARCH EMPLOYEES
    // =========================================================

    const searchEmployees =
        useCallback(
            async (
                value: string,
                page = 0,
                closeSuggestions = true,
            ) => {
                const normalizedValue =
                    value.trim()

                const requestId =
                    ++searchRequestId.current

                if (!normalizedValue) {
                    setActiveSearch("")
                    setSuggestions([])
                    setShowSuggestions(false)

                    await loadEmployees(page)

                    return
                }

                try {
                    setSearching(true)
                    setError("")

                    const [
                        codeResults,
                        nameResults,
                    ] =
                        await Promise.allSettled([
                            searchEmployeesByCode(
                                normalizedValue,
                            ),
                            searchEmployeesByName(
                                normalizedValue,
                            ),
                        ])

                    if (
                        requestId !==
                        searchRequestId.current
                    ) {
                        return
                    }

                    const codeData =
                        codeResults.status ===
                        "fulfilled"
                            ? codeResults.value
                            : null

                    const nameData =
                        nameResults.status ===
                        "fulfilled"
                            ? nameResults.value
                            : null

                    const combined = [
                        ...(codeData?.content ??
                            []),
                        ...(nameData?.content ??
                            []),
                    ].filter(
                        (
                            employee,
                            index,
                            array,
                        ) =>
                            array.findIndex(
                                (item) =>
                                    item.id ===
                                    employee.id,
                            ) === index,
                    )

                    setSuggestions(
                        combined.slice(0, 6),
                    )

                    const result =
                        codeData &&
                        codeData.totalElements >
                        0
                            ? codeData
                            : nameData

                    if (!result) {
                        setEmployees([])
                        setCurrentPage(0)
                        setTotalPages(0)
                        setTotalElements(0)
                    } else {
                        setEmployees(
                            result.content ??
                            [],
                        )

                        setCurrentPage(
                            result.number ??
                            0,
                        )

                        setTotalPages(
                            result.totalPages ??
                            0,
                        )

                        setTotalElements(
                            result.totalElements ??
                            0,
                        )

                        setActiveSearch(
                            normalizedValue,
                        )
                    }

                    if (closeSuggestions) {
                        setShowSuggestions(
                            false,
                        )
                    }
                } catch (err) {
                    if (
                        requestId !==
                        searchRequestId.current
                    ) {
                        return
                    }

                    console.error(err)

                    setError(
                        "Search failed.",
                    )
                } finally {
                    if (
                        requestId ===
                        searchRequestId.current
                    ) {
                        setSearching(false)
                    }
                }
            },
            [loadEmployees],
        )

    // =========================================================
    // SEARCH INPUT DEBOUNCE
    // =========================================================

    useEffect(() => {
        const value =
            search.trim()

        const timer =
            window.setTimeout(() => {
                if (!value) {
                    searchRequestId.current +=
                        1

                    setActiveSearch("")
                    setSuggestions([])
                    setShowSuggestions(
                        false,
                    )

                    void loadEmployees(0)

                    return
                }

                void searchEmployees(
                    value,
                    0,
                    false,
                )

                setShowSuggestions(true)
            }, 350)

        return () =>
            window.clearTimeout(
                timer,
            )
    }, [
        search,
        loadEmployees,
        searchEmployees,
    ])

    // =========================================================
    // SEARCH SUGGESTIONS
    // =========================================================

    const suggestionResults =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase()

            if (!value) {
                return []
            }

            return suggestions.filter(
                (employee) =>
                    employee.employeeCode
                        .toLowerCase()
                        .includes(value) ||
                    employee.name
                        .toLowerCase()
                        .includes(value),
            )
        }, [
            search,
            suggestions,
        ])

    const handleSuggestionSelect =
        (employee: Employee) => {
            searchRequestId.current += 1

            setSearch(
                employee.employeeCode,
            )

            setShowSuggestions(false)
            setSuggestions([])

            void searchEmployees(
                employee.employeeCode,
                0,
                true,
            )
        }

    const clearSearch = () => {
        searchRequestId.current += 1

        setSearch("")
        setActiveSearch("")
        setSuggestions([])
        setShowSuggestions(false)
        setError("")

        void loadEmployees(0)
    }

    // =========================================================
    // FORM HELPERS
    // =========================================================

    const updateField = (
        field: keyof EmployeeRequest,
        value:
            | string
            | number
            | undefined,
    ) => {
        setForm(
            (previous) => ({
                ...previous,
                [field]: value,
            }),
        )
    }

    const clearFieldError = (
        field: string,
    ) => {
        setFieldErrors(
            (previous) => {
                if (!previous[field]) {
                    return previous
                }

                const updated = {
                    ...previous,
                }

                delete updated[field]

                return updated
            },
        )
    }

    const resetForm = () => {
        setForm({
            ...emptyForm,
        })

        setFieldErrors({})
        setEditingEmployeeId(null)
    }

    // =========================================================
    // DIALOG
    // =========================================================

    const openAddDialog = () => {
        resetForm()
        setError("")
        setDialogOpen(true)
    }

    const openEditDialog = (
        employee: Employee,
    ) => {
        setError("")
        setFieldErrors({})

        setEditingEmployeeId(
            employee.id,
        )

        setForm({
            employeeCode:
                employee.employeeCode ??
                "",

            name:
                employee.name ?? "",

            accountNumber:
                employee.accountNumber ??
                "",

            ifscCode:
                employee.ifscCode ?? "",

            position:
                employee.position ?? "",

            phoneNumber:
                employee.phoneNumber ?? "",

            email:
                employee.email ?? "",

            gradePay:
                employee.gradePay ?? 0,

            scale:
                employee.scale ?? "",

            headquarters:
                employee.headquarters ??
                "",

            designation:
                employee.designation ??
                "",

            categoryId:
                employee.categoryId ??
                0,

            bankId:
                employee.bankId ??
                undefined,
        })

        setDialogOpen(true)
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    const validateForm = () => {
        const errors: Record<
            string,
            string
        > = {}

        if (
            !form.employeeCode.trim()
        ) {
            errors.employeeCode =
                "Employee code is required."
        } else if (
            !/^\d+$/.test(
                form.employeeCode.trim(),
            )
        ) {
            errors.employeeCode =
                "Employee code must contain numbers only."
        }

        if (!form.name.trim()) {
            errors.name =
                "Employee name is required."
        }

        if (!form.categoryId) {
            errors.categoryId =
                "Please select an employee category."
        }

        if (form.accountNumber) {
            if (
                !/^\d+$/.test(
                    form.accountNumber,
                )
            ) {
                errors.accountNumber =
                    "Account number must contain digits only."
            } else if (
                form.accountNumber.length <
                8 ||
                form.accountNumber.length >
                18
            ) {
                errors.accountNumber =
                    "Account number must be between 8 and 18 digits."
            }
        }

        if (form.ifscCode) {
            if (
                !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
                    form.ifscCode,
                )
            ) {
                errors.ifscCode =
                    "Enter a valid 11-character IFSC code."
            }
        }

        if (form.phoneNumber) {
            if (
                !/^[6-9]\d{9}$/.test(
                    form.phoneNumber,
                )
            ) {
                errors.phoneNumber =
                    "Enter a valid 10-digit Indian mobile number."
            }
        }

        if (form.email) {
            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    form.email,
                )
            ) {
                errors.email =
                    "Enter a valid email address."
            }
        }

        if (form.gradePay < 0) {
            errors.gradePay =
                "Grade Pay cannot be negative."
        }

        return errors
    }

    // =========================================================
    // SAVE / UPDATE
    // =========================================================

    const handleSubmit = async (
        event: { preventDefault: () => void },
    ) => {
        event.preventDefault()

        const errors =
            validateForm()

        if (
            Object.keys(errors)
                .length > 0
        ) {
            setFieldErrors(errors)
            return
        }

        try {
            setSaving(true)
            setError("")
            setFieldErrors({})

            if (
                editingEmployeeId !==
                null
            ) {
                await updateEmployee(
                    editingEmployeeId,
                    form,
                )
            } else {
                await createEmployee(
                    form,
                )
            }

            setDialogOpen(false)

            resetForm()

            await loadEmployees(
                currentPage,
            )
        } catch (err: unknown) {
            console.error(err)

            const message =
                typeof err ===
                "object" &&
                err !== null &&
                "response" in err &&
                typeof (
                    err as {
                        response?: unknown
                    }
                ).response ===
                "object" &&
                (
                    err as {
                        response?: {
                            data?: {
                                message?: unknown
                            }
                        }
                    }
                ).response?.data
                    ?.message

            setError(
                typeof message ===
                "string"
                    ? message
                    : editingEmployeeId !==
                    null
                        ? "Failed to update employee."
                        : "Failed to create employee.",
            )
        } finally {
            setSaving(false)
        }
    }

    // =========================================================
    // ACTIVATE / DEACTIVATE
    // =========================================================

    const handleToggleEmployeeStatus =
        async (
            employee: Employee,
        ) => {
            const confirmed =
                window.confirm(
                    employee.active
                        ? `Are you sure you want to deactivate ${employee.name}?`
                        : `Are you sure you want to activate ${employee.name}?`,
                )

            if (!confirmed) {
                return
            }

            try {
                setActionLoadingId(
                    employee.id,
                )

                setError("")

                if (employee.active) {
                    await deactivateEmployee(
                        employee.id,
                    )
                } else {
                    await activateEmployee(
                        employee.id,
                    )
                }

                await loadEmployees(
                    currentPage,
                )
            } catch (err: unknown) {
                console.error(err)

                const message =
                    typeof err ===
                    "object" &&
                    err !== null &&
                    "response" in err &&
                    typeof (
                        err as {
                            response?: unknown
                        }
                    ).response ===
                    "object" &&
                    (
                        err as {
                            response?: {
                                data?: {
                                    message?: unknown
                                }
                            }
                        }
                    ).response?.data
                        ?.message

                setError(
                    typeof message ===
                    "string"
                        ? message
                        : employee.active
                            ? "Failed to deactivate employee."
                            : "Failed to activate employee.",
                )
            } finally {
                setActionLoadingId(
                    null,
                )
            }
        }

    // =========================================================
    // PAGINATION
    // =========================================================

    const goToPreviousPage =
        () => {
            if (currentPage <= 0) {
                return
            }

            if (activeSearch) {
                void searchEmployees(
                    activeSearch,
                    currentPage - 1,
                    true,
                )
            } else {
                void loadEmployees(
                    currentPage - 1,
                )
            }
        }

    const goToNextPage =
        () => {
            if (
                currentPage >=
                totalPages - 1
            ) {
                return
            }

            if (activeSearch) {
                void searchEmployees(
                    activeSearch,
                    currentPage + 1,
                    true,
                )
            } else {
                void loadEmployees(
                    currentPage + 1,
                )
            }
        }

    // =========================================================
    // STYLES
    // =========================================================

    const selectClass =
        "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

    // =========================================================
    // UI
    // =========================================================

    return (
        <div className="space-y-7">

            {/* =================================================
                PAGE HEADER
               ================================================= */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                <div>

                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">

                        <Users className="h-4 w-4" />

                        Employee Records

                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Employee Master
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage employee information and records.
                    </p>

                </div>

                {/* ADD / EDIT EMPLOYEE */}

                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open)

                        if (!open) {
                            resetForm()
                        } else {
                            setError("")
                            setFieldErrors({})
                        }
                    }}
                >

                    <DialogTrigger
                        render={
                            <Button
                                type="button"
                                onClick={openAddDialog}
                                className="h-10 rounded-xl px-5 shadow-sm"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Employee
                            </Button>
                        }
                    />

                    <DialogContent
                        className="
        flex
        h-[92vh]
        !w-[94vw]
        !max-w-[1500px]
        flex-col
        gap-0
        overflow-hidden
        rounded-2xl
        border-slate-200
        bg-white
        p-0
        shadow-2xl
    "
                    >

                        <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-8 py-6">

                            <DialogHeader>

                                <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900">
                                    {editingEmployeeId !== null
                                        ? "Edit Employee"
                                        : "Add Employee"}
                                </DialogTitle>

                                <DialogDescription className="mt-1 text-sm text-slate-500">
                                    {editingEmployeeId !== null
                                        ? "Update employee information and save the changes."
                                        : "Enter employee information and save the employee record."}
                                </DialogDescription>

                            </DialogHeader>

                        </div>


                        {/* =====================================================
        SCROLLABLE FORM AREA
       ===================================================== */}

                        <div className="min-h-0 flex-1 overflow-y-auto">

                            <form
                                id="employee-form"
                                onSubmit={handleSubmit}
                                className="space-y-5 px-8 py-7"
                            >

                                {/* =================================================
                SERVER ERROR
               ================================================= */}

                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}


                                {/* =================================================
                BASIC INFORMATION
               ================================================= */}

                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                                    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">

                                        <div className="flex items-center gap-3">

                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <UserRound className="h-4 w-4" />
                                            </div>

                                            <div>

                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Basic Information
                                                </h3>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Employee identification and employment details.
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                    <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">

                                        {/* Employee Code */}

                                        <FormField
                                            label="Employee Code"
                                            required
                                            error={fieldErrors.employeeCode}
                                        >
                                            <Input
                                                id="employeeCode"
                                                value={form.employeeCode}
                                                onChange={(event) => {
                                                    updateField(
                                                        "employeeCode",
                                                        event.target.value,
                                                    )

                                                    clearFieldError(
                                                        "employeeCode",
                                                    )
                                                }}
                                                placeholder="e.g. 1001"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.employeeCode
                                                }
                                            />
                                        </FormField>


                                        {/* Employee Name */}

                                        <FormField
                                            label="Employee Name"
                                            required
                                            error={fieldErrors.name}
                                        >
                                            <Input
                                                id="name"
                                                value={form.name}
                                                onChange={(event) => {
                                                    updateField(
                                                        "name",
                                                        event.target.value,
                                                    )

                                                    clearFieldError(
                                                        "name",
                                                    )
                                                }}
                                                placeholder="Full name"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.name
                                                }
                                            />
                                        </FormField>


                                        {/* Designation */}

                                        <FormField label="Designation">

                                            <Input
                                                id="designation"
                                                value={form.designation}
                                                onChange={(event) =>
                                                    updateField(
                                                        "designation",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Designation"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                            />

                                        </FormField>


                                        {/* Position */}

                                        <FormField label="Position">

                                            <Input
                                                id="position"
                                                value={form.position}
                                                onChange={(event) =>
                                                    updateField(
                                                        "position",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Position"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                            />

                                        </FormField>

                                    </div>

                                </section>


                                {/* =================================================
                EMPLOYMENT DETAILS
               ================================================= */}

                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                                    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">

                                        <div className="flex items-center gap-3">

                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                                                <BriefcaseBusiness className="h-4 w-4" />
                                            </div>

                                            <div>

                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Employment Details
                                                </h3>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Category, bank and posting information.
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                    <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-3">

                                        {/* Employee Category */}

                                        <FormField
                                            label="Employee Category"
                                            required
                                            error={fieldErrors.categoryId}
                                        >

                                            <div className="relative">

                                                <select
                                                    id="category"
                                                    value={
                                                        form.categoryId || ""
                                                    }
                                                    onChange={(event) => {
                                                        updateField(
                                                            "categoryId",
                                                            Number(
                                                                event.target.value,
                                                            ),
                                                        )

                                                        clearFieldError(
                                                            "categoryId",
                                                        )
                                                    }}
                                                    className={`${selectClass} ${
                                                        fieldErrors.categoryId
                                                            ? "border-red-300 focus:border-red-500"
                                                            : ""
                                                    }`}
                                                >

                                                    <option value="">
                                                        Select category
                                                    </option>

                                                    {categories
                                                        .filter(
                                                            (category) =>
                                                                category.active,
                                                        )
                                                        .map(
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

                                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                            </div>

                                        </FormField>


                                        {/* Bank */}

                                        <FormField label="Bank">

                                            <div className="relative">

                                                <select
                                                    id="bank"
                                                    value={
                                                        form.bankId || ""
                                                    }
                                                    onChange={(event) =>
                                                        updateField(
                                                            "bankId",
                                                            event.target
                                                                .value
                                                                ? Number(
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                                : undefined,
                                                        )
                                                    }
                                                    className={selectClass}
                                                >

                                                    <option value="">
                                                        Select bank
                                                    </option>

                                                    {banks
                                                        .filter(
                                                            (bank) =>
                                                                bank.active,
                                                        )
                                                        .map(
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

                                        </FormField>


                                        {/* Grade Pay */}

                                        <FormField
                                            label="Grade Pay"
                                            error={
                                                fieldErrors.gradePay
                                            }
                                        >

                                            <Input
                                                id="gradePay"
                                                type="text"
                                                inputMode="decimal"
                                                value={
                                                    form.gradePay === 0
                                                        ? "0"
                                                        : String(
                                                            form.gradePay,
                                                        )
                                                }
                                                onChange={(event) => {

                                                    let value =
                                                        event.target.value

                                                    value =
                                                        value.replace(
                                                            /[^0-9.]/g,
                                                            "",
                                                        )

                                                    const parts =
                                                        value.split(".")

                                                    if (
                                                        parts.length >
                                                        2
                                                    ) {
                                                        value = `${parts[0]}.${parts
                                                            .slice(1)
                                                            .join("")}`
                                                    }

                                                    const numericValue =
                                                        Number(
                                                            value || 0,
                                                        )

                                                    updateField(
                                                        "gradePay",
                                                        Number.isNaN(
                                                            numericValue,
                                                        )
                                                            ? 0
                                                            : numericValue,
                                                    )

                                                    clearFieldError(
                                                        "gradePay",
                                                    )
                                                }}
                                                placeholder="0.00"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.gradePay
                                                }
                                            />

                                        </FormField>


                                        {/* Scale */}

                                        <FormField label="Scale">

                                            <Input
                                                id="scale"
                                                value={form.scale}
                                                onChange={(event) =>
                                                    updateField(
                                                        "scale",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Pay scale"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                            />

                                        </FormField>


                                        {/* Headquarters */}

                                        <FormField
                                            label="Headquarters"
                                            className="md:col-span-2"
                                        >

                                            <Input
                                                id="headquarters"
                                                value={
                                                    form.headquarters
                                                }
                                                onChange={(event) =>
                                                    updateField(
                                                        "headquarters",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Headquarters"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                            />

                                        </FormField>

                                    </div>

                                </section>


                                {/* =================================================
                BANKING INFORMATION
               ================================================= */}

                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                                    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">

                                        <div className="flex items-center gap-3">

                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                                <CreditCard className="h-4 w-4" />
                                            </div>

                                            <div>

                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Banking Information
                                                </h3>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Employee payment account information.
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                    <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">

                                        {/* Account Number */}

                                        <FormField
                                            label="Bank Account Number"
                                            error={
                                                fieldErrors.accountNumber
                                            }
                                        >

                                            <Input
                                                id="accountNumber"
                                                type="text"
                                                inputMode="numeric"
                                                value={
                                                    form.accountNumber
                                                }
                                                onChange={(event) => {

                                                    const value =
                                                        event.target.value.replace(
                                                            /\D/g,
                                                            "",
                                                        )

                                                    updateField(
                                                        "accountNumber",
                                                        value,
                                                    )

                                                    clearFieldError(
                                                        "accountNumber",
                                                    )
                                                }}
                                                placeholder="Account number"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.accountNumber
                                                }
                                            />

                                        </FormField>


                                        {/* IFSC */}

                                        <FormField
                                            label="IFSC Code"
                                            error={
                                                fieldErrors.ifscCode
                                            }
                                        >

                                            <Input
                                                id="ifscCode"
                                                type="text"
                                                value={
                                                    form.ifscCode
                                                }
                                                onChange={(event) => {

                                                    const value =
                                                        event.target.value
                                                            .replace(
                                                                /\s/g,
                                                                "",
                                                            )
                                                            .toUpperCase()

                                                    updateField(
                                                        "ifscCode",
                                                        value,
                                                    )

                                                    clearFieldError(
                                                        "ifscCode",
                                                    )
                                                }}
                                                placeholder="e.g. SBIN0001234"
                                                maxLength={11}
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.ifscCode
                                                }
                                            />

                                        </FormField>

                                    </div>

                                </section>


                                {/* =================================================
                CONTACT INFORMATION
               ================================================= */}

                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                                    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">

                                        <div className="flex items-center gap-3">

                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                                <Landmark className="h-4 w-4" />
                                            </div>

                                            <div>

                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Contact Information
                                                </h3>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Employee contact details.
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                    <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2">

                                        {/* Phone */}

                                        <FormField
                                            label="Phone Number"
                                            error={
                                                fieldErrors.phoneNumber
                                            }
                                        >

                                            <Input
                                                id="phoneNumber"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={
                                                    form.phoneNumber
                                                }
                                                onChange={(event) => {

                                                    const value =
                                                        event.target.value
                                                            .replace(
                                                                /\D/g,
                                                                "",
                                                            )
                                                            .slice(
                                                                0,
                                                                10,
                                                            )

                                                    updateField(
                                                        "phoneNumber",
                                                        value,
                                                    )

                                                    clearFieldError(
                                                        "phoneNumber",
                                                    )
                                                }}
                                                placeholder="10-digit phone number"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.phoneNumber
                                                }
                                            />

                                        </FormField>


                                        {/* Email */}

                                        <FormField
                                            label="Email"
                                            error={
                                                fieldErrors.email
                                            }
                                        >

                                            <Input
                                                id="email"
                                                type="email"
                                                value={
                                                    form.email
                                                }
                                                onChange={(event) => {

                                                    updateField(
                                                        "email",
                                                        event.target.value,
                                                    )

                                                    clearFieldError(
                                                        "email",
                                                    )
                                                }}
                                                placeholder="Email address"
                                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                                                aria-invalid={
                                                    !!fieldErrors.email
                                                }
                                            />

                                        </FormField>

                                    </div>

                                </section>

                            </form>

                        </div>


                        {/* =====================================================
        STICKY FOOTER
       ===================================================== */}

                        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50/80 px-8 py-4">

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDialogOpen(false)
                                    resetForm()
                                }}
                                disabled={saving}
                                className="h-10 rounded-xl border-slate-200 bg-white px-5"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                form="employee-form"
                                disabled={saving}
                                className="h-10 min-w-32 rounded-xl px-5 shadow-sm"
                            >
                                {saving
                                    ? "Saving..."
                                    : editingEmployeeId !== null
                                        ? "Update Employee"
                                        : "Save Employee"}
                            </Button>

                        </div>

                    </DialogContent>

                </Dialog>

            </div>

            {/* =====================================================
                EMPLOYEE RECORDS
               ===================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* =================================================
                    SEARCH HEADER
                   ================================================= */}

                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 md:px-6">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div>

                            <h2 className="text-sm font-semibold text-slate-900">
                                Employee Records
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {totalElements} employee
                                {totalElements ===
                                1
                                    ? ""
                                    : "s"}
                            </p>

                        </div>

                        {/* SEARCH */}

                        <div className="relative w-full lg:max-w-xl">

                            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={
                                    search
                                }
                                onChange={(
                                    event,
                                ) => {
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )

                                    setShowSuggestions(
                                        event
                                            .target
                                            .value
                                            .trim()
                                            .length >
                                        0,
                                    )
                                }}
                                onFocus={() => {
                                    if (
                                        suggestionResults.length >
                                        0
                                    ) {
                                        setShowSuggestions(
                                            true,
                                        )
                                    }
                                }}
                                onKeyDown={(
                                    event,
                                ) => {
                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
                                        event.preventDefault()

                                        void searchEmployees(
                                            search,
                                            0,
                                            true,
                                        )
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {
                                        setShowSuggestions(
                                            false,
                                        )
                                    }
                                }}
                                placeholder="Search employee code or name..."
                                autoComplete="off"
                                className="h-11 rounded-xl border-slate-200 bg-white pl-9 pr-9 shadow-sm"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={
                                        clearSearch
                                    }
                                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}

                            {/* SEARCH SUGGESTIONS */}

                            {showSuggestions &&
                                search.trim() &&
                                suggestionResults.length >
                                0 && (

                                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">

                                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                                            Matching employees
                                        </div>

                                        {suggestionResults.map(
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
                                                        handleSuggestionSelect(
                                                            employee,
                                                        )
                                                    }
                                                    className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-slate-50"
                                                >

                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

                                                        <UserRound className="h-4 w-4" />

                                                    </div>

                                                    <div className="min-w-0 flex-1">

                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            {
                                                                employee.employeeCode
                                                            }
                                                        </p>

                                                        <p className="truncate text-xs text-slate-500">
                                                            {
                                                                employee.name
                                                            }

                                                            {employee.designation
                                                                ? ` • ${employee.designation}`
                                                                : ""}
                                                        </p>

                                                    </div>

                                                    <span className="text-xs font-medium text-primary">
                                                        Select
                                                    </span>

                                                </button>

                                            ),
                                        )}

                                    </div>

                                )}

                            {showSuggestions &&
                                search.trim()
                                    .length >=
                                2 &&
                                !searching &&
                                suggestionResults.length ===
                                0 && (

                                    <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
                                        No matching employee found.
                                    </div>

                                )}

                        </div>

                    </div>

                </div>

                {/* =================================================
                    ERROR
                   ================================================= */}

                {error &&
                    !dialogOpen && (
                        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-6">
                            {error}
                        </div>
                    )}

                {/* =================================================
                    TABLE HEADER
                   ================================================= */}

                <div className="px-5 pb-5 pt-5 md:px-6">

                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <h3 className="text-sm font-semibold text-slate-900">
                                Employee List
                            </h3>

                            <p className="text-xs text-slate-500">
                                {loading
                                    ? "Loading records..."
                                    : totalElements >
                                    0
                                        ? `Showing ${
                                            currentPage *
                                            pageSize +
                                            1
                                        }–${Math.min(
                                            (currentPage +
                                                1) *
                                            pageSize,
                                            totalElements,
                                        )} of ${totalElements}`
                                        : "No employee records"}
                            </p>

                        </div>

                    </div>

                    {/* =================================================
                        LOADING
                       ================================================= */}

                    {loading &&
                    employees.length ===
                    0 ? (

                        <div className="flex min-h-56 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-sm text-slate-500">
                            Loading employees...
                        </div>

                    ) : employees.length ===
                    0 ? (

                        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 text-center">

                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">

                                <Users className="h-5 w-5" />

                            </div>

                            <p className="text-sm font-semibold text-slate-800">
                                No employees found
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Try another search or add a new employee.
                            </p>

                        </div>

                    ) : (

                        /* =================================================
                            TABLE
                           ================================================= */

                        <div className="overflow-hidden rounded-xl border border-slate-200">

                            <div className="overflow-x-auto">

                                <table className="w-full min-w-237.5 text-sm">

                                    <thead className="bg-slate-50">

                                    <tr className="border-b border-slate-200">

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Employee Code
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Employee Name
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Designation
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Category
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Bank
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Status
                                        </th>

                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Actions
                                        </th>

                                    </tr>

                                    </thead>

                                    <tbody>

                                    {employees.map(
                                        (
                                            employee,
                                        ) => (

                                            <tr
                                                key={
                                                    employee.id
                                                }
                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                                            >

                                                {/* EMPLOYEE CODE */}

                                                <td className="px-4 py-3.5">

                                                        <span className="font-medium tabular-nums text-slate-800">
                                                            {
                                                                employee.employeeCode
                                                            }
                                                        </span>

                                                </td>

                                                {/* EMPLOYEE NAME */}

                                                <td className="px-4 py-3.5">

                                                        <span className="font-medium text-slate-800">
                                                            {
                                                                employee.name
                                                            }
                                                        </span>

                                                </td>

                                                {/* DESIGNATION */}

                                                <td className="px-4 py-3.5 text-slate-600">

                                                    {
                                                        employee.designation ||
                                                        "-"
                                                    }

                                                </td>

                                                {/* CATEGORY */}

                                                <td className="px-4 py-3.5">

                                                    {employee.categoryName ? (

                                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                                {
                                                                    employee.categoryName
                                                                }
                                                            </span>

                                                    ) : (
                                                        <span className="text-slate-400">
                                                                -
                                                            </span>
                                                    )}

                                                </td>

                                                {/* BANK */}

                                                <td className="px-4 py-3.5 text-slate-600">

                                                    {
                                                        employee.bankName ||
                                                        "-"
                                                    }

                                                </td>

                                                {/* STATUS */}

                                                <td className="px-4 py-3.5">

                                                    {employee.active ? (

                                                        <Badge
                                                            variant="outline"
                                                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                                        >
                                                            <CheckCircle2 className="mr-1 h-3 w-3" />

                                                            Active
                                                        </Badge>

                                                    ) : (

                                                        <Badge
                                                            variant="outline"
                                                            className="border-slate-200 bg-slate-50 text-slate-600"
                                                        >
                                                            Inactive
                                                        </Badge>

                                                    )}

                                                </td>

                                                {/* ACTIONS */}

                                                <td className="px-4 py-3.5">

                                                    <div className="flex justify-end gap-2">

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                openEditDialog(
                                                                    employee,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoadingId ===
                                                                employee.id
                                                            }
                                                            className="h-8 border-slate-200"
                                                        >
                                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />

                                                            Edit
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                void handleToggleEmployeeStatus(
                                                                    employee,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoadingId ===
                                                                employee.id
                                                            }
                                                            className={
                                                                employee.active
                                                                    ? "h-8 border-red-200 text-red-600 hover:bg-red-50"
                                                                    : "h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                            }
                                                        >
                                                            {actionLoadingId ===
                                                            employee.id
                                                                ? "Updating..."
                                                                : employee.active
                                                                    ? "Deactivate"
                                                                    : "Activate"}
                                                        </Button>

                                                    </div>

                                                </td>

                                            </tr>

                                        ),
                                    )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    )}

                    {/* =================================================
                        PAGINATION
                       ================================================= */}

                    {totalElements >
                        0 && (
                            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                                <p className="text-xs text-slate-500">
                                    Page{" "}
                                    {currentPage +
                                        1}{" "}
                                    of{" "}
                                    {
                                        totalPages
                                    }
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
                                            currentPage ===
                                            0 ||
                                            loading ||
                                            searching
                                        }
                                        className="h-8 border-slate-200"
                                    >
                                        <ChevronLeft className="mr-1 h-4 w-4" />

                                        Previous
                                    </Button>

                                    <span className="min-w-10 text-center text-xs font-medium text-slate-500">
                                    {
                                        currentPage +
                                        1
                                    }
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
                                            totalPages -
                                            1 ||
                                            loading ||
                                            searching
                                        }
                                        className="h-8 border-slate-200"
                                    >
                                        Next

                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>

                                </div>

                            </div>
                        )}

                </div>

            </section>

        </div>
    )
}