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
    basePriceAtPurchase?: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  notes?: string;
  pdfUrl?: string;
  merchantPayable?: number;
  basePriceAtPurchase?: number;
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
    }    .container {
      max-width: 600px;
      background-color: #ffffff;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      border: 1px solid #eef2f5;
    }
    .header {
      background-color: #ffffff;
      padding: 24px 40px;
      text-align: center;
      border-bottom: 1px solid #f3f4f6;
    }
    .logo-img {
      height: 36px;
      width: auto;
      max-width: 150px;
      display: inline-block;
    }
    .content {
      padding: 36px 40px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      background-color: #fef3c7;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
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
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 24px 0;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .item-row td {
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .item-name {
      font-weight: 600;
      color: #111827;
    }
    .item-meta {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }
    .item-price {
      text-align: right;
      font-weight: 600;
      color: #111827;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .totals-table td {
      padding: 6px 0;
      font-size: 14px;
      color: #4b5563;
    }
    .grand-total td {
      font-size: 16px;
      font-weight: 700;
      color: #065f46;
      border-top: 2px solid #e5e7eb;
      padding-top: 12px;
    }
    .btn-container {
      text-align: center;
      margin-top: 32px;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      border-radius: 12px;
      background-color: #181614;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .footer {
      background-color: #fafafa;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer-text {
      font-size: 12px;
      color: #9ca3af;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://hivenow.in/hive-logo.png" alt="Hive Now" class="logo-img" />
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p class="footer-text">© 2026 Hive Marketplace (Beelyn LLP). All rights reserved.</p>
        <p class="footer-text" style="margin-top: 6px; font-size: 11px;">Hyperlocal Fashion Aggregator · Kochi, Kerala</p>
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
      <td class="item-details" style="padding: 12px 0;">
        <div class="item-name">${item.productName}</div>
        <div class="item-meta">Size: ${item.size} | Qty: ${item.quantity}</div>
      </td>
      <td class="item-price">${formatCurrency((item.basePriceAtPurchase ?? item.priceAtPurchase) * item.quantity)}</td>
    </tr>`
    )
    .join("");

  const serviceFeePaise = Math.round(data.subtotal * 0.02);
  const netPayoutPaise = data.merchantPayable ?? (data.subtotal - serviceFeePaise);

  const bodyContent = `
    <div class="status-badge" style="background-color: #fef3c7; color: #92400e;">New Order</div>
    <h1>New Order Received!</h1>
    <p>Hello <strong>${data.boutiqueName}</strong>,</p>
    <p>A new order <strong>${data.orderNumber}</strong> has been placed containing your product(s). Please prepare the items for express dispatch.</p>
    
    <div class="divider"></div>
    
    <div class="section-title">Delivery Destination</div>
    <p style="margin-bottom: 6px;"><strong>Customer:</strong> ${data.customerName}</p>
    <p style="margin-bottom: 6px;"><strong>Address:</strong><br>${data.deliveryAddress}</p>
    ${data.notes ? `<p style="margin-bottom: 6px;"><strong>Notes:</strong> ${data.notes}</p>` : ""}
    
    <div class="divider"></div>
    
    <div class="section-title">Order Items</div>
    <table class="items-table">
      ${itemsHtml}
    </table>
    
    <table class="totals-table">
      <tr class="total-row">
        <td>Items Base Total</td>
        <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
      </tr>
      <tr class="total-row">
        <td>Hive Service Fee (2%)</td>
        <td style="text-align: right; color: #d97706;">-${formatCurrency(serviceFeePaise)}</td>
      </tr>
      <tr class="grand-total">
        <td>Your Net Payout</td>
        <td style="text-align: right; color: #065f46;">${formatCurrency(netPayoutPaise)}</td>
      </tr>
    </table>
    
    <div class="btn-container">
      <a href="https://seller.hivenow.in/orders" class="btn" style="background-color: #181614; color: #ffffff !important;">Open Store Dashboard</a>
    </div>
  `;

  return baseLayout(`New Order Received - ${data.orderNumber}`, bodyContent);
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
      <a href="https://hivenow.in/orders/${data.orderNumber}" class="btn" style="background-color: #111827; color: #ffffff !important; margin-right: 10px;">Review Order</a>
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

export const getOrderDeclinedCustomerTemplate = (data: {
  orderNumber: string;
  customerName: string;
  items: Array<{ productName: string; size: string; quantity: number; priceAtPurchase: number; imageUrl?: string }>;
  total: number;
  refundReference?: string;
}) => {
  const firstItem = data.items[0];
  const itemTitle = firstItem ? firstItem.productName : "your ordered item";
  const itemSize = firstItem ? firstItem.size : "";
  const itemQty = firstItem ? firstItem.quantity : 1;
  const itemImg = firstItem?.imageUrl || "https://hivenow.in/icon-512x512.png";

  const bodyContent = `
    <div style="text-align: center; margin-bottom: 16px;">
      <span style="background-color: #fffbeb; border: 1px solid #fde68a; color: #b45309; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 14px; border-radius: 50px; display: inline-block;">
        ⚡ High Demand Alert & Instant Refund
      </span>
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #1c1917; text-align: center; margin: 0 0 18px 0;">
      Order Update & Refund Initiated
    </h1>

    <p style="font-size: 14px; line-height: 1.65; color: #44403c; margin: 0 0 24px 0;">
      Hi <strong>${data.customerName}</strong>,<br/><br/>
      Hive experienced high demand for <strong>${itemTitle}</strong>, and this item is currently unavailable.<br/><br/>
      Don't worry — we have initiated an <strong>instant full refund of ${formatCurrency(data.total)}</strong> back to your original payment method, which will reflect within 1 hour.
    </p>

    <div style="background-color: #faf7f2; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" cellPadding="0" cellSpacing="0" border="0" style="font-size: 13px;">
        <tr>
          <td style="color: #78716c; font-weight: 600; padding: 4px 0;">Order Number:</td>
          <td style="color: #1c1917; font-weight: 700; text-align: right; padding: 4px 0;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="color: #78716c; font-weight: 600; padding: 4px 0;">Refund Amount:</td>
          <td style="color: #b45309; font-weight: 800; font-size: 15px; text-align: right; padding: 4px 0;">${formatCurrency(data.total)}</td>
        </tr>
        ${data.refundReference ? `
        <tr>
          <td style="color: #78716c; font-weight: 600; padding: 4px 0;">Razorpay Refund Ref:</td>
          <td style="color: #44403c; font-family: monospace; text-align: right; padding: 4px 0;">${data.refundReference}</td>
        </tr>` : ""}
        <tr>
          <td style="color: #78716c; font-weight: 600; padding: 4px 0;">Expected Credit:</td>
          <td style="color: #059669; font-weight: 700; text-align: right; padding: 4px 0;">Within 1 Hour</td>
        </tr>
      </table>
    </div>

    <div style="border-top: 1px solid #e7e5e4; padding-top: 20px;">
      <table width="100%" border="0" cellPadding="0" cellSpacing="0">
        <tr>
          <td width="56" style="vertical-align: top; padding-right: 14px;">
            <img src="${itemImg}" width="52" height="52" style="border-radius: 10px; object-fit: cover; border: 1px solid #e7e5e4; display: block;"/>
          </td>
          <td style="vertical-align: top;">
            <div style="font-size: 14px; font-weight: 700; color: #1c1917;">${itemTitle}</div>
            <div style="font-size: 12px; color: #78716c; margin-top: 2px;">Size: ${itemSize} | Qty: ${itemQty}</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  return baseLayout(`Order Update - ${data.orderNumber}`, bodyContent);
};

// ─── Merchant Onboarding Templates ───────────────────────────────────────────

interface MerchantInviteInput {
  ownerName: string;
  boutiqueName: string;
  ownerEmail: string;
  claimLink: string;
}

export const getMerchantInviteTemplate = (data: MerchantInviteInput) => {
  const bodyContent = `
    <!-- Preheader text (visible in inbox preview, hidden in email body) -->
    <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">
      Your boutique ${data.boutiqueName} is ready to go live on Hive — activate in 60 seconds!
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #020617; margin-bottom: 12px;">Welcome to Hive 👋</h1>
    <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 0;">Hi ${data.ownerName || "there"},</p>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">Your merchant account for <strong>${data.boutiqueName}</strong> has been configured on Hive! Activate your store in 3 quick steps:</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 14px; color: #334155; line-height: 1.6;">
      <strong>How to Activate:</strong><br/>
      1. Click the button below to open the seller portal.<br/>
      2. Sign in with your registered boutique email: <strong style="color: #020617;">${data.ownerEmail}</strong><br/>
      3. Your store will automatically link, giving you instant access to add products and manage live orders.
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.claimLink}" style="background-color: #fbbf24; color: #020617; padding: 16px 36px; text-decoration: none; font-weight: 800; border-radius: 12px; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">Activate Storefront Portal</a>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
      <strong>Direct Portal URL:</strong> <a href="${data.claimLink}" style="color: #d97706; word-break: break-all;">${data.claimLink}</a><br/>
      📱 <em>Tip: Install the Hive Partner PWA on your mobile phone for real-time sound alerts when new orders arrive!</em>
    </p>

    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">Need help? Contact us at <a href="mailto:support@hivenow.in" style="color: #d97706;">support@hivenow.in</a></p>
    </div>
  `;

  return baseLayout(`Welcome to Hive — ${data.boutiqueName}`, bodyContent);
};

interface StaffWelcomeInput {
  boutiqueName: string;
  staffEmail: string;
  signInLink: string;
}

export const getStaffWelcomeTemplate = (data: StaffWelcomeInput) => {
  const bodyContent = `
    <!-- Preheader text -->
    <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">
      You've been added to ${data.boutiqueName} on Hive — sign in to start managing orders & products!
    </div>

    <h1 style="font-size: 22px; font-weight: 800; color: #020617; margin-bottom: 12px;">Welcome to the Team! 🛍️</h1>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello,</p>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">You have been added as a staff member for <strong>${data.boutiqueName}</strong> on the Hive Partners Portal.</p>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">You can access inventory, orders, stock, and product management by signing in with your email address (<strong>${data.staffEmail}</strong>):</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.signInLink}" style="background-color: #020617; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 700; border-radius: 12px; display: inline-block; font-size: 15px;">Activate Staff Access</a>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
      <strong>Getting Started:</strong> Visit <a href="${data.signInLink}" style="color: #d97706;">seller.hivenow.in/sign-in</a> and sign in with this email address. Your staff access will be auto-detected!
    </p>

    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">Need help? Contact us at <a href="mailto:support@hivenow.in" style="color: #d97706;">support@hivenow.in</a></p>
    </div>
  `;

  return baseLayout(`Staff Access — ${data.boutiqueName}`, bodyContent);
};

