import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PrintButtonProps {
    title: string
}

export default function PrintButton({
                                        title = "Payment Summary",
                                    }: PrintButtonProps) {
    const handlePrint = (): void => {
        // ---------------------------------------------------------
        // Temporarily remove browser document title
        // This prevents unwanted browser title information
        // from appearing in the print header/footer.
        // ---------------------------------------------------------

        const originalDocumentTitle = document.title
        document.title = ""

        const table = document.querySelector(
            "table",
        ) as HTMLTableElement | null

        if (!table) {
            alert("Payment records table could not be found.")

            // Restore original document title
            document.title = originalDocumentTitle

            return
        }

        // ---------------------------------------------------------
        // Create a temporary print-only container
        // ---------------------------------------------------------

        const printContainer = document.createElement("div")
        printContainer.id = "payment-print-container"

        // ---------------------------------------------------------
        // PRINT TITLE + CURRENT DATE
        // ---------------------------------------------------------

        const printTitle = document.createElement("h1")

        const currentDate = new Date().toLocaleDateString("en-GB")

        printTitle.style.display = "flex"
        printTitle.style.width = "100%"
        printTitle.style.boxSizing = "border-box"
        printTitle.style.justifyContent = "space-between"
        printTitle.style.alignItems = "center"

        const titleSpan = document.createElement("span")
        titleSpan.textContent = title

        const dateSpan = document.createElement("span")
        dateSpan.textContent = currentDate
        dateSpan.style.fontSize = "11px"
        dateSpan.style.fontWeight = "400"
        dateSpan.style.marginLeft = "auto"

        printTitle.appendChild(titleSpan)
        printTitle.appendChild(dateSpan)

        // ---------------------------------------------------------
        // Clone the current table
        // ---------------------------------------------------------

        const printTable = table.cloneNode(
            true,
        ) as HTMLTableElement

        // ---------------------------------------------------------
        // PAYMENT ADVICE PRINTING
        // ---------------------------------------------------------
        // Status is useful inside the application but should NOT
        // appear on the bank-facing Payment Advice printout.
        //
        // We remove the entire STATUS column from the cloned table
        // only. The actual screen table remains unchanged.
        // ---------------------------------------------------------

        if (
            title.trim().toLowerCase() ===
            "payment advice"
        ) {
            const headerCells =
                printTable.querySelectorAll(
                    "thead tr:first-child th",
                )

            let statusColumnIndex = -1

            headerCells.forEach(
                (header, index) => {
                    const headerText =
                        header.textContent
                            ?.trim()
                            .toLowerCase()

                    if (
                        headerText ===
                        "status"
                    ) {
                        statusColumnIndex = index
                    }
                },
            )

            if (
                statusColumnIndex !==
                -1
            ) {
                printTable
                    .querySelectorAll(
                        "tr",
                    )
                    .forEach((row) => {
                        const cells =
                            row.querySelectorAll(
                                "th, td",
                            )

                        const cell =
                            cells[
                                statusColumnIndex
                                ]

                        if (cell) {
                            cell.remove()
                        }
                    })
            }
        }

        // ---------------------------------------------------------
        // Add title and table to print container
        // ---------------------------------------------------------

        printContainer.appendChild(
            printTitle,
        )

        printContainer.appendChild(
            printTable,
        )

        document.body.appendChild(
            printContainer,
        )

        // ---------------------------------------------------------
        // PRINT-SPECIFIC STYLES
        // ---------------------------------------------------------

        const printStyle =
            document.createElement(
                "style",
            )

        printStyle.id =
            "payment-print-style"

        printStyle.textContent = `
            @media print {

                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }

                body > *:not(#payment-print-container) {
                    display: none !important;
                }

                #payment-print-container {
                    display: block !important;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #000;
                }

                #payment-print-container h1 {
                    display: flex !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin: 0 0 12px 0;
                    padding: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #000;
                }

                #payment-print-container h1 span:last-child {
                    margin-left: auto !important;
                    font-size: 11px !important;
                    font-weight: 400 !important;
                }

                #payment-print-container table {
                    display: table !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    border-collapse: collapse !important;
                    table-layout: auto !important;
                    font-size: 10px !important;
                    color: #000 !important;
                }

                #payment-print-container thead {
                    display: table-header-group !important;
                }

                #payment-print-container tbody {
                    display: table-row-group !important;
                }

                #payment-print-container tr {
                    display: table-row !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }

                #payment-print-container th,
                #payment-print-container td {
                    display: table-cell !important;
                    border: 1px solid #333 !important;
                    padding: 5px 6px !important;
                    color: #000 !important;
                    background: #fff !important;
                    white-space: nowrap !important;
                    text-align: left !important;
                }

                #payment-print-container th {
                    font-weight: 700 !important;
                    background: #f2f2f2 !important;
                }

                #payment-print-container * {
                    box-shadow: none !important;
                    text-shadow: none !important;
                }
            }

            @media screen {

                #payment-print-container {
                    display: none;
                }
            }
        `

        document.head.appendChild(
            printStyle,
        )

        // ---------------------------------------------------------
        // CLEANUP AFTER PRINTING
        // ---------------------------------------------------------

        const cleanup = () => {
            printContainer.remove()
            printStyle.remove()

            // Restore original browser document title
            document.title = originalDocumentTitle

            window.removeEventListener(
                "afterprint",
                cleanup,
            )
        }

        window.addEventListener(
            "afterprint",
            cleanup,
        )

        // Give browser time to apply print styles
        setTimeout(() => {
            window.print()
        }, 100)
    }

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
        >
            <Printer className="mr-2 h-4 w-4" />
            Print
        </Button>
    )
}