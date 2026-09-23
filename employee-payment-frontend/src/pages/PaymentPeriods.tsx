import { useEffect, useState, type FormEvent } from "react"
import { CalendarDays, Plus, RefreshCw } from "lucide-react"

import {
    createPaymentPeriod,
    getPaymentPeriods,
    type PaymentPeriod,
    type PaymentPeriodRequest,
} from "@/api/paymentPeriods"

import { getApiErrorMessage } from "@/api/error"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
]

const getCurrentYear = () => new Date().getFullYear()

const getMonthName = (month: number) =>
    months.find((item) => item.value === month)?.label ?? String(month)

const formatDate = (date: string) => {
    if (!date) return "-"

    const parts = date.split("-")

    if (parts.length !== 3) return date

    return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default function PaymentPeriods() {
    const [paymentPeriods, setPaymentPeriods] = useState<PaymentPeriod[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [month, setMonth] = useState("")
    const [year, setYear] = useState(String(getCurrentYear()))
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const loadPaymentPeriods = async () => {
        try {
            setLoading(true)
            setError("")

            const data = await getPaymentPeriods()
            setPaymentPeriods(data)
        } catch (err) {
            setError(
                getApiErrorMessage(
                    err,
                    "Failed to load payment periods.",
                ),
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadPaymentPeriods()
    }, [])

    const resetForm = () => {
        setMonth("")
        setYear(String(getCurrentYear()))
        setStartDate("")
        setEndDate("")
    }

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        setError("")
        setSuccess("")

        if (!month) {
            setError("Please select a month.")
            return
        }

        const numericYear = Number(year)
        const numericMonth = Number(month)

        if (
            !Number.isInteger(numericYear) ||
            numericYear < 2000 ||
            numericYear > 2100
        ) {
            setError("Please enter a valid year.")
            return
        }

        if (!startDate) {
            setError("Please select a start date.")
            return
        }

        if (!endDate) {
            setError("Please select an end date.")
            return
        }

        if (endDate < startDate) {
            setError("End date cannot be earlier than the start date.")
            return
        }

        const request: PaymentPeriodRequest = {
            month: numericMonth,
            year: numericYear,
            startDate,
            endDate,
        }

        try {
            setSaving(true)

            const createdPeriod = await createPaymentPeriod(request)

            setSuccess(
                `Payment period ${getMonthName(createdPeriod.month)} ${createdPeriod.year} created successfully.`,
            )

            resetForm()
            await loadPaymentPeriods()
        } catch (err) {
            setError(
                getApiErrorMessage(
                    err,
                    "Failed to create payment period.",
                ),
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-7">

            {/* PAGE HEADER */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        Payment Administration
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Payment Periods
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Create and manage payment periods for employee payments.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadPaymentPeriods()}
                    disabled={loading}
                    className="h-10 rounded-xl border-slate-200 bg-white px-4"
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${
                            loading ? "animate-spin" : ""
                        }`}
                    />
                    Refresh
                </Button>

            </div>


            {/* MESSAGES */}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                </div>
            )}


            {/* CREATE PAYMENT PERIOD */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">

                    <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Plus className="h-5 w-5" />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                Create Payment Period
                            </h2>

                            <p className="mt-0.5 text-sm text-slate-500">
                                Define the month and date range used for employee payments.
                            </p>
                        </div>

                    </div>

                </div>

                <form
                    onSubmit={handleCreate}
                    className="px-6 py-6"
                >

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

                        {/* MONTH */}

                        <div className="space-y-2">
                            <Label
                                htmlFor="payment-month"
                                className="text-sm font-medium text-slate-700"
                            >
                                Month
                            </Label>

                            <select
                                id="payment-month"
                                value={month}
                                onChange={(event) =>
                                    setMonth(event.target.value)
                                }
                                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                            >
                                <option value="">
                                    Select month
                                </option>

                                {months.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>


                        {/* YEAR */}

                        <div className="space-y-2">
                            <Label
                                htmlFor="payment-year"
                                className="text-sm font-medium text-slate-700"
                            >
                                Year
                            </Label>

                            <Input
                                id="payment-year"
                                type="number"
                                min={2000}
                                max={2100}
                                value={year}
                                onChange={(event) =>
                                    setYear(event.target.value)
                                }
                                placeholder="2026"
                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                            />
                        </div>


                        {/* START DATE */}

                        <div className="space-y-2">
                            <Label
                                htmlFor="payment-start-date"
                                className="text-sm font-medium text-slate-700"
                            >
                                Start Date
                            </Label>

                            <Input
                                id="payment-start-date"
                                type="date"
                                value={startDate}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                            />
                        </div>


                        {/* END DATE */}

                        <div className="space-y-2">
                            <Label
                                htmlFor="payment-end-date"
                                className="text-sm font-medium text-slate-700"
                            >
                                End Date
                            </Label>

                            <Input
                                id="payment-end-date"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                                className="h-11 rounded-xl border-slate-200 shadow-sm"
                            />
                        </div>

                    </div>


                    <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">

                        <Button
                            type="submit"
                            disabled={saving}
                            className="h-10 rounded-xl px-5 shadow-sm"
                        >
                            <Plus className="mr-2 h-4 w-4" />

                            {saving
                                ? "Creating..."
                                : "Create Payment Period"}
                        </Button>

                    </div>

                </form>

            </section>


            {/* PAYMENT PERIOD RECORDS */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Payment Period Records
                        </h2>

                        <p className="mt-0.5 text-sm text-slate-500">
                            All configured payment periods.
                        </p>
                    </div>

                    <div className="text-sm text-slate-500">
                        {paymentPeriods.length}{" "}
                        {paymentPeriods.length === 1
                            ? "period"
                            : "periods"}
                    </div>

                </div>


                <div className="overflow-x-auto">

                    <table className="w-full min-w-[800px] text-sm">

                        <thead className="bg-slate-50/80">

                        <tr className="border-b border-slate-200">

                            <th className="px-6 py-4 text-left font-semibold text-slate-700">
                                Payment Period
                            </th>

                            <th className="px-6 py-4 text-left font-semibold text-slate-700">
                                Year
                            </th>

                            <th className="px-6 py-4 text-left font-semibold text-slate-700">
                                Start Date
                            </th>

                            <th className="px-6 py-4 text-left font-semibold text-slate-700">
                                End Date
                            </th>

                            <th className="px-6 py-4 text-left font-semibold text-slate-700">
                                Status
                            </th>

                        </tr>

                        </thead>

                        <tbody>

                        {loading ? (

                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-6 py-12 text-center text-sm text-slate-500"
                                >
                                    Loading payment periods...
                                </td>
                            </tr>

                        ) : paymentPeriods.length === 0 ? (

                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-6 py-12 text-center text-sm text-slate-500"
                                >
                                    No payment periods found.
                                </td>
                            </tr>

                        ) : (

                            paymentPeriods.map((period) => (

                                <tr
                                    key={period.id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                                >

                                    <td className="px-6 py-4">

                                        <div className="font-semibold text-slate-900">
                                            {getMonthName(period.month)}
                                        </div>

                                        <div className="mt-0.5 text-xs text-slate-500">
                                            {String(period.month).padStart(
                                                2,
                                                "0",
                                            )}
                                            /
                                            {period.year}
                                        </div>

                                    </td>

                                    <td className="px-6 py-4 text-slate-700">
                                        {period.year}
                                    </td>

                                    <td className="px-6 py-4 text-slate-700">
                                        {formatDate(period.startDate)}
                                    </td>

                                    <td className="px-6 py-4 text-slate-700">
                                        {formatDate(period.endDate)}
                                    </td>

                                    <td className="px-6 py-4">

                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                    period.status === "OPEN"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {period.status}
                                            </span>

                                    </td>

                                </tr>

                            ))

                        )}

                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    )
}
