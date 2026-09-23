import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom"

import Login from "@/pages/Login"
import Employees from "@/pages/Employees"
import Payments from "@/pages/Payments"
import PaymentSummary from "@/pages/PaymentSummary"
import PaymentAdvice from "@/pages/PaymentAdvice"
import PaymentPeriods from "@/pages/PaymentPeriods"
import AdminManagement from "@/pages/AdminManagement"
import AuditLogs from "@/pages/AuditLogs"

import ProtectedRoute from "@/routes/ProtectedRoute"
import AppLayout from "@/layouts/AppLayout"

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* Protected Application */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Navigate
                                    to="/employees"
                                    replace
                                />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/employees"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Employees />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/payments"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Payments />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/payment-summary"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <PaymentSummary />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/payment-advice"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <PaymentAdvice />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/payment-periods"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <PaymentPeriods />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admins"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <AdminManagement />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/audit-logs"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <AuditLogs />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Unknown routes */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>
        </BrowserRouter>
    )
}

export default App