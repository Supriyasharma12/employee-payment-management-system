"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "cn"
import { cva, type VariantProps } from "class-variance-authority"

import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PanelLeftIcon } from "lucide-react"

/* =========================================================
   SIDEBAR CONSTANTS
   ========================================================= */

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"

/*
 * Collapsed sidebar width.
 * 4rem gives the icon rail enough horizontal space.
 */
const SIDEBAR_WIDTH_ICON = "4rem"

const SIDEBAR_KEYBOARD_SHORTCUT = "b"

/* =========================================================
   SIDEBAR CONTEXT
   ========================================================= */

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (
      open:
          | boolean
          | ((open: boolean) => boolean),
  ) => void
  openMobile: boolean
  setOpenMobile: (
      open: boolean,
  ) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext =
    React.createContext<SidebarContextProps | null>(
        null,
    )

function useSidebarContext() {
  const context =
      React.useContext(SidebarContext)

  if (!context) {
    throw new Error(
        "Sidebar components must be used inside SidebarProvider.",
    )
  }

  return context
}

/* =========================================================
   SIDEBAR PROVIDER
   ========================================================= */

function SidebarProvider({
                           defaultOpen = true,
                           open: openProp,
                           onOpenChange: setOpenProp,
                           className,
                           style,
                           children,
                           ...props
                         }: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (
      open: boolean,
  ) => void
}) {
  const isMobile = useIsMobile()

  const [openMobile, setOpenMobile] =
      React.useState(false)

  const [_open, _setOpen] =
      React.useState(defaultOpen)

  const open =
      openProp ?? _open

  const setOpen = React.useCallback(
      (
          value:
              | boolean
              | ((open: boolean) => boolean),
      ) => {
        const nextOpen =
            typeof value === "function"
                ? value(open)
                : value

        if (setOpenProp) {
          setOpenProp(nextOpen)
        } else {
          _setOpen(nextOpen)
        }

        document.cookie =
            `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [open, setOpenProp],
  )

  const toggleSidebar =
      React.useCallback(() => {
        if (isMobile) {
          setOpenMobile(
              (current) => !current,
          )
        } else {
          setOpen(
              (current) => !current,
          )
        }
      }, [
        isMobile,
        setOpen,
      ])

  /*
   * Ctrl+B / Cmd+B
   */
  React.useEffect(() => {
    const handleKeyDown = (
        event: KeyboardEvent,
    ) => {
      if (
          event.key ===
          SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey ||
              event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener(
        "keydown",
        handleKeyDown,
    )

    return () => {
      window.removeEventListener(
          "keydown",
          handleKeyDown,
      )
    }
  }, [toggleSidebar])

  const state: "expanded" | "collapsed" =
      open
          ? "expanded"
          : "collapsed"

  const contextValue =
      React.useMemo(
          () => ({
            state,
            open,
            setOpen,
            isMobile,
            openMobile,
            setOpenMobile,
            toggleSidebar,
          }),
          [
            state,
            open,
            setOpen,
            isMobile,
            openMobile,
            toggleSidebar,
          ],
      )

  return (
      <SidebarContext.Provider
          value={contextValue}
      >
        <div
            data-slot="sidebar-wrapper"
            style={
              {
                "--sidebar-width":
                SIDEBAR_WIDTH,
                "--sidebar-width-icon":
                SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
                "group/sidebar-wrapper flex min-h-svh w-full",
                className,
            )}
            {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
  )
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
                   side = "left",
                   variant = "sidebar",
                   collapsible = "offcanvas",
                   className,
                   children,
                   ...props
                 }: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?:
      | "sidebar"
      | "floating"
      | "inset"
  collapsible?:
      | "offcanvas"
      | "icon"
      | "none"
}) {
  const {
    isMobile,
    state,
    openMobile,
    setOpenMobile,
  } = useSidebarContext()

  /* -------------------------------------------------------
     NON-COLLAPSIBLE
     ------------------------------------------------------- */

  if (collapsible === "none") {
    return (
        <div
            data-slot="sidebar"
            className={cn(
                "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
                className,
            )}
            {...props}
        >
          {children}
        </div>
    )
  }

  /* -------------------------------------------------------
     MOBILE
     ------------------------------------------------------- */

  if (isMobile) {
    return (
        <Sheet
            open={openMobile}
            onOpenChange={
              setOpenMobile
            }
            {...props}
        >
          <SheetContent
              data-sidebar="sidebar"
              data-slot="sidebar"
              data-mobile="true"
              className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
              style={
                {
                  "--sidebar-width":
                  SIDEBAR_WIDTH_MOBILE,
                } as React.CSSProperties
              }
              side={side}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>
                Sidebar
              </SheetTitle>

              <SheetDescription>
                Application navigation
                sidebar.
              </SheetDescription>
            </SheetHeader>

            <div className="flex h-full w-full flex-col">
              {children}
            </div>
          </SheetContent>
        </Sheet>
    )
  }

  /* -------------------------------------------------------
     DESKTOP
     ------------------------------------------------------- */

  const isOffcanvasClosed =
      state === "collapsed" &&
      collapsible === "offcanvas"

  const positionStyle: React.CSSProperties =
      side === "left"
          ? {
            left: isOffcanvasClosed
                ? "calc(-1 * var(--sidebar-width))"
                : "0",
          }
          : {
            right: isOffcanvasClosed
                ? "calc(-1 * var(--sidebar-width))"
                : "0",
          }

  return (
      <div
          className="group peer hidden text-sidebar-foreground md:block"
          data-state={state}
          data-collapsible={
            state === "collapsed"
                ? collapsible
                : ""
          }
          data-variant={variant}
          data-side={side}
          data-slot="sidebar"
      >
        {/* ---------------------------------------------------
          Sidebar layout gap
          --------------------------------------------------- */}

        <div
            data-slot="sidebar-gap"
            className={cn(
                "relative bg-transparent transition-[width] duration-200 ease-linear",

                collapsible === "offcanvas"
                    ? "w-0"
                    : "w-(--sidebar-width)",

                state === "collapsed" &&
                collapsible === "icon" &&
                "w-(--sidebar-width-icon)",
            )}
        />

        {/* ---------------------------------------------------
          Actual sidebar
          --------------------------------------------------- */}

        <div
            data-slot="sidebar-container"
            data-side={side}
            style={positionStyle}
            className={cn(
                "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",

                state === "collapsed" &&
                collapsible === "icon" &&
                "w-(--sidebar-width-icon)",

                side === "left" &&
                "border-r",

                side === "right" &&
                "border-l",

                "border-sidebar-border",

                variant === "floating" &&
                "p-2",

                variant === "inset" &&
                "p-2",

                className,
            )}
            {...props}
        >
          <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              className={cn(
                  "flex size-full flex-col bg-sidebar",

                  variant === "floating" &&
                  "rounded-lg shadow-sm ring-1 ring-sidebar-border",

                  variant === "inset" &&
                  "rounded-lg",
              )}
          >
            {children}
          </div>
        </div>
      </div>
  )
}

/* =========================================================
   SIDEBAR TRIGGER
   ========================================================= */

function SidebarTrigger({
                          className,
                          onClick,
                          ...props
                        }: React.ComponentProps<
    typeof Button
>) {
  const {
    toggleSidebar,
  } = useSidebarContext()

  return (
      <Button
          data-sidebar="trigger"
          data-slot="sidebar-trigger"
          variant="ghost"
          size="icon-sm"
          className={cn(
              className,
          )}
          onClick={(event) => {
            onClick?.(event)
            toggleSidebar()
          }}
          {...props}
      >
        <PanelLeftIcon />

        <span className="sr-only">
        Toggle Sidebar
      </span>
      </Button>
  )
}

/* =========================================================
   SIDEBAR HEADER
   ========================================================= */

function SidebarHeader({
                         className,
                         ...props
                       }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="sidebar-header"
          data-sidebar="header"
          className={cn(
              "flex flex-col gap-2 p-2",

              /*
               * Keep collapsed brand perfectly centered.
               */
              "group-data-[collapsible=icon]:items-center",
              "group-data-[collapsible=icon]:px-0",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR FOOTER
   ========================================================= */

function SidebarFooter({
                         className,
                         ...props
                       }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="sidebar-footer"
          data-sidebar="footer"
          className={cn(
              "flex flex-col gap-2 p-2",

              /*
               * Keep SA / logout area centered.
               */
              "group-data-[collapsible=icon]:items-center",
              "group-data-[collapsible=icon]:px-0",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR CONTENT
   ========================================================= */

function SidebarContent({
                          className,
                          ...props
                        }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="sidebar-content"
          data-sidebar="content"
          className={cn(
              "flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overflow-x-hidden",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR GROUP
   ========================================================= */

function SidebarGroup({
                        className,
                        ...props
                      }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="sidebar-group"
          data-sidebar="group"
          className={cn(
              "relative flex w-full min-w-0 flex-col p-2",

              /*
               * Remove horizontal padding in collapsed mode
               * so all icons share exactly the same center line.
               */
              "group-data-[collapsible=icon]:px-0",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR GROUP LABEL
   ========================================================= */

function SidebarGroupLabel({
                             className,
                             ...props
                           }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="sidebar-group-label"
          data-sidebar="group-label"
          className={cn(
              "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70",

              /*
               * Hide section labels when collapsed.
               */
              "group-data-[collapsible=icon]:-mt-8",
              "group-data-[collapsible=icon]:opacity-0",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR GROUP CONTENT
   ========================================================= */

function SidebarGroupContent({
                               className,
                               ...props
                             }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="sidebar-group-content"
          data-sidebar="group-content"
          className={cn(
              "w-full text-sm",
              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR MENU
   ========================================================= */

function SidebarMenu({
                       className,
                       ...props
                     }: React.ComponentProps<"ul">) {
  return (
      <ul
          data-slot="sidebar-menu"
          data-sidebar="menu"
          className={cn(
              "flex w-full min-w-0 flex-col gap-0",

              /*
               * Center the entire collapsed navigation.
               */
              "group-data-[collapsible=icon]:items-center",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR MENU ITEM
   ========================================================= */

function SidebarMenuItem({
                           className,
                           ...props
                         }: React.ComponentProps<"li">) {
  return (
      <li
          data-slot="sidebar-menu-item"
          data-sidebar="menu-item"
          className={cn(
              "group/menu-item relative",

              /*
               * Every collapsed item occupies the full
               * sidebar width and centers its button.
               */
              "group-data-[collapsible=icon]:flex",
              "group-data-[collapsible=icon]:w-full",
              "group-data-[collapsible=icon]:justify-center",

              className,
          )}
          {...props}
      />
  )
}

/* =========================================================
   SIDEBAR MENU BUTTON
   ========================================================= */

const sidebarMenuButtonVariants =
    cva(
        [
          "peer/menu-button",
          "group/menu-button",
          "flex",
          "w-full",
          "items-center",
          "gap-2",
          "overflow-hidden",
          "rounded-md",
          "p-2",
          "text-left",
          "text-sm",
          "ring-sidebar-ring",
          "outline-hidden",
          "transition-[width,height,padding]",
          "hover:bg-sidebar-accent",
          "hover:text-sidebar-accent-foreground",
          "focus-visible:ring-2",
          "active:bg-sidebar-accent",
          "active:text-sidebar-accent-foreground",
          "disabled:pointer-events-none",
          "disabled:opacity-50",
          "aria-disabled:pointer-events-none",
          "aria-disabled:opacity-50",
          "data-active:bg-sidebar-accent",
          "data-active:font-medium",
          "data-active:text-sidebar-accent-foreground",
          "[&_svg]:size-4",
          "[&_svg]:shrink-0",
          "[&>span:last-child]:truncate",

          /*
           * Collapsed icon button.
           */
          "group-data-[collapsible=icon]:size-10",
          "group-data-[collapsible=icon]:shrink-0",
          "group-data-[collapsible=icon]:mx-auto",
          "group-data-[collapsible=icon]:p-2",
        ].join(" "),
        {
          variants: {
            variant: {
              default:
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",

              outline:
                  "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            },

            size: {
              default:
                  "h-8 text-sm",

              sm:
                  "h-7 text-xs",

              lg:
                  "h-12 text-sm group-data-[collapsible=icon]:p-0",
            },
          },

          defaultVariants: {
            variant: "default",
            size: "default",
          },
        },
    )

function SidebarMenuButton({
                             render,
                             isActive = false,
                             variant = "default",
                             size = "default",
                             tooltip,
                             className,
                             ...props
                           }: useRender.ComponentProps<"button"> &
    React.ComponentProps<"button"> & {
  isActive?: boolean
  tooltip?:
      | string
      | React.ComponentProps<
      typeof TooltipContent
  >
} & VariantProps<
    typeof sidebarMenuButtonVariants
>) {
  const {
    isMobile,
    state,
  } = useSidebarContext()

  const component =
      useRender({
        defaultTagName:
            "button",

        props: mergeProps<"button">(
            {
              className: cn(
                  sidebarMenuButtonVariants(
                      {
                        variant,
                        size,
                      },
                  ),
                  className,
              ),
            },
            props,
        ),

        render:
            !tooltip
                ? render
                : (
                    <TooltipTrigger
                        render={render}
                    />
                ),

        state: {
          slot:
              "sidebar-menu-button",
          sidebar:
              "menu-button",
          size,
          active: isActive,
        },
      })

  if (!tooltip) {
    return component
  }

  if (
      typeof tooltip ===
      "string"
  ) {
    tooltip = {
      children: tooltip,
    }
  }

  return (
      <Tooltip>
        {component}

        <TooltipContent
            side="right"
            align="center"
            hidden={
                state !==
                "collapsed" ||
                isMobile
            }
            className="z-50 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-md"
            {...tooltip}
        />
      </Tooltip>
  )
}

/* =========================================================
   EXPORTS
   ========================================================= */

export {
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
}