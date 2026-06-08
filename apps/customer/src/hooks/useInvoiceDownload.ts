/**
 * useInvoiceDownload
 *
 * Simplified hook — PDF generation has been moved to the server-side
 * API route /api/invoices/generate which runs automatically on order confirmation.
 *
 * This hook now only opens/downloads the pre-generated PDF.
 * If pdfUrl is not yet available (generation still in progress), it shows
 * a clear user message instead of silently failing or re-generating.
 */
import { useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";

export function useInvoiceDownload() {
  const convex = useConvex();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  /**
   * Open the pre-generated invoice PDF for a given invoice object.
   * If pdfUrl is missing (rare race condition right after order placement),
   * inform the user to try again in a moment.
   */
  const downloadInvoiceData = async (invoice: any) => {
    if (!invoice) return;

    if (invoice.pdfUrl) {
      // PDF already generated — open it directly
      window.open(invoice.pdfUrl, "_blank");
      return;
    }

    // pdfUrl not yet set — generation is in progress (triggered by order success page)
    alert(
      "Your invoice is being prepared. Please try again in a few seconds."
    );
  };

  /**
   * Look up an invoice by Convex order ID and open its PDF.
   */
  const downloadInvoiceByOrderId = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      const invoice = await convex.query(api.invoices.getInvoiceByOrderId, {
        orderId: orderId as any,
      });
      if (!invoice) {
        alert("No invoice available for this order.");
        return;
      }
      await downloadInvoiceData(invoice);
    } catch (err) {
      console.error("Failed to load invoice:", err);
      alert("Failed to load invoice. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return {
    downloadInvoiceByOrderId,
    downloadInvoiceData,
    isDownloading: (id: string) => downloadingId === id,
  };
}
