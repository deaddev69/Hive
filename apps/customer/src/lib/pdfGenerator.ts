import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InvoiceItem {
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  generatedAt: number;
}

/**
 * Generate a professional, brand-aligned invoice PDF using pdf-lib.
 * Returns a Blob ready for downloading or uploading.
 */
export async function generateInvoicePdf(invoice: InvoiceData): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 Page Size: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Brand Palette colors
  const colorDark = rgb(0.10, 0.07, 0.0);       // #1A1200 (Hive Dark)
  const colorAmber = rgb(0.91, 0.54, 0.05);     // #E8890C (Hive Amber)
  const colorMuted = rgb(0.55, 0.48, 0.35);     // #8C7A5A (Hive Text Muted)
  const colorBorder = rgb(0.94, 0.89, 0.78);    // #F0E4C8 (Hive Border)
  const colorBgLight = rgb(0.996, 0.992, 0.976); // #FFFDF5 (Hive Cream)

  // 1. Drawing standard backgrounds for panels
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(1, 1, 1), // White main sheet
  });

  // Top header stripe (Subtle Hive Brand color border)
  page.drawRectangle({
    x: 0,
    y: pageHeight - 12,
    width: pageWidth,
    height: 12,
    color: colorAmber,
  });

  // 2. HEADER BRANDING (HIVE)
  page.drawText("HIVE", {
    x: 50,
    y: pageHeight - 65,
    size: 28,
    font: fontHelveticaBold,
    color: colorDark,
  });

  page.drawText("HYPERLOCAL BOUTIQUE MARKETPLACE", {
    x: 50,
    y: pageHeight - 80,
    size: 8,
    font: fontHelveticaBold,
    color: colorMuted,
  });

  // Invoice Title & Info Card (Right Aligned)
  page.drawText("TAX INVOICE", {
    x: 400,
    y: pageHeight - 62,
    size: 20,
    font: fontHelveticaBold,
    color: colorDark,
  });

  const formattedDate = new Date(invoice.generatedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = new Date(invoice.generatedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  page.drawText(`Invoice No: ${invoice.invoiceNumber}`, {
    x: 400,
    y: pageHeight - 78,
    size: 9,
    font: fontHelveticaBold,
    color: colorDark,
  });

  page.drawText(`Date: ${formattedDate} ${formattedTime}`, {
    x: 400,
    y: pageHeight - 92,
    size: 9,
    font: fontHelvetica,
    color: colorMuted,
  });

  // Divider line
  page.drawLine({
    start: { x: 50, y: pageHeight - 110 },
    end: { x: pageWidth - 50, y: pageHeight - 110 },
    thickness: 1,
    color: colorBorder,
  });

  // 3. META DETAILS & CUSTOMER DETAILS
  const detailsY = pageHeight - 135;

  // Metadata Columns
  page.drawText("INVOICE METADATA", { x: 50, y: detailsY, size: 9, font: fontHelveticaBold, color: colorAmber });
  page.drawText(`Order ID: ${invoice.orderNumber}`, { x: 50, y: detailsY - 18, size: 9, font: fontHelvetica, color: colorDark });
  page.drawText(`Txn ID: ${invoice.transactionId}`, { x: 50, y: detailsY - 32, size: 9, font: fontHelvetica, color: colorDark });
  page.drawText(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, { x: 50, y: detailsY - 46, size: 9, font: fontHelveticaBold, color: invoice.paymentStatus === "paid" ? rgb(0.1, 0.5, 0.1) : colorAmber });

  // Customer column
  page.drawText("BILLED TO", { x: 220, y: detailsY, size: 9, font: fontHelveticaBold, color: colorAmber });
  page.drawText(invoice.customerName, { x: 220, y: detailsY - 18, size: 9, font: fontHelveticaBold, color: colorDark });
  page.drawText(invoice.customerEmail || "N/A", { x: 220, y: detailsY - 32, size: 9, font: fontHelvetica, color: colorDark });
  page.drawText(invoice.customerPhone || "N/A", { x: 220, y: detailsY - 46, size: 9, font: fontHelvetica, color: colorDark });

  // Shipping details column
  const addr = invoice.shippingAddress;
  page.drawText("SHIPPING ADDRESS", { x: 390, y: detailsY, size: 9, font: fontHelveticaBold, color: colorAmber });
  page.drawText(addr.line1, { x: 390, y: detailsY - 18, size: 9, font: fontHelvetica, color: colorDark });
  if (addr.line2) {
    page.drawText(addr.line2, { x: 390, y: detailsY - 30, size: 9, font: fontHelvetica, color: colorDark });
  }
  const addressLine3 = `${addr.city}, ${addr.state} - ${addr.pincode}`;
  page.drawText(addressLine3, { x: 390, y: detailsY - (addr.line2 ? 42 : 30), size: 9, font: fontHelveticaBold, color: colorDark });

  // Divider
  page.drawLine({
    start: { x: 50, y: pageHeight - 210 },
    end: { x: pageWidth - 50, y: pageHeight - 210 },
    thickness: 1,
    color: colorBorder,
  });

  // 4. ITEMS TABLE
  let currentY = pageHeight - 240;

  // Draw table header panel
  page.drawRectangle({
    x: 50,
    y: currentY - 5,
    width: pageWidth - 100,
    height: 22,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
  });

  // Header texts
  page.drawText("PRODUCT", { x: 60, y: currentY, size: 9, font: fontHelveticaBold, color: colorDark });
  page.drawText("SIZE", { x: 300, y: currentY, size: 9, font: fontHelveticaBold, color: colorDark });
  page.drawText("QTY", { x: 350, y: currentY, size: 9, font: fontHelveticaBold, color: colorDark });
  page.drawText("UNIT PRICE", { x: 400, y: currentY, size: 9, font: fontHelveticaBold, color: colorDark });
  page.drawText("TOTAL PRICE", { x: 485, y: currentY, size: 9, font: fontHelveticaBold, color: colorDark });

  currentY -= 28;

  // Draw each product row
  for (const item of invoice.items) {
    // Truncate long item names to fit clean single line
    const nameStr = item.productName.length > 35
      ? item.productName.substring(0, 32) + "..."
      : item.productName;

    page.drawText(nameStr, { x: 60, y: currentY, size: 9, font: fontHelvetica, color: colorDark });
    page.drawText(item.size, { x: 300, y: currentY, size: 9, font: fontHelvetica, color: colorDark });
    page.drawText(String(item.quantity), { x: 350, y: currentY, size: 9, font: fontHelvetica, color: colorDark });
    page.drawText(`Rs. ${item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 400, y: currentY, size: 9, font: fontHelvetica, color: colorDark });
    page.drawText(`Rs. ${item.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 485, y: currentY, size: 9, font: fontHelveticaBold, color: colorDark });

    currentY -= 22;
  }

  // Draw border line under table list
  page.drawLine({
    start: { x: 50, y: currentY + 10 },
    end: { x: pageWidth - 50, y: currentY + 10 },
    thickness: 0.5,
    color: colorBorder,
  });

  // 5. BILLING SUMMARY & GRAND TOTALS
  currentY -= 20;

  // Left column: Payment Info details block
  page.drawText("PAYMENT METHOD", { x: 60, y: currentY, size: 8, font: fontHelveticaBold, color: colorMuted });
  page.drawText(invoice.paymentMethod.toUpperCase(), { x: 60, y: currentY - 14, size: 10, font: fontHelveticaBold, color: colorDark });

  // Right column: Cost overview
  const summaryX = 360;
  const valX = 485;

  page.drawText("Subtotal", { x: summaryX, y: currentY, size: 9, font: fontHelvetica, color: colorMuted });
  page.drawText(`Rs. ${invoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: valX, y: currentY, size: 9, font: fontHelvetica, color: colorDark });

  currentY -= 16;
  page.drawText("Delivery Fee", { x: summaryX, y: currentY, size: 9, font: fontHelvetica, color: colorMuted });
  page.drawText(
    invoice.deliveryFee === 0 ? "FREE" : `Rs. ${invoice.deliveryFee.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    { x: valX, y: currentY, size: 9, font: fontHelvetica, color: colorDark }
  );

  currentY -= 16;
  page.drawText("Discount", { x: summaryX, y: currentY, size: 9, font: fontHelvetica, color: colorMuted });
  page.drawText(
    invoice.discount > 0 ? `-Rs. ${invoice.discount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Rs. 0.00",
    { x: valX, y: currentY, size: 9, font: fontHelvetica, color: invoice.discount > 0 ? rgb(0.1, 0.5, 0.1) : colorDark }
  );

  currentY -= 20;
  // Border line for total
  page.drawLine({
    start: { x: summaryX, y: currentY + 10 },
    end: { x: pageWidth - 50, y: currentY + 10 },
    thickness: 1,
    color: colorBorder,
  });

  page.drawText("Grand Total", { x: summaryX, y: currentY, size: 12, font: fontHelveticaBold, color: colorDark });
  page.drawText(`Rs. ${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: valX, y: currentY, size: 12, font: fontHelveticaBold, color: colorAmber });

  // 6. FOOTER INFO
  page.drawLine({
    start: { x: 50, y: 70 },
    end: { x: pageWidth - 50, y: 70 },
    thickness: 0.5,
    color: colorBorder,
  });

  page.drawText("This invoice was generated electronically.", {
    x: 50,
    y: 50,
    size: 8,
    font: fontHelvetica,
    color: colorMuted,
  });

  page.drawText("Thank you for shopping with HIVE.", {
    x: 50,
    y: 38,
    size: 8,
    font: fontHelveticaBold,
    color: colorDark,
  });

  // Save document and convert bytes to Blob
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
