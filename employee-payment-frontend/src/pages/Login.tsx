// import { useState } from "react"
// import { useNavigate } from "react-router-dom"
// import { useForm } from "react-hook-form"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { z } from "zod"
// import { LockKeyhole, LogIn, UserRound } from "lucide-react"
//
// import { Button } from "@/components/ui/button"
// import {
//     Card,
//     CardContent,
//     CardDescription,
//     CardHeader,
//     CardTitle,
// } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
//
// import { loginAdmin } from "@/api/auth"
//
// const loginSchema = z.object({
//     username: z.string().min(1, "Username is required"),
//     password: z.string().min(1, "Password is required"),
// })
//
// type LoginFormData = z.infer<typeof loginSchema>
//
// export default function Login() {
//     const navigate = useNavigate()
//     const [serverError, setServerError] = useState("")
//     const [isLoading, setIsLoading] = useState(false)
//
//     const {
//         register,
//         handleSubmit,
//         formState: { errors },
//     } = useForm<LoginFormData>({
//         resolver: zodResolver(loginSchema),
//     })
//
//     const onSubmit = async (data: LoginFormData) => {
//         setServerError("")
//         setIsLoading(true)
//
//         try {
//             const response = await loginAdmin(data)
//
//             // Store authentication information for this browser session.
//             sessionStorage.setItem("authToken", response.token)
//             sessionStorage.setItem("adminId", String(response.adminId))
//             sessionStorage.setItem("adminName", response.name)
//             sessionStorage.setItem("adminUsername", response.username)
//             sessionStorage.setItem("adminRole", response.role)
//
//             console.log("Login successful")
//             console.log("Administrator:", response.name)
//             console.log("Role:", response.role)
//
//             navigate("/")
//         } catch (error: unknown) {
//             console.error("Login failed:", error)
//
//             setServerError(
//                 "Login failed. Please check your username and password."
//             )
//         } finally {
//             setIsLoading(false)
//         }
//     }
//
//     return (
//         <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4 py-8">
//             <div className="w-full max-w-md">
//
//                 {/* System Branding */}
//                 <div className="text-center mb-8">
//                     <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
//                         <LockKeyhole className="h-8 w-8" />
//                     </div>
//
//                     <h1 className="text-2xl font-bold tracking-tight">
//                         Employee Payment Management System
//                     </h1>
//
//                     <p className="mt-2 text-sm text-muted-foreground">
//                         Administrator Login
//                     </p>
//                 </div>
//
//                 {/* Login Card */}
//                 <Card className="shadow-xl">
//                     <CardHeader className="space-y-1">
//                         <CardTitle className="text-xl">
//                             Sign in
//                         </CardTitle>
//
//                         <CardDescription>
//                             Enter your administrator credentials to continue.
//                         </CardDescription>
//                     </CardHeader>
//
//                     <CardContent>
//                         <form
//                             onSubmit={handleSubmit(onSubmit)}
//                             className="space-y-5"
//                         >
//
//                             {/* Server Error */}
//                             {serverError && (
//                                 <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
//                                     {serverError}
//                                 </div>
//                             )}
//
//                             {/* Username */}
//                             <div className="space-y-2">
//                                 <Label htmlFor="username">
//                                     Username
//                                 </Label>
//
//                                 <div className="relative">
//                                     <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//
//                                     <Input
//                                         id="username"
//                                         type="text"
//                                         placeholder="Enter username"
//                                         className="pl-10"
//                                         autoComplete="username"
//                                         disabled={isLoading}
//                                         {...register("username")}
//                                     />
//                                 </div>
//
//                                 {errors.username && (
//                                     <p className="text-sm text-destructive">
//                                         {errors.username.message}
//                                     </p>
//                                 )}
//                             </div>
//
//                             {/* Password */}
//                             <div className="space-y-2">
//                                 <Label htmlFor="password">
//                                     Password
//                                 </Label>
//
//                                 <div className="relative">
//                                     <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//
//                                     <Input
//                                         id="password"
//                                         type="password"
//                                         placeholder="Enter password"
//                                         className="pl-10"
//                                         autoComplete="current-password"
//                                         disabled={isLoading}
//                                         {...register("password")}
//                                     />
//                                 </div>
//
//                                 {errors.password && (
//                                     <p className="text-sm text-destructive">
//                                         {errors.password.message}
//                                     </p>
//                                 )}
//                             </div>
//
//                             {/* Login Button */}
//                             <Button
//                                 type="submit"
//                                 className="w-full"
//                                 disabled={isLoading}
//                             >
//                                 <LogIn className="mr-2 h-4 w-4" />
//
//                                 {isLoading ? "Signing in..." : "Sign In"}
//                             </Button>
//
//                         </form>
//                     </CardContent>
//                 </Card>
//
//                 {/* Footer */}
//                 <p className="mt-6 text-center text-xs text-muted-foreground">
//                     Authorized administrators only
//                 </p>
//
//             </div>
//         </div>
//     )
// }


import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Eye,
    EyeOff,
    LockKeyhole,
    LogIn,
    UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { loginAdmin } from "@/api/auth"
import { getApiErrorMessage } from "@/api/error"

const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
    const navigate = useNavigate()

    const [serverError, setServerError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setServerError("")
        setIsLoading(true)

        try {
            const response = await loginAdmin(data)

            sessionStorage.setItem(
                "authToken",
                response.token,
            )

            sessionStorage.setItem(
                "adminId",
                String(response.adminId),
            )

            sessionStorage.setItem(
                "adminName",
                response.name,
            )

            sessionStorage.setItem(
                "adminUsername",
                response.username,
            )

            sessionStorage.setItem(
                "adminRole",
                response.role,
            )

            navigate("/")
        } catch (error: unknown) {
            setServerError(
                getApiErrorMessage(
                    error,
                    "Login failed. Please check your username and password.",
                ),
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">

            <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">

                {/* =====================================================
                    LEFT BRANDING PANEL
                   ===================================================== */}

                <div className="relative hidden overflow-hidden bg-slate-900 lg:flex">

                    {/* Decorative background */}

                    <div className="absolute inset-0">

                        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

                        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />

                    </div>


                    <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

                        {/* Brand */}

                        <div>

                            <div className="flex items-center gap-4">

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg">

                                    <LockKeyhole className="h-6 w-6" />

                                </div>

                                <div>

                                    <p className="text-sm font-semibold tracking-wide text-white">
                                        Employee Payment
                                    </p>

                                    <p className="text-sm text-slate-400">
                                        Management System
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Main message */}

                        <div className="max-w-xl">

                            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                                Administration Portal
                            </p>

                            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                                Manage employee payments with confidence.
                            </h1>

                            <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
                                Securely manage employee records, payment
                                periods, payment entries, summaries and
                                payment advice from one centralized system.
                            </p>

                        </div>


                        {/* Footer */}

                        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-500">

                            <span>
                                Internal Administration System
                            </span>

                            <span>
                                Secure Access
                            </span>

                        </div>

                    </div>

                </div>


                {/* =====================================================
                    LOGIN PANEL
                   ===================================================== */}

                <div className="flex min-h-screen items-center justify-center bg-white px-6 py-10 sm:px-10">

                    <div className="w-full max-w-md">

                        {/* Mobile Brand */}

                        <div className="mb-10 flex items-center gap-3 lg:hidden">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">

                                <LockKeyhole className="h-5 w-5" />

                            </div>

                            <div>

                                <p className="text-sm font-semibold text-slate-900">
                                    Employee Payment
                                </p>

                                <p className="text-xs text-slate-500">
                                    Management System
                                </p>

                            </div>

                        </div>


                        {/* Login Heading */}

                        <div className="mb-8">

                            <p className="mb-3 text-sm font-medium text-primary">
                                Administration Portal
                            </p>

                            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Welcome back
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Sign in with your administrator credentials
                                to continue.
                            </p>

                        </div>


                        {/* Login Form */}

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-6"
                        >

                            {/* Server Error */}

                            {serverError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                                    {serverError}
                                </div>
                            )}


                            {/* Username */}

                            <div className="space-y-2">

                                <Label
                                    htmlFor="username"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Username
                                </Label>

                                <div className="relative">

                                    <UserRound
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-3.5
                                            top-1/2
                                            h-4
                                            w-4
                                            -translate-y-1/2
                                            text-slate-400
                                        "
                                    />

                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Enter your username"
                                        autoComplete="username"
                                        disabled={isLoading}
                                        className="
                                            h-12
                                            rounded-xl
                                            border-slate-200
                                            bg-white
                                            pl-11
                                            shadow-sm
                                            transition
                                            focus:border-primary
                                            focus:ring-2
                                            focus:ring-primary/10
                                        "
                                        {...register("username")}
                                    />

                                </div>

                                {errors.username && (
                                    <p className="text-xs font-medium text-red-600">
                                        {errors.username.message}
                                    </p>
                                )}

                            </div>


                            {/* Password */}

                            <div className="space-y-2">

                                <Label
                                    htmlFor="password"
                                    className="text-sm font-medium text-slate-700"
                                >
                                    Password
                                </Label>

                                <div className="relative">

                                    <LockKeyhole
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-3.5
                                            top-1/2
                                            h-4
                                            w-4
                                            -translate-y-1/2
                                            text-slate-400
                                        "
                                    />

                                    <Input
                                        id="password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        className="
                                            h-12
                                            rounded-xl
                                            border-slate-200
                                            bg-white
                                            pl-11
                                            pr-11
                                            shadow-sm
                                            transition
                                            focus:border-primary
                                            focus:ring-2
                                            focus:ring-primary/10
                                        "
                                        {...register("password")}
                                    />

                                    <button
                                        type="button"
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        onClick={() =>
                                            setShowPassword(
                                                (current) =>
                                                    !current,
                                            )
                                        }
                                        disabled={isLoading}
                                        className="
                                            absolute
                                            right-3
                                            top-1/2
                                            -translate-y-1/2
                                            rounded-md
                                            p-1.5
                                            text-slate-400
                                            transition
                                            hover:bg-slate-100
                                            hover:text-slate-700
                                            disabled:pointer-events-none
                                        "
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>

                                </div>

                                {errors.password && (
                                    <p className="text-xs font-medium text-red-600">
                                        {errors.password.message}
                                    </p>
                                )}

                            </div>


                            {/* Sign In */}

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="
                                    h-12
                                    w-full
                                    rounded-xl
                                    text-sm
                                    font-semibold
                                    shadow-sm
                                "
                            >

                                <LogIn className="mr-2 h-4 w-4" />

                                {isLoading
                                    ? "Signing in..."
                                    : "Sign In"}

                            </Button>


                            {/* Security Note */}

                            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">

                                <LockKeyhole className="h-3.5 w-3.5" />

                                <span>
                                    Authorized administrators only
                                </span>

                            </div>

                        </form>

                    </div>

                </div>

            </div>

        </div>
    )
}