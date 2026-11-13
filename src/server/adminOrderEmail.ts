import nodemailer from 'nodemailer';
import { Order, AdminSettings } from '../types';
import { getEmailTransporter, AUTHORIZED_ADMIN_EMAILS } from './adminSecurity';
import { getGoogleMapsNavigationUrl, getGoogleMapsLocationUrl } from '../lib/googleMaps';

export interface EmailDispatchResult {
  success: boolean;
  mode: 'SMTP' | 'CONFIG_REQUIRED' | 'FAILED';
  targetEmails: string[];
  messageId?: string;
  dispatchedAt: string;
  error?: string;
  previewSnippet?: string;
}

/**
 * Resolve target admin email addresses.
 * Always includes mdc37332@gmail.com and mdhussain170707@gmail.com by default.
 */
export function getAdminTargetEmails(settings?: AdminSettings): string[] {
  const emailSet = new Set<string>();

  // Primary authorized admins
  for (const email of AUTHORIZED_ADMIN_EMAILS) {
    if (email && email.includes('@')) {
      emailSet.add(email.trim().toLowerCase());
    }
  }

  // Environment variable override
  if (process.env.ADMIN_NOTIFICATION_EMAIL) {
    process.env.ADMIN_NOTIFICATION_EMAIL.split(',').forEach(e => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed.includes('@')) emailSet.add(trimmed);
    });
  }

  // Admin settings config
  if (settings?.adminNotificationEmail) {
    settings.adminNotificationEmail.split(',').forEach(e => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed.includes('@')) emailSet.add(trimmed);
    });
  }

  if (settings?.contactEmail && settings.contactEmail.includes('@')) {
    emailSet.add(settings.contactEmail.trim().toLowerCase());
  }

  const list = Array.from(emailSet);
  return list.length > 0 ? list : ['mdc37332@gmail.com', 'mdhussain170707@gmail.com'];
}

/**
 * Generates an executive, branded HTML email for the HH Mineral Water Plant Admin.
 */
export function formatOrderAdminEmailHtml(order: Order, settings?: AdminSettings, appUrl?: string): string {
  const baseUrl = appUrl || process.env.APP_URL || 'https://hhmineralwater.com';
  const adminOrderUrl = `${baseUrl}?section=admin&orderId=${encodeURIComponent(order.id)}`;

  const coords = order.deliveryCoordinates || order.customer?.deliveryCoordinates;
  const mapsUrl = coords?.lat && coords?.lng
    ? getGoogleMapsNavigationUrl(coords.lat, coords.lng)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${order.customer.address}, ${order.customer.city} ${order.customer.pincode}`
      )}`;

  const customerPhoneClean = order.customer.phone.replace(/[^0-9]/g, '');
  const customerWhatsAppUrl = `https://wa.me/91${customerPhoneClean}?text=${encodeURIComponent(
    `Hello ${order.customer.name}, regarding your HH Mineral Water Order #${order.id}...`
  )}`;

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const itemsRows = order.items
    .map((item, idx) => {
      const customBadge = item.isCustomDesign
        ? `<span style="background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px;">Custom Bottle</span>`
        : '';
      const customLabel = item.customDesignDetails?.businessName || item.customDesignDetails?.customText;
      const customSubtext = customLabel
        ? `<div style="font-size: 11px; color: #b45309; margin-top: 2px;">Label: "${customLabel}" ${item.customDesignDetails?.eventType ? `• ${item.customDesignDetails.eventType}` : ''}</div>`
        : '';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px; font-size: 13px; color: #1e293b;">
            <div style="font-weight: 600;">${idx + 1}. ${item.product.name} ${customBadge}</div>
            <div style="font-size: 12px; color: #64748b;">${item.product.size || ''} ${item.product.category ? `• ${item.product.category}` : ''}</div>
            ${customSubtext}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; text-align: center; font-weight: bold;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; text-align: right;">
            ₹${item.unitPrice.toFixed(2)}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 700;">
            ₹${(item.unitPrice * item.quantity).toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order ${order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 16px; color: #0f172a; }
    .email-wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #111827 0%, #1e293b 100%); padding: 28px 24px; text-align: center; color: #ffffff; border-bottom: 3px solid #C5A059; }
    .brand-title { font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #DFC283; margin: 0; text-transform: uppercase; }
    .header-sub { font-size: 12px; color: #94a3b8; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px; }
    .content { padding: 24px; }
    .banner { background: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
    .banner-title { font-size: 14px; font-weight: bold; color: #854d0e; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 20px 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .info-grid { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
    .table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
    .table th { background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 8px; text-align: left; font-weight: 700; }
    .totals-box { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-top: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #475569; }
    .grand-total-row { display: flex; justify-content: space-between; padding: 8px 0 0 0; margin-top: 8px; border-top: 2px dashed #cbd5e1; font-size: 17px; font-weight: 800; color: #0f172a; }
    .btn { display: inline-block; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: bold; text-decoration: none; text-align: center; margin: 4px; }
    .btn-gold { background: #C5A059; color: #000000; box-shadow: 0 2px 8px rgba(197, 160, 89, 0.4); }
    .btn-maps { background: #0284c7; color: #ffffff; }
    .btn-wa { background: #16a34a; color: #ffffff; }
    .footer { padding: 20px 24px; background: #0f172a; color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="brand-title">HH MINERAL WATER</div>
      <div class="header-sub">Official Plant & Dispatch Alert</div>
      <h2 style="margin: 14px 0 0 0; font-size: 22px; color: #ffffff;">
        🛒 New Order Received: <span style="color: #DFC283;">#${order.id}</span>
      </h2>
      <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">
        ${formattedDate} • ${order.deliveryType === 'self_pickup' ? '🏭 Self Counter Pickup' : '🚚 Doorstep Delivery (7 Km Radius)'}
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <!-- Quick Status Badge -->
      <div class="banner">
        <span class="banner-title">⚡ ACTION REQUIRED: New Order Waiting for Plant Confirmation</span>
        <span style="background: #16a34a; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">
          ${order.status.toUpperCase()}
        </span>
      </div>

      <!-- Quick Action Buttons -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${adminOrderUrl}" class="btn btn-gold" target="_blank">
          Open in Admin Portal ↗
        </a>
        <a href="${mapsUrl}" class="btn btn-maps" target="_blank">
          📍 Open in Google Maps ↗
        </a>
        <a href="${customerWhatsAppUrl}" class="btn btn-wa" target="_blank">
          💬 WhatsApp Customer
        </a>
      </div>

      <!-- Customer & Delivery Details -->
      <div class="section-title">👤 Customer & Delivery Destination</div>
      <div class="info-grid">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="width: 35%; color: #64748b; font-weight: 600;">Customer Name:</td>
            <td style="color: #0f172a; font-weight: 700;">${order.customer.name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Contact Phone:</td>
            <td>
              <a href="tel:${order.customer.phone}" style="color: #0284c7; text-decoration: none; font-weight: bold;">
                +91 ${order.customer.phone}
              </a>
            </td>
          </tr>
          ${order.customer.email ? `
          <tr>
            <td style="color: #64748b; font-weight: 600;">Customer Email:</td>
            <td><a href="mailto:${order.customer.email}" style="color: #0284c7; text-decoration: none;">${order.customer.email}</a></td>
          </tr>` : ''}
          <tr>
            <td style="color: #64748b; font-weight: 600; vertical-align: top;">Delivery Address:</td>
            <td style="color: #0f172a;">
              ${order.customer.address}, ${order.customer.city} - ${order.customer.pincode}
              ${order.customer.landmark ? `<div style="font-size: 12px; color: #64748b;">(Landmark: ${order.customer.landmark})</div>` : ''}
            </td>
          </tr>
          ${coords?.lat && coords?.lng ? `
          <tr>
            <td style="color: #64748b; font-weight: 600;">GPS Location Pin:</td>
            <td style="color: #0f172a; font-weight: 600;">
              ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}
              ${coords.gateNote ? `<div style="font-size: 11px; color: #0284c7;">"${coords.gateNote}"</div>` : ''}
            </td>
          </tr>` : ''}
          ${order.orderNotes ? `
          <tr>
            <td style="color: #64748b; font-weight: 600;">Customer Notes:</td>
            <td style="color: #b45309; font-style: italic;">"${order.orderNotes}"</td>
          </tr>` : ''}
          ${order.invoiceNumber ? `
          <tr>
            <td style="color: #64748b; font-weight: 600;">GST Tax Invoice:</td>
            <td style="color: #16a34a; font-weight: 700;">${order.invoiceNumber}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Ordered Items Table -->
      <div class="section-title">📦 Ordered Products & Quantities</div>
      <table class="table">
        <thead>
          <tr>
            <th>Item / Bottle Details</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Payment & Financial Totals -->
      <div class="section-title">💳 Payment & Bill Summary</div>
      <div class="totals-box">
        <div class="total-row">
          <span>Items Subtotal:</span>
          <span>₹${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Delivery Charge:</span>
          <span>${order.deliveryCharge === 0 ? '<strong style="color: #16a34a;">FREE (Under 7 Km)</strong>' : `₹${order.deliveryCharge.toFixed(2)}`}</span>
        </div>
        ${order.discount > 0 ? `
        <div class="total-row" style="color: #16a34a;">
          <span>Discount Applied:</span>
          <span>- ₹${order.discount.toFixed(2)}</span>
        </div>` : ''}
        <div class="total-row">
          <span>Payment Method:</span>
          <span style="font-weight: 700; color: #0f172a;">${order.paymentMethod}</span>
        </div>
        <div class="total-row">
          <span>Payment Status:</span>
          <span style="font-weight: 700; color: ${order.paymentStatus === 'Paid' ? '#16a34a' : '#ea580c'};">
            ${order.paymentStatus}
          </span>
        </div>
        <div class="grand-total-row">
          <span>Grand Total to Collect:</span>
          <span style="color: #0f172a;">₹${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="color: #DFC283; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
        HH MINERAL WATER BOTTLING PLANT
      </div>
      <div>Plot 12, Block EP & GP, Sector V, Salt Lake, Kolkata - 700091</div>
      <div>IS 14543:2004 Certified • Direct Dispatch Helpline: +91 8017341130</div>
      <div style="margin-top: 10px; color: #64748b; font-size: 10px;">
        This is an automated notification dispatched to official admin email addresses: mdc37332@gmail.com, mdhussain170707@gmail.com
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates an executive plain-text fallback for mobile devices and SMS/text previews.
 */
export function formatOrderAdminEmailText(order: Order, settings?: AdminSettings, appUrl?: string): string {
  const baseUrl = appUrl || process.env.APP_URL || 'https://hhmineralwater.com';
  const adminOrderUrl = `${baseUrl}?section=admin&orderId=${order.id}`;

  const coords = order.deliveryCoordinates || order.customer?.deliveryCoordinates;
  const mapsUrl = coords?.lat && coords?.lng
    ? getGoogleMapsNavigationUrl(coords.lat, coords.lng)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${order.customer.address}, ${order.customer.city} ${order.customer.pincode}`
      )}`;

  const itemsList = order.items
    .map((item, idx) => {
      const customNote = item.isCustomDesign ? ' [Custom Bottle]' : '';
      return `${idx + 1}. ${item.product.name}${customNote} x ${item.quantity} = ₹${(item.unitPrice * item.quantity).toFixed(2)}`;
    })
    .join('\n');

  return `
========================================
🛒 HH MINERAL WATER - NEW ORDER ALERT
========================================
Order ID: #${order.id}
Date: ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
Status: ${order.status}
Delivery Type: ${order.deliveryType === 'self_pickup' ? 'Self Counter Pickup' : 'Doorstep Delivery (Under 7 Km)'}

CUSTOMER INFORMATION:
- Name: ${order.customer.name}
- Phone: +91 ${order.customer.phone}
${order.customer.email ? `- Email: ${order.customer.email}\n` : ''}- Address: ${order.customer.address}, ${order.customer.city} - ${order.customer.pincode}
${order.customer.landmark ? `- Landmark: ${order.customer.landmark}\n` : ''}${coords ? `- GPS Coordinates: ${coords.lat}, ${coords.lng}\n` : ''}${order.orderNotes ? `- Notes: "${order.orderNotes}"\n` : ''}

ORDERED ITEMS:
${itemsList}

BILLING BREAKDOWN:
- Subtotal: ₹${order.subtotal.toFixed(2)}
- Delivery Fee: ₹${order.deliveryCharge.toFixed(2)}
- Discount: -₹${order.discount.toFixed(2)}
- GRAND TOTAL: ₹${order.totalAmount.toFixed(2)}
- Payment: ${order.paymentMethod} (${order.paymentStatus})

DIRECT LINKS:
- Admin Portal: ${adminOrderUrl}
- Google Maps Navigation: ${mapsUrl}

HH Mineral Water Bottling Plant • Salt Lake Sector V, Kolkata
Dispatched to Admin: mdc37332@gmail.com, mdhussain170707@gmail.com
========================================
  `.trim();
}

/**
 * Main dispatcher to send the full order details to the admin email ID(s).
 * Safely handles SMTP configuration or fallback logging.
 */
export async function dispatchOrderEmailToAdmin(
  order: Order,
  settings?: AdminSettings,
  appUrl?: string,
  customRecipient?: string
): Promise<EmailDispatchResult> {
  const dispatchedAt = new Date().toISOString();
  const targetEmails = customRecipient
    ? [customRecipient.trim().toLowerCase()]
    : getAdminTargetEmails(settings);

  const subject = `🛒 [New Order Alert] #${order.id} - ₹${order.totalAmount} from ${order.customer.name}`;
  const html = formatOrderAdminEmailHtml(order, settings, appUrl);
  const text = formatOrderAdminEmailText(order, settings, appUrl);

  try {
    const transporter = getEmailTransporter();

    if (!transporter) {
      // SMTP not configured yet - perform structured logging and simulated inbox preview
      console.log(`\n=======================================================`);
      console.log(`[ADMIN ORDER EMAIL NOTIFICATION]`);
      console.log(`To: ${targetEmails.join(', ')}`);
      console.log(`Subject: ${subject}`);
      console.log(`Order ID: ${order.id} | Amount: ₹${order.totalAmount} | Customer: ${order.customer.name} (+91 ${order.customer.phone})`);
      console.log(`Address: ${order.customer.address}, ${order.customer.city} ${order.customer.pincode}`);
      console.log(`Items count: ${order.items.length}`);
      console.log(`Status: SMTP_USER/SMTP_PASS not provided. Email template generated and logged.`);
      console.log(`=======================================================\n`);

      return {
        success: true,
        mode: 'CONFIG_REQUIRED',
        targetEmails,
        dispatchedAt,
        error: 'SMTP credentials not configured (Set SMTP_USER & SMTP_PASS in settings or .env to send via live mail server).',
        previewSnippet: `Order #${order.id} (${order.items.length} items, ₹${order.totalAmount}) prepared for ${targetEmails.join(', ')}`
      };
    }

    const fromAddress = process.env.SMTP_FROM || `"HH Mineral Water Orders" <${process.env.SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetEmails.join(', '),
      subject,
      text,
      html
    });

    console.log(`[ADMIN ORDER EMAIL DISPATCH SUCCESS] Order ${order.id} email dispatched to ${targetEmails.join(', ')}. Message ID: ${info.messageId}`);

    return {
      success: true,
      mode: 'SMTP',
      targetEmails,
      messageId: info.messageId,
      dispatchedAt,
      previewSnippet: `Delivered to ${targetEmails.join(', ')}`
    };
  } catch (err: any) {
    console.error(`[ADMIN ORDER EMAIL DISPATCH ERROR] Failed for order ${order.id}:`, err.message);

    return {
      success: false,
      mode: 'FAILED',
      targetEmails,
      dispatchedAt,
      error: err.message || 'SMTP delivery failure'
    };
  }
}

/**
 * Sends a test email to verify that admin emails are receiving messages properly.
 */
export async function sendAdminTestEmail(
  targetEmail?: string,
  settings?: AdminSettings
): Promise<EmailDispatchResult> {
  const dispatchedAt = new Date().toISOString();
  const targetEmails = targetEmail
    ? [targetEmail.trim().toLowerCase()]
    : getAdminTargetEmails(settings);

  const subject = `🧪 [Test Email] HH Mineral Water Admin Notification Verification`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #C5A059; margin-top: 0;">HH Mineral Water • Email Channel Verified</h2>
      <p style="font-size: 14px; color: #334155;">
        This confirms that your administrator notification email is correctly configured and receiving alerts!
      </p>
      <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; margin: 16px 0;">
        <div><strong>Recipients:</strong> ${targetEmails.join(', ')}</div>
        <div><strong>Server Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
        <div><strong>Status:</strong> Active & Ready for New Order Notifications</div>
      </div>
      <p style="font-size: 12px; color: #64748b;">
        Whenever a customer places an order, full details (customer address, Google Maps pin, bottle specifications, and payment details) will be delivered here instantly.
      </p>
    </div>
  `;

  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      return {
        success: true,
        mode: 'CONFIG_REQUIRED',
        targetEmails,
        dispatchedAt,
        error: 'SMTP credentials not configured. Configure SMTP_USER and SMTP_PASS in Settings to dispatch via live mail server.'
      };
    }

    const fromAddress = process.env.SMTP_FROM || `"HH Mineral Water Admin" <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetEmails.join(', '),
      subject,
      text: 'HH Mineral Water Admin Notification Test: Email channel is operational.',
      html
    });

    return {
      success: true,
      mode: 'SMTP',
      targetEmails,
      messageId: info.messageId,
      dispatchedAt
    };
  } catch (err: any) {
    return {
      success: false,
      mode: 'FAILED',
      targetEmails,
      dispatchedAt,
      error: err.message
    };
  }
}
