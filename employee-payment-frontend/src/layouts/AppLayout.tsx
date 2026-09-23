import type { ReactNode } from "react"
import {
    Building2,
    Calculator,
    ChevronRight,
    FileText,
    Landmark,
    LogOut,
    Menu,
    ScrollText,
    ShieldCheck,
    Users,
    CalendarDays,
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"

interface AppLayoutProps {
    children: ReactNode
}

const mainNavigationItems = [
    {
        title: "Employee Master",
        url: "/employees",
        icon: Users,
    },
    {
        title: "Payment Entry",
        url: "/payments",
        icon: Calculator,
    },
    {
        title: "Payment Summary",
        url: "/payment-summary",
        icon: FileText,
    },
    {
        title: "Payment Advice",
        url: "/payment-advice",
        icon: Landmark,
    },
    {
        title: "Payment Periods",
        url: "/payment-periods",
        icon: CalendarDays,
    },
]

const administrationItems = [
    {
        title: "Admin Management",
        url: "/admins",
        icon: ShieldCheck,
    },
    {
        title: "Audit Logs",
        url: "/audit-logs",
        icon: ScrollText,
    },
]

export default function AppLayout({
                                      children,
                                  }: AppLayoutProps) {
    const location = useLocation()

    const adminName =
        sessionStorage.getItem("adminName") ||
        "Administrator"

    const adminRole =
        sessionStorage.getItem("adminRole") ||
        "ADMIN"

    const currentItem = [
        ...mainNavigationItems,
        ...administrationItems,
    ].find((item) => location.pathname === item.url)

    const currentPageTitle =
        currentItem?.title ||
        "Employee Payment Management System"

    const handleLogout = () => {
        sessionStorage.clear()
        window.location.href = "/login"
    }

    const getInitials = (name: string) => {
        const words = name.trim().split(/\s+/)

        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase()
        }

        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase()
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-slate-50">

                {/* =====================================================
                    SIDEBAR
                   ===================================================== */}

                <Sidebar
                    variant="sidebar"
                    collapsible="icon"
                    className="border-r border-slate-200 bg-white"
                >

                    {/* Brand */}
                    <SidebarHeader className="border-b border-slate-100">
                        <div className="flex items-center gap-3 px-3 py-4">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Building2 className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                                <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                                    Employee Payment
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                    Management System
                                </p>
                            </div>

                        </div>
                    </SidebarHeader>

                    {/* Navigation */}
                    <SidebarContent className="px-2 py-4">

                        {/* Main modules */}
                        <SidebarGroup>
                            <SidebarGroupLabel className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
                                Main Modules
                            </SidebarGroupLabel>

                            <SidebarGroupContent>
                                <SidebarMenu>

                                    {mainNavigationItems.map((item) => (
                                        <SidebarMenuItem
                                            key={item.url}
                                        >
                                            <NavLink
                                                to={item.url}
                                                className="block"
                                            >
                                                {({ isActive }) => (
                                                    <SidebarMenuButton
                                                        isActive={isActive}
                                                        tooltip={item.title}
                                                        className={`
                                                            h-10 rounded-lg px-3
                                                            transition-all duration-150
                                                            ${
                                                            isActive
                                                                ? "bg-primary/10 text-primary font-semibold shadow-sm hover:bg-primary/15"
                                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                        }
                                                        `}
                                                    >
                                                        <item.icon
                                                            className={`
                                                                h-[18px] w-[18px]
                                                                ${
                                                                isActive
                                                                    ? "text-primary"
                                                                    : "text-slate-500"
                                                            }
                                                            `}
                                                        />

                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </SidebarMenuButton>
                                                )}
                                            </NavLink>
                                        </SidebarMenuItem>
                                    ))}

                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {/* Administration */}
                        <SidebarGroup className="mt-6">
                            <SidebarGroupLabel className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
                                Administration
                            </SidebarGroupLabel>

                            <SidebarGroupContent>
                                <SidebarMenu>

                                    {administrationItems.map((item) => (
                                        <SidebarMenuItem
                                            key={item.url}
                                        >
                                            <NavLink
                                                to={item.url}
                                                className="block"
                                            >
                                                {({ isActive }) => (
                                                    <SidebarMenuButton
                                                        isActive={isActive}
                                                        tooltip={item.title}
                                                        className={`
                                                            h-10 rounded-lg px-3
                                                            transition-all duration-150
                                                            ${
                                                            isActive
                                                                ? "bg-primary/10 text-primary font-semibold shadow-sm hover:bg-primary/15"
                                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                        }
                                                        `}
                                                    >
                                                        <item.icon
                                                            className={`
                                                                h-[18px] w-[18px]
                                                                ${
                                                                isActive
                                                                    ? "text-primary"
                                                                    : "text-slate-500"
                                                            }
                                                            `}
                                                        />

                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </SidebarMenuButton>
                                                )}
                                            </NavLink>
                                        </SidebarMenuItem>
                                    ))}

                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                    </SidebarContent>

                    {/* =================================================
                        ADMINISTRATOR AREA
                       ================================================= */}

                    <SidebarFooter className="border-t border-slate-100 p-2">

                        <div className="rounded-xl bg-slate-50 p-2">

                            <div className="flex items-center gap-3 px-2 py-2">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {getInitials(adminName)}
                                </div>

                                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                                    <p className="truncate text-sm font-semibold text-slate-800">
                                        {adminName}
                                    </p>

                                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                        {adminRole}
                                    </p>
                                </div>

                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                className="mt-1 h-9 w-full justify-start rounded-lg px-2 text-slate-600 hover:bg-white hover:text-slate-900 group-data-[collapsible=icon]:justify-center"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />

                                <span className="ml-2 group-data-[collapsible=icon]:hidden">
                                    Logout
                                </span>
                            </Button>

                        </div>

                    </SidebarFooter>

                </Sidebar>

                {/* =====================================================
                    MAIN APPLICATION AREA
                   ===================================================== */}

                <div className="flex min-w-0 flex-1 flex-col">

                    {/* Top Header */}
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">

                        <div className="flex min-w-0 items-center gap-3">

                            <SidebarTrigger
                                className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                            >
                                <Menu className="h-4 w-4" />
                            </SidebarTrigger>

                            <div className="hidden h-6 w-px bg-slate-200 sm:block" />

                            <div className="min-w-0">

                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <span className="hidden sm:inline">
                                        Administration Portal
                                    </span>

                                    <ChevronRight className="hidden h-3 w-3 sm:inline" />

                                    <span className="truncate text-slate-600">
                                        {currentPageTitle}
                                    </span>
                                </div>

                                <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                                    {currentPageTitle}
                                </h1>

                            </div>

                        </div>

                        {/* Header administrator */}
                        <div className="flex items-center gap-3">

                            <div className="hidden text-right md:block">
                                <p className="text-sm font-medium text-slate-800">
                                    {adminName}
                                </p>

                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                    {adminRole}
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {getInitials(adminName)}
                            </div>

                        </div>

                    </header>

                    {/* Page Content */}
                    <main className="min-h-[calc(100vh-4rem)] flex-1 bg-slate-50 p-4 md:p-6 lg:p-7">

                        <div className="mx-auto w-full max-w-[1600px] animate-fade-in">
                            {children}
                        </div>

                    </main>

                </div>

            </div>
        </SidebarProvider>
    )
}