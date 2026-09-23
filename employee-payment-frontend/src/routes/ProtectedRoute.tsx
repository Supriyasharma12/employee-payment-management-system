import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

interface ProtectedRouteProps {
    children: ReactNode
}

export default function ProtectedRoute({
                                           children,
                                       }: ProtectedRouteProps) {
    const location = useLocation()

    const token = sessionStorage.getItem("authToken")

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        )
    }

    return children
}