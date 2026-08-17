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
import { useState } from "react";
import { generateInvoicePdf, InvoiceData } from "@/lib/pdfGenerator";

export function useInvoiceDownload() {
  const convex = useConvex();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    setDownloadingId(orderNumber);

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

      const pdfBlob = await generateInvoicePdf(invoiceData);
      triggerBlobDownload(pdfBlob, `Hive_Tax_Invoice_${orderNumber}.pdf`);
    } catch (err) {
      console.error("Client-side invoice generation failed:", err);
      alert("Could not generate invoice at this time. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  /**
   * Look up an invoice by Convex order ID and open its PDF or fallback to client-side generation.
   */
  const downloadInvoiceByOrderId = async (orderId: string, fallbackOrder?: any) => {
    setDownloadingId(orderId);
    try {
      const invoice = await convex.query(api.invoices.getInvoiceByOrderId, {
        orderId: orderId as any,
      });

      if (invoice && invoice.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
        return;
      }

      // If no pre-rendered PDF URL exists in storage yet, compile client-side instantly
      if (fallbackOrder) {
        await downloadFromOrderData(fallbackOrder);
        return;
      }

      if (invoice) {
        const pdfBlob = await generateInvoicePdf(invoice);
        triggerBlobDownload(pdfBlob, `Hive_Tax_Invoice_${invoice.invoiceNumber}.pdf`);
        return;
      }

      alert("No invoice available for this order yet.");
    } catch (err) {
      console.warn("Convex invoice lookup failed, attempting fallback generation:", err);
      if (fallbackOrder) {
        await downloadFromOrderData(fallbackOrder);
      } else {
        alert("Failed to load invoice. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return {
    downloadInvoiceByOrderId,
    downloadFromOrderData,
    isDownloading: (id: string) => downloadingId === id,
  };
}
