import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PrintButtonProps {
    title: string
    companyName?: string
    companyLogoUrl?: string
    companySubtitle?: string
    adviceDate?: string
    adviceReferenceNo?: string
    paymentMonths?: string
}

export default function PrintButton({
                                        title = "Payment Summary",
                                        companyName = "EMPLOYEE PAYMENT MANAGEMENT SYSTEM",
                                        companyLogoUrl = "",
                                        companySubtitle = "",
                                        adviceDate = "",
                                        adviceReferenceNo = "",
                                        paymentMonths = "",
                                    }: PrintButtonProps) {


    const handlePrint = async (): Promise<void> => {

        const isAdvice =
            title.trim().toLowerCase() === "payment advice"

        const originalTitle = document.title
        document.title = ""

        const table = document.querySelector<HTMLTableElement>(
            isAdvice
                ? "table[data-print-table='payment-advice']"
                : "table[data-print-table='payment-summary']"
        )

        if (!table) {
            alert("The required print table could not be found.")
            document.title = originalTitle
            return
        }

        const printContainer = document.createElement("div")
        printContainer.id = "payment-print-container"

        document.getElementById("payment-print-container")?.remove()
        document.getElementById("payment-print-style")?.remove()



    // COMPANY HEADER

        const header = document.createElement("div")
        header.className = "payment-print-company-header"

        const createLogo = () => {
            const slot = document.createElement("div")
            slot.className = "payment-print-logo-slot"

            if (companyLogoUrl) {
                const img = document.createElement("img")
                img.src = companyLogoUrl
                img.alt = "Company Logo"
                img.className = "payment-print-logo"
                slot.appendChild(img)
            }

            return slot
        }

        const details = document.createElement("div")
        details.className = "payment-print-company-details"

        const name = document.createElement("h2")
        name.textContent = companyName

        details.appendChild(name)

        if (companySubtitle) {
            const subtitle = document.createElement("p")
            subtitle.textContent = companySubtitle
            details.appendChild(subtitle)
        }

        header.append(
            createLogo(),
            details,
            createLogo()
        )

        printContainer.appendChild(header)


        // DOCUMENT TITLE

        const heading = document.createElement("h1")
        heading.className = "payment-print-title"

        if (isAdvice) {
            // Preserve the existing Payment Advice heading
            heading.textContent = title
        } else {
            // Payment Summary: centered title with date on the right
            const titleText = document.createElement("span")
            titleText.textContent = title

            const dateText = document.createElement("span")
            dateText.textContent = new Date()
                .toLocaleDateString("en-GB")
                .replaceAll("/", ".")

            heading.style.position = "relative"
            heading.style.width = "100%"
            heading.style.textAlign = "center"

            dateText.style.position = "absolute"
            dateText.style.right = "0"
            dateText.style.top = "50%"
            dateText.style.transform = "translateY(-50%)"
            dateText.style.fontSize = "11px"
            dateText.style.fontWeight = "400"

            heading.append(titleText, dateText)
        }

        printContainer.appendChild(heading)

        // ADVICE PARTICULARS

        if (isAdvice) {

            const particulars = document.createElement("div")
            particulars.className = "payment-print-particulars"

            const date = document.createElement("div")
            date.innerHTML = "<strong>DATE:</strong> "

            const dateValue = document.createElement("span")
            dateValue.textContent = adviceDate
            date.appendChild(dateValue)

            const reference = document.createElement("div")
            reference.innerHTML = "<strong>ADVICE NO.:</strong> "

            const referenceValue = document.createElement("span")
            referenceValue.textContent = adviceReferenceNo || "Pending"
            reference.appendChild(referenceValue)

            particulars.append(date, reference)
            printContainer.appendChild(particulars)

            if (paymentMonths) {
                const months = document.createElement("div")
                months.className = "payment-print-months"

                const label = document.createElement("strong")
                label.textContent = "PAYMENT MONTH(S): "

                months.append(
                    label,
                    document.createTextNode(paymentMonths)
                )

                printContainer.appendChild(months)
            }
        }

        // PAYMENT TABLE

        const printTable = table.cloneNode(true) as HTMLTableElement
        printTable.classList.add("payment-print-table")

        printContainer.appendChild(printTable)

        // SIGNATURES — PAYMENT ADVICE ONLY

        if (isAdvice) {

            const signatures = document.createElement("div")
            signatures.className = "payment-print-signatures"

            ;["Prepared By", "Checked By", "Authorized Signatory"]
                .forEach(label => {

                    const box = document.createElement("div")
                    box.className = "payment-print-signature"

                    const line = document.createElement("div")
                    line.className = "payment-print-signature-line"

                    const text = document.createElement("p")
                    text.textContent = label

                    box.append(line, text)
                    signatures.appendChild(box)
                })

            printContainer.appendChild(signatures)
        }

        // SUDHA WATERMARK

        const watermarkUrl =
            import.meta.env.VITE_PRINT_WATERMARK_URL || ""

        if (watermarkUrl) {
            const watermark = document.createElement("img")
            watermark.src = watermarkUrl
            watermark.alt = ""
            watermark.className = "payment-print-watermark"
            watermark.setAttribute("aria-hidden", "true")

            printContainer.appendChild(watermark)
        }

        document.body.appendChild(printContainer)

        // PRINT CSS

        const style = document.createElement("style")
        style.id = "payment-print-style"

        style.textContent = `
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
                    position: relative !important;
                    isolation: isolate !important;
                    width: 100%;
                    color: #000;
                    font-family: Arial, Helvetica, sans-serif;
                }

                .payment-print-company-header {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                    width: 100%;
                    margin-bottom: 9px;
                    padding-bottom: 7px;
                    border-bottom: 1px solid #333;
                }

                .payment-print-logo-slot {
                    width: 70px;
                    height: 65px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .payment-print-logo {
                    width: 65px;
                    height: 65px;
                    object-fit: contain;
                }

                .payment-print-company-details {
                    flex: 1;
                    text-align: center;
                }

               .payment-print-company-details h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.35;
    color: #000;
}

.payment-print-company-details p {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 600;
    color: #222;
}

               .payment-print-title {
    position: relative;
    z-index: 1;
    text-align: center;
    font-size: 19px;
    font-weight: 700;
    margin: 6px 0 9px;
    color: #000;
}

               .payment-print-particulars {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin: 4px 0 9px;
    padding: 4px 0;
    font-size: 12px;
    border: none !important;
}

                .payment-print-months {
                    position: relative;
                    z-index: 1;
                    margin: 0 0 9px;
                    font-size: 11px;
                }

               .payment-print-table {
    position: relative;
    z-index: 1;
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: auto !important;
    border: 1.5px solid #222 !important;
    font-size: 11px !important;
}

.payment-print-table th,
.payment-print-table td {
    border: 1px solid #333 !important;
    padding: 8px 9px !important;
    font-size: 11px !important;
    color: #000 !important;
    background: transparent !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
    vertical-align: middle !important;
    text-align: left !important;
}

.payment-print-table th {
    font-size: 11px !important;
    font-weight: 700 !important;
    background: #e5e5e5 !important;
    border-bottom: 1.5px solid #222 !important;
}

                .payment-print-signatures {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    justify-content: space-between;
                    gap: 30px;
                    width: 100%;
                    margin-top: 60px;
                    padding: 0 10px;
                    box-sizing: border-box;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                .payment-print-signature {
                    width: 190px;
                    text-align: center;
                }

                .payment-print-signature-line {
                    border-top: 1px solid #000;
                    margin-bottom: 7px;
                }
.payment-print-signature p {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #000;
}
                .payment-print-watermark {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 58% !important;
                    max-height: 65% !important;
                    object-fit: contain !important;
                    opacity: 0.10 !important;
                    z-index: 0 !important;
                    pointer-events: none !important;
                    print-color-adjust: exact !important;
                    -webkit-print-color-adjust: exact !important;
                }

                #payment-print-container * {
                    box-shadow: none !important;
                    text-shadow: none !important;
                }
            }

            @media screen {
                #payment-print-container {
                    display: none !important;
                }
            }
        `

        document.head.appendChild(style)

        // CLEANUP

        let cleaned = false

        const cleanup = () => {
            if (cleaned) return
            cleaned = true

            printContainer.remove()
            style.remove()
            document.title = originalTitle

            window.removeEventListener("afterprint", cleanup)
        }

        window.addEventListener("afterprint", cleanup)

        // WAIT FOR IMAGES

        const images = Array.from(
            printContainer.querySelectorAll("img")
        )

        await Promise.all(
            images.map(async img => {
                try {
                    await img.decode()
                } catch {
                    console.warn("Print image failed:", img.src)
                }
            })
        )

        window.print()
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
