import { useEffect, useState } from "react"
import { Plus, UserCheck, UserX } from "lucide-react"

import {
    activateAdmin,
    createAdmin,
    deactivateAdmin,
    getAdmins,
    type Admin,
} from "@/api/admins"

import { getApiErrorMessage } from "@/api/error"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


interface AdminForm {
    name: string
    username: string
    password: string
    role: string
}


const emptyForm: AdminForm = {
    name: "",
    username: "",
    password: "",
    role: "ADMIN",
}


/*
 * Get the username of the currently logged-in administrator
 * from the JWT subject.
 *
 * This is only for frontend UI behavior.
 * Backend authorization remains the final security layer.
 */
const getCurrentAdminUsername = (): string => {

    const token =
        sessionStorage.getItem("authToken")

    if (!token) {
        return ""
    }

    try {

        const payload =
            token.split(".")[1]

        if (!payload) {
            return ""
        }

        const normalizedPayload =
            payload
                .replace(/-/g, "+")
                .replace(/_/g, "/")

        const decodedPayload =
            JSON.parse(
                atob(normalizedPayload),
            ) as {
                sub?: string
            }

        return (
            decodedPayload.sub?.trim() ||
            ""
        )

    } catch {

        return ""
    }
}


export default function AdminManagement() {

    const [admins, setAdmins] =
        useState<Admin[]>([])

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [actionLoadingId, setActionLoadingId] =
        useState<number | null>(null)

    const [showForm, setShowForm] =
        useState(false)

    const [form, setForm] =
        useState<AdminForm>(emptyForm)

    const [errorMessage, setErrorMessage] =
        useState("")

    const [successMessage, setSuccessMessage] =
        useState("")


    // --------------------------------------------------
    // Load administrators
    // --------------------------------------------------

    useEffect(() => {

        const loadAdmins = async () => {

            try {

                setLoading(true)
                setErrorMessage("")

                const data =
                    await getAdmins()

                setAdmins(data)

            } catch (error) {

                console.error(
                    "Failed to load administrators:",
                    error,
                )

                setErrorMessage(
                    getApiErrorMessage(
                        error,
                        "Failed to load administrators.",
                    ),
                )

            } finally {

                setLoading(false)
            }
        }

        void loadAdmins()

    }, [])


    // --------------------------------------------------
    // Current logged-in administrator
    // --------------------------------------------------

    const currentAdminUsername =
        getCurrentAdminUsername()


    // --------------------------------------------------
    // Form helpers
    // --------------------------------------------------

    const updateField = (
        field: keyof AdminForm,
        value: string,
    ) => {

        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))
    }


    const resetForm = () => {

        setForm({
            ...emptyForm,
        })

        setShowForm(false)
        setErrorMessage("")
    }


    // --------------------------------------------------
    // Create administrator
    // --------------------------------------------------

    const handleCreateAdmin = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {

        event.preventDefault()

        setErrorMessage("")
        setSuccessMessage("")


        if (
            !form.name.trim() ||
            !form.username.trim() ||
            !form.password
        ) {

            setErrorMessage(
                "Name, username and password are required.",
            )

            return
        }


        try {

            setSaving(true)

            const createdAdmin =
                await createAdmin({
                    name: form.name.trim(),
                    username: form.username.trim(),
                    password: form.password,
                    role: form.role,
                })


            setAdmins((previous) => [
                ...previous,
                createdAdmin,
            ])


            setSuccessMessage(
                "Administrator created successfully.",
            )


            setForm({
                ...emptyForm,
            })

            setShowForm(false)

        } catch (error) {

            console.error(
                "Failed to create administrator:",
                error,
            )

            setErrorMessage(
                getApiErrorMessage(
                    error,
                    "Failed to create administrator.",
                ),
            )

        } finally {

            setSaving(false)
        }
    }


    // --------------------------------------------------
    // Activate / Deactivate administrator
    // --------------------------------------------------

    const handleToggleStatus = async (
        admin: Admin,
    ) => {

        const action =
            admin.active
                ? "deactivate"
                : "activate"


        const isCurrentAdmin =
            admin.username.toLowerCase() ===
            currentAdminUsername.toLowerCase()


        // Prevent self-deactivation in UI.
        // Backend also protects this operation.
        if (
            admin.active &&
            isCurrentAdmin
        ) {

            setErrorMessage(
                "You cannot deactivate your own administrator account.",
            )

            setSuccessMessage("")

            return
        }


        const confirmed =
            window.confirm(
                `Are you sure you want to ${action} ${admin.name}?`,
            )


        if (!confirmed) {
            return
        }


        try {

            setActionLoadingId(
                admin.id,
            )

            setErrorMessage("")
            setSuccessMessage("")


            if (admin.active) {

                await deactivateAdmin(
                    admin.id,
                )

            } else {

                await activateAdmin(
                    admin.id,
                )
            }


            setAdmins((previous) =>
                previous.map((item) =>
                    item.id === admin.id
                        ? {
                            ...item,
                            active: !item.active,
                        }
                        : item,
                ),
            )


            setSuccessMessage(
                `Administrator ${action}d successfully.`,
            )

        } catch (error) {

            console.error(
                `Failed to ${action} administrator:`,
                error,
            )

            setErrorMessage(
                getApiErrorMessage(
                    error,
                    `Failed to ${action} administrator.`,
                ),
            )

        } finally {

            setActionLoadingId(null)
        }
    }


    return (
        <div className="space-y-6">

            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                <div>

                    <p className="text-sm font-medium text-primary">
                        User Management
                    </p>

                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                        Admin Management
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage administrator accounts and access.
                    </p>

                </div>


                <Button
                    type="button"
                    onClick={() => {

                        setErrorMessage("")
                        setSuccessMessage("")

                        setForm({
                            ...emptyForm,
                        })

                        setShowForm(true)
                    }}
                    className="h-10"
                >

                    <Plus className="mr-2 h-4 w-4" />

                    Add Admin

                </Button>

            </div>


            {/* ==================================================
                MESSAGES
            ================================================== */}

            {errorMessage && (

                <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                    {errorMessage}
                </div>

            )}


            {successMessage && (

                <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                >
                    {successMessage}
                </div>

            )}


            {/* ==================================================
                ADD ADMIN FORM
            ================================================== */}

            {showForm && (

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">

                        <h2 className="text-sm font-semibold">
                            Add Administrator
                        </h2>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Create a new administrator account.
                        </p>

                    </div>


                    <form
                        onSubmit={
                            handleCreateAdmin
                        }
                        className="p-5"
                    >

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                            {/* Name */}

                            <div className="space-y-1.5">

                                <Label htmlFor="adminName">
                                    Name
                                </Label>

                                <Input
                                    id="adminName"
                                    value={
                                        form.name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            "name",
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Administrator name"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* Username */}

                            <div className="space-y-1.5">

                                <Label htmlFor="adminUsername">
                                    Username
                                </Label>

                                <Input
                                    id="adminUsername"
                                    value={
                                        form.username
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            "username",
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Login username"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* Password */}

                            <div className="space-y-1.5">

                                <Label htmlFor="adminPassword">
                                    Password
                                </Label>

                                <Input
                                    id="adminPassword"
                                    type="password"
                                    value={
                                        form.password
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            "password",
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="Password"
                                    disabled={
                                        saving
                                    }
                                />

                                <p className="text-xs text-muted-foreground">
                                    Minimum 8 characters with uppercase,
                                    lowercase, number and special character.
                                </p>

                            </div>


                            {/* Role */}

                            <div className="space-y-1.5">

                                <Label htmlFor="adminRole">
                                    Role
                                </Label>

                                <select
                                    id="adminRole"
                                    value={
                                        form.role
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        updateField(
                                            "role",
                                            event.target
                                                .value,
                                        )
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    <option value="ADMIN">
                                        ADMIN
                                    </option>

                                    <option value="SUPER_ADMIN">
                                        SUPER_ADMIN
                                    </option>

                                </select>

                            </div>

                        </div>


                        {/* Form Actions */}

                        <div className="mt-5 flex justify-end gap-2 border-t pt-5">

                            <Button
                                type="button"
                                variant="outline"
                                onClick={
                                    resetForm
                                }
                                disabled={
                                    saving
                                }
                            >
                                Cancel
                            </Button>


                            <Button
                                type="submit"
                                disabled={
                                    saving
                                }
                            >

                                {saving
                                    ? "Saving..."
                                    : "Create Admin"}

                            </Button>

                        </div>

                    </form>

                </section>

            )}


            {/* ==================================================
                ADMINISTRATOR RECORDS
            ================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <h2 className="text-sm font-semibold">
                                Administrator Records
                            </h2>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Manage administrator accounts and status.
                            </p>

                        </div>


                        <span className="text-xs text-muted-foreground">
                            {admins.length} administrator
                            {admins.length === 1
                                ? ""
                                : "s"}
                        </span>

                    </div>

                </div>


                <div className="p-5">

                    {loading ? (

                        <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 text-sm text-muted-foreground">
                            Loading administrators...
                        </div>

                    ) : admins.length === 0 ? (

                        <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 text-sm text-muted-foreground">
                            No administrators found.
                        </div>

                    ) : (

                        <div className="overflow-hidden rounded-xl border border-slate-200">

                            <div className="overflow-x-auto">

                                <table className="w-full min-w-[800px] text-sm">

                                    <thead className="bg-slate-50">

                                    <tr className="border-b border-slate-200">

                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                                            Name
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                                            Username
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                                            Role
                                        </th>

                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                                            Status
                                        </th>

                                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                                            Actions
                                        </th>

                                    </tr>

                                    </thead>


                                    <tbody>

                                    {admins.map(
                                        (admin) => {

                                            const isCurrentAdmin =
                                                admin.username.toLowerCase() ===
                                                currentAdminUsername.toLowerCase()

                                            const isSelfDeactivation =
                                                admin.active &&
                                                isCurrentAdmin


                                            return (

                                                <tr
                                                    key={
                                                        admin.id
                                                    }
                                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                                                >

                                                    {/* Name */}

                                                    <td className="px-4 py-3.5 font-medium">
                                                        {
                                                            admin.name
                                                        }
                                                    </td>


                                                    {/* Username */}

                                                    <td className="px-4 py-3.5 text-muted-foreground">
                                                        {
                                                            admin.username
                                                        }

                                                        {isCurrentAdmin && (
                                                            <span className="ml-2 text-xs font-medium text-primary">
                                                                    You
                                                                </span>
                                                        )}
                                                    </td>


                                                    {/* Role */}

                                                    <td className="px-4 py-3.5">
                                                        {
                                                            admin.role
                                                        }
                                                    </td>


                                                    {/* Status */}

                                                    <td className="px-4 py-3.5">

                                                        {admin.active ? (

                                                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                                    Active
                                                                </span>

                                                        ) : (

                                                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                                    Inactive
                                                                </span>

                                                        )}

                                                    </td>


                                                    {/* Actions */}

                                                    <td className="px-4 py-3.5">

                                                        <div className="flex justify-end">

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={
                                                                    actionLoadingId ===
                                                                    admin.id ||
                                                                    isSelfDeactivation
                                                                }
                                                                title={
                                                                    isSelfDeactivation
                                                                        ? "You cannot deactivate your own administrator account."
                                                                        : undefined
                                                                }
                                                                onClick={() =>
                                                                    void handleToggleStatus(
                                                                        admin,
                                                                    )
                                                                }
                                                                className={
                                                                    admin.active
                                                                        ? "h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                                        : "h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                                }
                                                            >

                                                                {admin.active ? (

                                                                    <>
                                                                        <UserX className="mr-1.5 h-3.5 w-3.5" />

                                                                        {isCurrentAdmin
                                                                            ? "Current Admin"
                                                                            : "Deactivate"}
                                                                    </>

                                                                ) : (

                                                                    <>
                                                                        <UserCheck className="mr-1.5 h-3.5 w-3.5" />

                                                                        Activate
                                                                    </>

                                                                )}

                                                            </Button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            )
                                        },
                                    )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    )}

                </div>

            </section>

        </div>
    )
}