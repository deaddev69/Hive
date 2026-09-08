/**
 * useInvoiceDownload
 *
 * Reliable invoice downloading engine with instant client-side PDF generation fallback.
 * Checks for pre-generated PDF in Convex storage first.
 * If not yet available, dynamically compiles the official Beelyn LLP GST tax invoice
 * via `generateInvoicePdf` and triggers instant direct browser download.
 */
import { useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useCallback, useRef } from "react";
// Type-only: erased at compile time, so it creates no runtime dependency.
//
// `generateInvoicePdf` itself is imported dynamically at each call site below
// rather than here. It pulls in pdf-lib, and a static import put that library
// into the initial bundle of every route using this hook — /orders,
// /orders/[orderId] and /order/success — for a button most shoppers never
// press. Loading it on click moves it into an on-demand chunk instead.
import type { InvoiceData } from "@/lib/pdfGenerator";

type DownloadState = "idle" | "downloading" | "success" | "error";

export function useInvoiceDownload() {
  const convex = useConvex();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, setState] = useState<DownloadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAfterDelay = useCallback((delay = 3000) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setActiveId(null);
      setState("idle");
      setErrorMessage(null);
    }, delay);
  }, []);

  /**
   * Helper to trigger a browser file download from a Blob
   */
  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  /**
   * Instant direct download from an order object (client-side generation fallback)
   */
  const downloadFromOrderData = async (order: any) => {
    if (!order) return;
    const orderNumber = order.id || order.orderNumber || "ORDER";
    setActiveId(orderNumber);
    setState("downloading");
    setErrorMessage(null);

    try {
      const invoiceData: InvoiceData = {
        invoiceNumber: `INV-${orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
        orderNumber: orderNumber,
        transactionId: order.transactionId || `TXN-${Date.now().toString().slice(-8)}`,
        customerName: order.address?.name || "Customer",
        customerPhone: order.address?.phone || "",
        billingAddress: {
          line1: order.address?.addressLine1 || "Kochi",
          line2: order.address?.addressLine2 || "",
          city: order.address?.city || "Kochi",
          state: order.address?.state || "Kerala",
          pincode: order.address?.pincode || "682024",
        },
        shippingAddress: {
          line1: order.address?.addressLine1 || "Kochi",
          line2: order.address?.addressLine2 || "",
          city: order.address?.city || "Kochi",
          state: order.address?.state || "Kerala",
          pincode: order.address?.pincode || "682024",
        },
        items: (order.items || []).map((item: any) => ({
          productId: item.productId || "",
          productName: item.name || item.productName || "Fashion Item",
          size: item.size || "Standard",
          quantity: item.quantity || 1,
          unitPrice: (item.price || 0) / 100,
          totalPrice: ((item.price || 0) * (item.quantity || 1)) / 100,
          hsnCode: "6204",
        })),
        subtotal: (order.subtotal || 0) / 100,
        deliveryFee: (order.deliveryFee || 0) / 100,
        discount: (order.discount || 0) / 100,
        tax: Math.round(((order.subtotal || 0) * 0.05)) / 100,
        totalAmount: (order.total || 0) / 100,
        paymentMethod: order.paymentMethod || "Online Prepaid",
        paymentStatus: "paid",
        generatedAt: order.createdAt ? new Date(order.createdAt).getTime() : Date.now(),
      };

      // Loaded on demand — see the import note at the top of this file. Inside
      // the existing try, so a failed chunk load surfaces through the same
      // catch as a generation failure.
      const { generateInvoicePdf } = await import("@/lib/pdfGenerator");
      const pdfBlob = await generateInvoicePdf(invoiceData);
      triggerBlobDownload(pdfBlob, `Hive_Tax_Invoice_${orderNumber}.pdf`);
      setState("success");
      resetAfterDelay();
    } catch (err) {
      console.error("Client-side invoice generation failed:", err);
      setState("error");
      setErrorMessage("Could not generate invoice. Tap to retry.");
      resetAfterDelay(5000);
    }
  };

  /**
   * Look up an invoice by Convex order ID and open its PDF or fallback to client-side generation.
   */
  const downloadInvoiceByOrderId = async (orderId: string, fallbackOrder?: any) => {
    setActiveId(orderId);
    setState("downloading");
    setErrorMessage(null);

    try {
      const invoice = await convex.query(api.invoices.getInvoiceByOrderId, {
        orderId: orderId as any,
      });

      if (invoice && invoice.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
        setState("success");
        resetAfterDelay();
        return;
      }

      // If no pre-rendered PDF URL exists in storage yet, compile client-side instantly
      if (fallbackOrder) {
        await downloadFromOrderData(fallbackOrder);
        return;
      }

      if (invoice) {
        const { generateInvoicePdf } = await import("@/lib/pdfGenerator");
        const pdfBlob = await generateInvoicePdf(invoice);
        triggerBlobDownload(pdfBlob, `Hive_Tax_Invoice_${invoice.invoiceNumber}.pdf`);
        setState("success");
        resetAfterDelay();
        return;
      }

      setState("error");
      setErrorMessage("Invoice not available yet. Tap to retry.");
      resetAfterDelay(5000);
    } catch (err) {
      console.warn("Invoice download failed, attempting fallback:", err);
      if (fallbackOrder) {
        try {
          await downloadFromOrderData(fallbackOrder);
          return;
        } catch {
          // Fall through to error state below
        }
      }
      setState("error");
      setErrorMessage("Failed to download invoice. Tap to retry.");
      resetAfterDelay(5000);
    }
  };

  return {
    downloadInvoiceByOrderId,
    downloadFromOrderData,
    isDownloading: (id: string) => activeId === id && state === "downloading",
    isSuccess: (id: string) => activeId === id && state === "success",
    isError: (id: string) => activeId === id && state === "error",
    errorMessage,
    downloadState: state,
  };
}
