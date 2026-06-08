// convex/lib/emailTemplates.ts
// Beautiful HTML email templates for the Hive marketplace order notifications.

interface EmailTemplateInput {
  orderNumber: string;
  customerName: string;
  boutiqueName: string;
  deliveryAddress: string;
  items: Array<{
    productName: string;
    size: string;
    quantity: number;
    priceAtPurchase: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes?: string;
  pdfUrl?: string;
}

const formatCurrency = (paise: number) => {
  return `₹${(paise / 100).toFixed(2)}`;
};

const baseLayout = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f9f9f9;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f9f9f9;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      background-color: #ffffff;
      margin: 0 auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #eef2f5;
    }
    .header {
      background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .logo {
      color: #f3f4f6;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .logo span {
      color: #fbbf24;
    }
    .content {
      padding: 40px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background-color: #fef3c7;
      color: #d97706;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .divider {
      height: 1px;
      background-color: #eef2f5;
      margin: 30px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 16px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .item-row {
      border-bottom: 1px solid #f3f4f6;
    }
    .item-details {
      padding: 12px 0;
    }
    .item-name {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
    }
    .item-meta {
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }
    .item-price {
      text-align: right;
      font-size: 15px;
      font-weight: 600;
      color: #111827;
      vertical-align: middle;
    }
    .totals-table {
      width: 100%;
      margin-top: 20px;
    }
    .total-row td {
      padding: 6px 0;
      font-size: 14px;
      color: #4b5563;
    }
    .grand-total td {
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      border-top: 1px solid #eef2f5;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0 10px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #fbbf24;
      color: #111827 !important;
      font-weight: 700;
      text-decoration: none;
      border-radius: 6px;
      font-size: 15px;
      box-shadow: 0 4px 6px rgba(251, 191, 36, 0.15);
      transition: background-color 0.2s;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #eef2f5;
    }
    .footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">HIVE<span>.</span></div>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p class="footer-text">© 2026 Hive Marketplace. All rights reserved.</p>
        <p class="footer-text" style="margin-top: 8px; font-size: 11px;">You are receiving this because of an order placed on Hive by TailorBee.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const getNewOrderBoutiqueTemplate = (data: EmailTemplateInput) => {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr class="item-row">
      <td class="item-details">
        <div class="item-name">${item.productName}</div>
        <div class="item-meta">Size: ${item.size} | Qty: ${item.quantity}</div>
      </td>
      <td class="item-price">${formatCurrency(item.priceAtPurchase * item.quantity)}</td>
    </tr>`
    )
    .join("");

  const bodyContent = `
    <div class="status-badge" style="background-color: #dbeafe; color: #1e40af;">New Request</div>
    <h1>New Order Received!</h1>
    <p>Hello <strong>${data.boutiqueName}</strong>,</p>
    <p>A new order <strong>${data.orderNumber}</strong> has been placed containing your product(s). Please review and prepare the items for dispatch.</p>
    
    <div class="divider"></div>
    
    <div class="section-title">Customer Details</div>
    <p style="margin-bottom: 8px;"><strong>Name:</strong> ${data.customerName}</p>
    <p style="margin-bottom: 8px;"><strong>Delivery Location:</strong><br>${data.deliveryAddress}</p>
    ${data.notes ? `<p style="margin-bottom: 8px;"><strong>Delivery Notes:</strong> ${data.notes}</p>` : ""}
    
    <div class="divider"></div>
    
    <div class="section-title">Order Summary</div>
    <table class="items-table">
      ${itemsHtml}
    </table>
    
    <table class="totals-table">
      <tr class="total-row">
        <td>Subtotal</td>
        <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
      </tr>
      <tr class="grand-total">
        <td>Potential Payout</td>
        <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
      </tr>
    </table>
    
    <div class="btn-container">
      <a href="https://hivebytailorbee.com/boutique/orders" class="btn" style="background-color: #1f2937; color: #ffffff !important;">Go to Dashboard</a>
    </div>
  `;

  return baseLayout(`New Order Request - ${data.orderNumber}`, bodyContent);
};

export const getOrderConfirmedCustomerTemplate = (data: EmailTemplateInput) => {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr class="item-row">
      <td class="item-details">
        <div class="item-name">${item.productName}</div>
        <div class="item-meta">Boutique: ${data.boutiqueName} | Size: ${item.size} | Qty: ${item.quantity}</div>
      </td>
      <td class="item-price">${formatCurrency(item.priceAtPurchase * item.quantity)}</td>
    </tr>`
    )
    .join("");

  const bodyContent = `
    <div class="status-badge" style="background-color: #d1fae5; color: #065f46;">Confirmed</div>
    <h1>Your Order is Confirmed!</h1>
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Thank you for shopping with Hive! Your order <strong>${data.orderNumber}</strong> has been accepted by our boutique partner and is now confirmed. We will notify you as soon as it is packed and ready.</p>
    
    <div class="divider"></div>
    
    <div class="section-title">Delivery Details</div>
    <p style="margin-bottom: 8px;"><strong>Delivery Address:</strong><br>${data.deliveryAddress}</p>
    ${data.notes ? `<p style="margin-bottom: 8px;"><strong>Delivery Time/Slot:</strong> ${data.notes}</p>` : ""}
    
    <div class="divider"></div>
    
    <div class="section-title">Order Items</div>
    <table class="items-table">
      ${itemsHtml}
    </table>
    
    <table class="totals-table">
      <tr class="total-row">
        <td>Subtotal</td>
        <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
      </tr>
      <tr class="total-row">
        <td>Delivery Fee</td>
        <td style="text-align: right;">${formatCurrency(data.deliveryFee)}</td>
      </tr>
      ${data.discount > 0 ? `
      <tr class="total-row" style="color: #059669;">
        <td>Discount</td>
        <td style="text-align: right;">-${formatCurrency(data.discount)}</td>
      </tr>` : ""}
      <tr class="grand-total">
        <td>Total Paid</td>
        <td style="text-align: right;">${formatCurrency(data.total)}</td>
      </tr>
    </table>
    
    ${data.pdfUrl ? `
    <div class="btn-container">
      <a href="${data.pdfUrl}" class="btn">Download Invoice</a>
    </div>` : ""}
  `;

  return baseLayout(`Order Confirmed - ${data.orderNumber}`, bodyContent);
};

export const getOrderPackedCustomerTemplate = (data: EmailTemplateInput) => {
  const bodyContent = `
    <div class="status-badge" style="background-color: #e0f2fe; color: #0369a1;">Packed</div>
    <h1>Your Order has been Packed!</h1>
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Great news! Your order <strong>${data.orderNumber}</strong> from <strong>${data.boutiqueName}</strong> has been verified, checked for exact measurements, and carefully packed.</p>
    <p>A delivery partner is currently scheduled to pick up your package. We will let you know once it is out for delivery.</p>
    
    <div class="divider"></div>
    <div class="section-title">Shipment Summary</div>
    <p style="margin-bottom: 8px;"><strong>Order ID:</strong> ${data.orderNumber}</p>
    <p style="margin-bottom: 8px;"><strong>Fulfillment Partner:</strong> ${data.boutiqueName}</p>
    <p style="margin-bottom: 8px;"><strong>Delivery Location:</strong><br>${data.deliveryAddress}</p>
  `;

  return baseLayout(`Order Packed - ${data.orderNumber}`, bodyContent);
};

export const getOrderOutForDeliveryCustomerTemplate = (data: EmailTemplateInput) => {
  const bodyContent = `
    <div class="status-badge" style="background-color: #fef3c7; color: #b45309;">In Transit</div>
    <h1>Out for Delivery!</h1>
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Your package is on its way! Our courier partner is out for delivery with your order <strong>${data.orderNumber}</strong> today.</p>
    <p>Please ensure someone is available at the delivery location to receive your order.</p>
    
    <div class="divider"></div>
    <div class="section-title">Delivery Info</div>
    <p style="margin-bottom: 8px;"><strong>Delivery Destination:</strong><br>${data.deliveryAddress}</p>
    ${data.pdfUrl ? `
    <div class="btn-container">
      <a href="${data.pdfUrl}" class="btn">View Invoice</a>
    </div>` : ""}
  `;

  return baseLayout(`Out for Delivery - ${data.orderNumber}`, bodyContent);
};

export const getOrderDeliveredCustomerTemplate = (data: EmailTemplateInput) => {
  const bodyContent = `
    <div class="status-badge" style="background-color: #d1fae5; color: #065f46;">Delivered</div>
    <h1>Delivered!</h1>
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Your Hive order <strong>${data.orderNumber}</strong> has been successfully delivered! We hope you love your new purchase.</p>
    <p>If you have any questions or concerns regarding fit or quality, please remember you have a <strong>48-hour replacement window</strong> starting now to submit a claim.</p>
    
    <div class="divider"></div>
    
    <div class="btn-container">
      <a href="https://hivebytailorbee.com/orders/${data.orderNumber}" class="btn" style="background-color: #111827; color: #ffffff !important; margin-right: 10px;">Review Order</a>
      ${data.pdfUrl ? `<a href="${data.pdfUrl}" class="btn">Invoice</a>` : ""}
    </div>
  `;

  return baseLayout(`Delivered - ${data.orderNumber}`, bodyContent);
};

export const getOrderDeliveredBoutiqueTemplate = (data: EmailTemplateInput) => {
  const bodyContent = `
    <div class="status-badge" style="background-color: #d1fae5; color: #065f46;">Success</div>
    <h1>Order Delivered Successfully!</h1>
    <p>Hello <strong>${data.boutiqueName}</strong>,</p>
    <p>Order <strong>${data.orderNumber}</strong> has been successfully delivered to customer <strong>${data.customerName}</strong>.</p>
    <p>The 48-hour claim window has now begun for the customer. Payout processing for this order will be initiated once the window expires without any disputes.</p>
    
    <div class="divider"></div>
    
    <div class="section-title">Order Overview</div>
    <p style="margin-bottom: 8px;"><strong>Order ID:</strong> ${data.orderNumber}</p>
    <p style="margin-bottom: 8px;"><strong>Subtotal Payout Amount:</strong> ${formatCurrency(data.subtotal)}</p>
    <p style="margin-bottom: 8px;"><strong>Delivered Address:</strong><br>${data.deliveryAddress}</p>
  `;

  return baseLayout(`Delivered - Order ${data.orderNumber}`, bodyContent);
};
