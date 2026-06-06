import { useConvex, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { generateInvoicePdf } from "@/lib/pdfGenerator";
import { useState } from "react";

export function useInvoiceDownload() {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.invoices.generateUploadUrl);
  const updateInvoicePdfUrl = useMutation(api.invoices.updateInvoicePdfUrl);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadInvoiceData = async (invoice: any) => {
    if (!invoice) return;

    console.log("[INVOICE_DEBUG] Download Triggered", {
      orderDocumentId: invoice.orderId,
      displayOrderNumber: invoice.orderNumber,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
    });
    
    // If PDF has already been generated and uploaded, open it in a new window/tab
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, "_blank");
      return;
    }

    // Generate PDF blob client-side
    const blob = await generateInvoicePdf(invoice);

    // Trigger instant native file download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Upload PDF to Convex storage in the background for permanent persistence
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: blob,
      });

      if (response.ok) {
        const { storageId } = await response.json();
        await updateInvoicePdfUrl({
          invoiceId: invoice._id,
          storageId,
        });
      }
    } catch (e) {
      console.warn("Failed background invoice PDF upload:", e);
    }
  };

  const downloadInvoiceByOrderId = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      const invoice = await convex.query(api.invoices.getInvoiceByOrderId, { orderId: orderId as any });
      if (!invoice) {
        alert("No invoice available for this order.");
        return;
      }
      await downloadInvoiceData(invoice);
    } catch (err) {
      console.error("Failed to download invoice:", err);
      alert("Failed to load invoice information.");
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
