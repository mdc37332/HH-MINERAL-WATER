/**
 * Official Meta WhatsApp Business Cloud API Integration
 * 
 * Sends automated WhatsApp messages directly to Admin WhatsApp (+91 8017341130)
 * in the background WITHOUT opening WhatsApp on the client device.
 * 
 * Uses Meta Graph API v20.0:
 * POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
 */

import type { Order, AdminSettings } from '../types.ts';

export interface WhatsAppCloudApiResult {
  success: boolean;
  messageId?: string;
  targetPhone: string;
  dispatchedAt: string;
  error?: string;
  mode: 'META_CLOUD_API' | 'CONFIG_REQUIRED';
  details?: any;
  isBlockedOrExpired?: boolean;
}

// In-memory registry for tokens that Meta has reported as blocked, expired, or invalid
const BLOCKED_TOKENS = new Map<string, { blockedAt: number; reason: string }>();

// Pre-register known blocked temporary token so it immediately falls back without throwing errors
const KNOWN_EXPIRED_TOKEN =
  'EAATZBWSmvA44BSnPCaFD2D9UKa7FRlNiXGeBpxjY9hs0vVyGFWWDnlOZBNDT6ZCiDnXpTfivEjFr4D1XfyKZB9PRYyIZCynV8yIy8nkzZArYmHK1YdFzw5WtXQV7Wtym4jMBlfZAmLBSOutHCCZACil5l5fzjF5uOwy91tGmzOZBNdIz5xFRfVHMs5W2EX4swOAZDZD';

BLOCKED_TOKENS.set(KNOWN_EXPIRED_TOKEN, {
  blockedAt: Date.now(),
  reason: 'Meta OAuthException: API access blocked (Token expired or revoked by Meta)',
});

export function markTokenBlocked(token: string, reason: string) {
  if (token && typeof token === 'string') {
    BLOCKED_TOKENS.set(token.trim(), { blockedAt: Date.now(), reason });
  }
}

export function isTokenBlocked(token?: string | null): { blocked: boolean; reason?: string } {
  if (!token) return { blocked: false };
  const entry = BLOCKED_TOKENS.get(token.trim());
  if (!entry) return { blocked: false };
  // Expire block after 15 minutes to allow re-check
  if (Date.now() - entry.blockedAt > 15 * 60 * 1000) {
    BLOCKED_TOKENS.delete(token.trim());
    return { blocked: false };
  }
  return { blocked: true, reason: entry.reason };
}

export function clearTokenBlockedStatus(token?: string) {
  if (token) {
    BLOCKED_TOKENS.delete(token.trim());
  } else {
    BLOCKED_TOKENS.clear();
  }
}

/**
 * Clean phone number to E.164 standard without '+' (e.g. 918017341130)
 */
export function normalizeWhatsAppDestination(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }
  return digits || '918017341130';
}

/**
 * Format order into a clean WhatsApp alert message
 */
export function formatOrderCloudApiMessage(order: Order, appUrl?: string): string {
  const isPickup = order.deliveryType === 'self_pickup';
  const deliveryText = isPickup
    ? '🏭 Self-Pickup at Factory Counter'
    : `🚚 Doorstep Delivery to:\n${order.customer.address || order.customer.city || 'Kolkata'}${order.customer.pincode ? ` (${order.customer.pincode})` : ''}`;

  const itemsList = order.items
    .map((item, idx) => {
      const customTag = item.isCustomDesign ? ' 🎨 [Custom]' : '';
      const name = item.product?.name || (item as any).productName || 'Mineral Water';
      const size = item.product?.size || (item as any).size || '';
      const total = item.quantity * item.unitPrice;
      return `${idx + 1}. *${name}* ${size ? `(${size})` : ''}${customTag}\n   Qty: ${item.quantity} × ₹${item.unitPrice} = ₹${total}`;
    })
    .join('\n');

  const notesSection = order.orderNotes ? `\n📝 *Order Notes:*\n${order.orderNotes}` : '';

  return `🔔 *NEW ORDER RECEIVED - HH MINERAL WATER*
━━━━━━━━━━━━━━━━━━━━━
*Order ID:* #${order.id}
*GST Invoice:* ${order.invoiceNumber || 'Generating...'}
*Date & Time:* ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👤 *Customer Details:*
• *Name:* ${order.customer.name}
• *Phone:* ${order.customer.phone}
${order.customer.email ? `• *Email:* ${order.customer.email}\n` : ''}
📍 *Fulfillment:*
${deliveryText}

💳 *Payment Information:*
• *Method:* ${order.paymentMethod}
• *Status:* ${order.paymentStatus}

📦 *Ordered Items:*
${itemsList}

💰 *Financial Summary:*
• *Subtotal:* ₹${order.subtotal}
• *Delivery Fee:* ₹${order.deliveryCharge || 0}
• *Grand Total:* ₹${order.totalAmount} (GST Included)
${notesSection}
━━━━━━━━━━━━━━━━━━━━━
⚡ *Admin Quick Action:*
${appUrl ? `${appUrl}` : 'https://ais-dev-kujqzwcdcvpj3sagd7lhbl-774561779725.asia-southeast1.run.app'}

_Automated Dispatch from HH Bottling Plant System_`;
}

/**
 * Send WhatsApp text message via Meta Graph API v20.0
 */
export async function sendMetaWhatsAppMessage(params: {
  phoneNumberId: string;
  token: string;
  recipientPhone: string;
  messageText: string;
}): Promise<{ success: boolean; messageId?: string; error?: string; raw?: any; isBlockedOrExpired?: boolean }> {
  const { phoneNumberId, token, recipientPhone, messageText } = params;
  const cleanPhone = normalizeWhatsAppDestination(recipientPhone);

  if (!token || !phoneNumberId) {
    return {
      success: false,
      error: 'Meta Phone Number ID or Access Token is missing',
    };
  }

  const tokenCheck = isTokenBlocked(token);
  if (tokenCheck.blocked) {
    return {
      success: false,
      error: tokenCheck.reason || 'Meta API access token is currently blocked or expired.',
      isBlockedOrExpired: true,
      raw: { error: { message: tokenCheck.reason, type: 'OAuthException', code: 200 } },
    };
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.messages && data.messages.length > 0) {
      return {
        success: true,
        messageId: data.messages[0].id,
        raw: data,
      };
    } else {
      const errObj = data?.error;
      const errorMsg =
        errObj?.message ||
        errObj?.error_data?.details ||
        response.statusText ||
        'Failed to send WhatsApp message via Meta Cloud API';

      const isBlocked =
        errObj?.type === 'OAuthException' ||
        errObj?.code === 190 ||
        errObj?.code === 200 ||
        (typeof errorMsg === 'string' &&
          (errorMsg.toLowerCase().includes('blocked') ||
            errorMsg.toLowerCase().includes('access token') ||
            errorMsg.toLowerCase().includes('session has expired') ||
            errorMsg.toLowerCase().includes('permissions')));

      if (isBlocked) {
        markTokenBlocked(token, `Meta API notice: ${errorMsg}`);
      }

      return {
        success: false,
        error: errorMsg,
        raw: data,
        isBlockedOrExpired: isBlocked,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error communicating with Meta Graph API',
    };
  }
}

/**
 * Dispatch automated order notification to Admin WhatsApp (8017341130)
 * Evaluates credentials from environment variables and stored admin settings.
 */
export async function dispatchOrderToAdminWhatsApp(
  order: Order,
  settings?: AdminSettings | null,
  appUrl?: string
): Promise<WhatsAppCloudApiResult> {
  const now = new Date().toISOString();

  const rawAdminPhone =
    process.env.ADMIN_WHATSAPP_NUMBER ||
    settings?.adminWhatsAppNumber ||
    settings?.ownerWhatsApp ||
    '8017341130';

  const targetPhone = normalizeWhatsAppDestination(rawAdminPhone);
  const messageText = formatOrderCloudApiMessage(order, appUrl || process.env.APP_URL);

  // 1. Check if admin has explicitly disabled Meta Cloud API automated dispatch
  if (settings && settings.whatsappCloudApiEnabled === false) {
    return {
      success: false,
      mode: 'CONFIG_REQUIRED',
      targetPhone,
      dispatchedAt: now,
      error: 'Automated Meta WhatsApp Cloud API dispatch is disabled in Admin Settings. Direct 1-Click WhatsApp links are active.',
    };
  }

  // 2. Resolve credentials with priority for admin custom settings over environment variables
  const settingsToken = (settings?.whatsappCloudApiToken || '').trim();
  const envToken = (process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();

  let token = '';
  if (settingsToken && !isTokenBlocked(settingsToken).blocked) {
    token = settingsToken;
  } else if (envToken && !isTokenBlocked(envToken).blocked) {
    token = envToken;
  } else {
    token = settingsToken || envToken;
  }

  const phoneNumberId =
    (settings?.whatsappPhoneNumberId || '').trim() ||
    (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();

  // 3. Check if credentials exist
  if (!token || !phoneNumberId) {
    return {
      success: false,
      mode: 'CONFIG_REQUIRED',
      targetPhone,
      dispatchedAt: now,
      error: 'Meta WhatsApp Cloud API credentials not configured. Direct 1-Click WhatsApp link is ready for admin.',
    };
  }

  // 4. Check if the active token is already recognized as blocked/expired
  const tokenBlockCheck = isTokenBlocked(token);
  if (tokenBlockCheck.blocked) {
    return {
      success: false,
      mode: 'CONFIG_REQUIRED',
      targetPhone,
      dispatchedAt: now,
      error: 'Meta WhatsApp Cloud API token is expired or access is blocked by Meta. Direct 1-Click WhatsApp alerts (+91 8017341130) remain operational.',
      isBlockedOrExpired: true,
    };
  }

  // 5. Dispatch to Meta Cloud API
  console.log(`[WhatsApp Cloud API] Dispatching automated WhatsApp order alert for #${order.id} to +${targetPhone}...`);
  const metaRes = await sendMetaWhatsAppMessage({
    phoneNumberId,
    token,
    recipientPhone: targetPhone,
    messageText,
  });

  if (metaRes.success) {
    console.log(`[WhatsApp Cloud API] Message dispatched successfully to +${targetPhone}! Message ID: ${metaRes.messageId}`);
    return {
      success: true,
      mode: 'META_CLOUD_API',
      messageId: metaRes.messageId,
      targetPhone,
      dispatchedAt: now,
      details: metaRes.raw,
    };
  } else {
    // Non-blocking diagnostic notice (never logs to stderr as an unhandled error)
    console.warn(`[WhatsApp Cloud API] Meta Cloud API notice:`, metaRes.error);
    return {
      success: false,
      mode: 'META_CLOUD_API',
      targetPhone,
      dispatchedAt: now,
      error: metaRes.error,
      isBlockedOrExpired: metaRes.isBlockedOrExpired,
      details: metaRes.raw,
    };
  }
}

/**
 * Send a test WhatsApp message to verify Meta Cloud API credentials
 */
export async function sendTestWhatsAppAlert(
  phoneNumberId: string,
  token: string,
  targetPhone: string
): Promise<{ success: boolean; message?: string; error?: string; raw?: any; isBlockedOrExpired?: boolean }> {
  // Clear any existing block status so user can test updated token
  clearTokenBlockedStatus(token);

  const cleanPhone = normalizeWhatsAppDestination(targetPhone);
  const testMessage = `🧪 *HH MINERAL WATER - WHATSAPP CLOUD API TEST*
━━━━━━━━━━━━━━━━━━━━━
✅ *Connection Verified Successfully!*
This confirms your Meta WhatsApp Business Cloud API is active and connected to the HH Mineral Water Bottling System.

📱 *Recipient Admin:* +${cleanPhone}
⏱️ *Timestamp:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
⚡ *Status:* Ready to receive live customer order alerts automatically in the background without opening WhatsApp!

_HH Mineral Water Automated Bottling Plant_`;

  const res = await sendMetaWhatsAppMessage({
    phoneNumberId,
    token,
    recipientPhone: cleanPhone,
    messageText: testMessage,
  });

  if (res.success) {
    return {
      success: true,
      message: `Test WhatsApp message sent successfully to +${cleanPhone}! (Message ID: ${res.messageId})`,
      raw: res.raw,
    };
  } else {
    return {
      success: false,
      error: res.isBlockedOrExpired
        ? `Meta API access is blocked or token has expired (${res.error}). Please generate a fresh access token in Meta WhatsApp Developer Console.`
        : res.error || 'Meta API returned an error',
      raw: res.raw,
      isBlockedOrExpired: res.isBlockedOrExpired,
    };
  }
}
