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
export async function generateInvoicePdf(invoice: InvoiceData, logoUrl?: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 Page Size: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Premium Brand Palette colors (Slate & Gold styling)
  const colorDark = rgb(0.12, 0.16, 0.23);       // #1E293B (Slate 800 - elegant slate dark)
  const colorAmber = rgb(0.78, 0.59, 0.33);      // #C89653 (Hive Gold/Amber)
  const colorMuted = rgb(0.28, 0.33, 0.41);      // #475569 (Slate 600 - soft secondary slate)
  const colorBorder = rgb(0.88, 0.91, 0.94);     // #E2E8F0 (Slate 200 - thin borders)
  const colorBgLight = rgb(0.98, 0.97, 0.96);    // #FAF8F5 (Ivory/Cream card fill)

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
    y: pageHeight - 6,
    width: pageWidth,
    height: 6,
    color: colorAmber,
  });

  // 2. HEADER BRANDING (LOGO / TEXT)
  let logoImage = null;
  if (logoUrl) {
    try {
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();
        logoImage = await pdfDoc.embedPng(logoBuffer);
      }
    } catch (err) {
      console.error("Failed to fetch/embed logo in PDF generator:", err);
    }
  }

  if (logoImage) {
    // scale to fit cleanly on the left (e.g. width of ~100 pt)
    const scaleFactor = 100 / logoImage.width;
    const logoDims = logoImage.scale(scaleFactor);
    const logoTopY = pageHeight - 20; // 20pt padding from the top edge
    const logoBottomY = logoTopY - logoDims.height;

    page.drawImage(logoImage, {
      x: 50,
      y: logoBottomY,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawText("BOUTIQUE PARTNER", {
      x: 50,
      y: logoBottomY - 12,
      size: 7,
      font: fontHelveticaBold,
      color: colorAmber,
    });
  } else {
    page.drawText("HIVE", {
      x: 50,
      y: pageHeight - 55,
      size: 26,
      font: fontHelveticaBold,
      color: colorDark,
    });

    page.drawText("BOUTIQUE PARTNER", {
      x: 50,
      y: pageHeight - 68,
      size: 8,
      font: fontHelveticaBold,
      color: colorAmber,
    });
  }

  // Invoice Title & Info Card (Right Aligned)
  page.drawText("TAX INVOICE", {
    x: 400,
    y: pageHeight - 60,
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
    y: pageHeight - 76,
    size: 9,
    font: fontHelveticaBold,
    color: colorDark,
  });

  page.drawText(`Date: ${formattedDate} ${formattedTime}`, {
    x: 400,
    y: pageHeight - 90,
    size: 9,
    font: fontHelvetica,
    color: colorMuted,
  });

  // Divider line
  page.drawLine({
    start: { x: 50, y: pageHeight - 105 },
    end: { x: pageWidth - 50, y: pageHeight - 105 },
    thickness: 1,
    color: colorBorder,
  });

  // 3. META DETAILS & CUSTOMER DETAILS (Wrapped in Ivory Cards)
  const detailsY = pageHeight - 120;
  const cardY = detailsY - 70;
  const cardHeight = 78;

  // Metadata Card Wrapper
  page.drawRectangle({
    x: 45,
    y: cardY,
    width: 152,
    height: cardHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
  });

  page.drawText("INVOICE METADATA", { x: 55, y: cardY + 62, size: 8, font: fontHelveticaBold, color: colorAmber });
  page.drawText(`Order ID: ${invoice.orderNumber}`, { x: 55, y: cardY + 45, size: 8, font: fontHelvetica, color: colorDark });
  page.drawText(`Txn ID: ${invoice.transactionId}`, { x: 55, y: cardY + 31, size: 8, font: fontHelvetica, color: colorDark });
  
  const isPaid = invoice.paymentStatus === "paid";
  page.drawRectangle({
    x: 55,
    y: cardY + 12,
    width: 60,
    height: 14,
    color: isPaid ? rgb(0.9, 0.96, 0.9) : rgb(0.99, 0.95, 0.9),
    borderColor: isPaid ? rgb(0.7, 0.9, 0.7) : rgb(0.96, 0.85, 0.7),
    borderWidth: 0.5,
  });
  page.drawText(invoice.paymentStatus.toUpperCase(), { 
    x: 61, 
    y: cardY + 16, 
    size: 7, 
    font: fontHelveticaBold, 
    color: isPaid ? rgb(0.12, 0.44, 0.12) : colorAmber 
  });

  // Billed To Card Wrapper
  page.drawRectangle({
    x: 207,
    y: cardY,
    width: 168,
    height: cardHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
  });

  page.drawText("BILLED TO", { x: 217, y: cardY + 62, size: 8, font: fontHelveticaBold, color: colorAmber });
  const custName = invoice.customerName.length > 25 ? invoice.customerName.substring(0, 22) + "..." : invoice.customerName;
  page.drawText(custName, { x: 217, y: cardY + 45, size: 8, font: fontHelveticaBold, color: colorDark });
  const custEmail = invoice.customerEmail.length > 30 ? invoice.customerEmail.substring(0, 27) + "..." : invoice.customerEmail;
  page.drawText(custEmail || "N/A", { x: 217, y: cardY + 31, size: 8, font: fontHelvetica, color: colorDark });
  page.drawText(invoice.customerPhone || "N/A", { x: 217, y: cardY + 17, size: 8, font: fontHelvetica, color: colorDark });

  // Shipping Address Card Wrapper
  page.drawRectangle({
    x: 385,
    y: cardY,
    width: 168,
    height: cardHeight,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
  });

  const addr = invoice.shippingAddress;
  page.drawText("SHIPPING ADDRESS", { x: 395, y: cardY + 62, size: 8, font: fontHelveticaBold, color: colorAmber });
  const addr1 = addr.line1.length > 32 ? addr.line1.substring(0, 29) + "..." : addr.line1;
  page.drawText(addr1, { x: 395, y: cardY + 45, size: 8, font: fontHelvetica, color: colorDark });
  if (addr.line2) {
    const addr2 = addr.line2.length > 32 ? addr.line2.substring(0, 29) + "..." : addr.line2;
    page.drawText(addr2, { x: 395, y: cardY + 31, size: 8, font: fontHelvetica, color: colorDark });
  }
  const addressLine3 = `${addr.city}, ${addr.state} - ${addr.pincode}`;
  const addr3 = addressLine3.length > 32 ? addressLine3.substring(0, 29) + "..." : addressLine3;
  page.drawText(addr3, { x: 395, y: cardY + (addr.line2 ? 17 : 31), size: 8, font: fontHelveticaBold, color: colorDark });

  // Divider under cards
  page.drawLine({
    start: { x: 50, y: cardY - 15 },
    end: { x: pageWidth - 50, y: cardY - 15 },
    thickness: 1,
    color: colorBorder,
  });

  // 4. ITEMS TABLE
  let currentY = cardY - 45;

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

    // Draw horizontal row divider line
    page.drawLine({
      start: { x: 50, y: currentY - 6 },
      end: { x: pageWidth - 50, y: currentY - 6 },
      thickness: 0.5,
      color: colorBorder,
    });

    currentY -= 22;
  }

  // 5. BILLING SUMMARY & GRAND TOTALS
  currentY -= 12;

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

  // Ivory box wrapper for grand total
  page.drawRectangle({
    x: summaryX - 10,
    y: currentY - 8,
    width: pageWidth - summaryX - 40 + 10,
    height: 26,
    color: colorBgLight,
    borderColor: colorBorder,
    borderWidth: 0.5,
  });

  page.drawText("Grand Total", { x: summaryX, y: currentY, size: 11, font: fontHelveticaBold, color: colorDark });
  page.drawText(`Rs. ${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: valX, y: currentY, size: 11, font: fontHelveticaBold, color: colorAmber });

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
