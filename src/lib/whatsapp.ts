import { Order } from '../types';

export const OWNER_WHATSAPP_NUMBER = '8017341130'; // As explicitly instructed
export const OWNER_WHATSAPP_INTERNATIONAL = '918017341130';

/**
 * Validates and normalizes phone numbers into international format.
 * Ensures customer numbers are properly formatted for WhatsApp API delivery.
 */
export function normalizePhoneNumber(rawPhone: string): {
  isValid: boolean;
  normalized: string; // e.g. "919830012345"
  display: string; // e.g. "+91 98300 12345"
  error?: string;
  isAdminNumber: boolean;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      normalized: '',
      display: '',
      error: 'Phone number is required',
      isAdminNumber: false,
    };
  }

  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) {
    return {
      isValid: false,
      normalized: '',
      display: '',
      error: 'Please enter a valid phone number with digits',
      isAdminNumber: false,
    };
  }

  // Handle standard India numbers
  let nationalNumber = digits;
  if (digits.startsWith('91') && digits.length === 12) {
    nationalNumber = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    nationalNumber = digits.slice(1);
  }

  const isAdmin = nationalNumber === OWNER_WHATSAPP_NUMBER;

  if (nationalNumber.length !== 10) {
    // If international non-Indian, allow if 10-15 digits
    if (digits.length >= 10 && digits.length <= 15) {
      return {
        isValid: true,
        normalized: digits,
        display: `+${digits}`,
        isAdminNumber: isAdmin,
      };
    }
    return {
      isValid: false,
      normalized: digits,
      display: rawPhone,
      error: 'Please enter a valid 10-digit mobile number',
      isAdminNumber: isAdmin,
    };
  }

  const normalized = `91${nationalNumber}`;
  const display = `+91 ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`;

  return {
    isValid: true,
    normalized,
    display,
    isAdminNumber: isAdmin,
  };
}

/**
 * Formats the customer order confirmation WhatsApp message as strictly specified in Requirement 3.
 */
export function formatCustomerOrderConfirmationWhatsAppMessage(order: Order): string {
  // Format items: [PRODUCT NAME] × [QUANTITY]
  const productsListText = order.items
    .map(item => {
      if (item.isCustomDesign) {
        return `${item.product.name} (${item.product.size}) × ${item.quantity} custom bottles`;
      }
      const qtyPacks = Math.round(item.quantity / 12);
      return `${item.product.name} (${item.product.size}) × ${qtyPacks} QTY (${item.quantity} bottles)`;
    })
    .join('\n');

  // Format order date & time
  let orderTimeStr = '';
  try {
    const rawDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const d = isNaN(rawDate.getTime()) ? new Date() : rawDate;
    orderTimeStr = d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    orderTimeStr = new Date().toLocaleString('en-IN');
  }

  // Delivery or Pickup details
  const isPickup = order.deliveryType === 'self_pickup';
  const coords = order.deliveryCoordinates || order.customer.deliveryCoordinates;
  const navLine = coords
    ? `\n*GPS Navigation:* https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}${coords.gateNote ? ` (${coords.gateNote})` : ''}`
    : '';

  const deliverySection = isPickup
    ? `*Fulfillment Method:* 🏬 Self Pickup (Direct Factory Collection)
*Pickup Counter:*
${order.pickupLocation || 'Factory Dispatch Counter #1, Plot 12, Sector V, Salt Lake, Kolkata - 700091'}
*Pickup Hours:* ${order.pickupSlot || 'Mon - Sun: 8:30 AM - 8:30 PM (Ready in 30 mins)'}`
    : `*Fulfillment Method:* 🚚 Doorstep Delivery (${order.deliveryDistanceKm ? `~${order.deliveryDistanceKm} km - Under 7 km zone` : 'Under 7 km factory radius'})
*Delivery Address:*
${order.customer.address}, ${order.customer.landmark ? order.customer.landmark + ', ' : ''}${order.customer.city} - ${order.customer.pincode}${navLine}`;

  return `🧾 *HH MINERAL WATER — ORDER CONFIRMATION*

Dear *${order.customer.name}*,

Your order has been successfully received.

*Order ID:* ${order.id}

*Products:*
${productsListText}

*Total Amount:* ₹${order.totalAmount}

*Payment:* ${order.paymentMethod}

${deliverySection}

*Order Date:* ${orderTimeStr}

Your order is now being processed.

Thank you for choosing *HH MINERAL WATER*.
_Pure Hydration • High Mineral Balance • Pristine Quality_
Plant Helpline: +91 8017341130 | Kolkata & Surrounding Region`;
}

/**
 * Formats the exact order confirmation message specified in the prompt requirement.
 */
export function formatOrderWhatsAppMessage(order: Order): string {
  // Format items list
  const productsListText = order.items
    .map((item, idx) => {
      const customTag = item.isCustomDesign ? ' 🎨 [CUSTOM BRANDED LABEL]' : '';
      const totalItemPrice = item.unitPrice * item.quantity;
      const qtyDesc = item.isCustomDesign
        ? `${item.quantity} custom bottles`
        : `${Math.round(item.quantity / 12)} QTY (${item.quantity} bottles)`;
      return `${idx + 1}. *${item.product.name}* (${item.product.size})${customTag}\n   • Qty: *${qtyDesc}* (₹${item.unitPrice}/bottle) = *₹${totalItemPrice}*`;
    })
    .join('\n');

  // Custom Design flag & details
  const customDesignFlag = order.isCustomOrder ? 'YES (Custom Branded Label)' : 'NO (Standard HH Water)';
  const originalImageFlag = order.hasOriginalImage ? 'UPLOADED (High-Resolution File Attached)' : 'NOT UPLOADED';

  // Special instructions aggregation
  const specialInstructionsList: string[] = [];
  if (order.orderNotes) {
    specialInstructionsList.push(order.orderNotes);
  }
  order.items.forEach(item => {
    if (item.customDesignDetails) {
      const d = item.customDesignDetails;
      if (d.businessName) specialInstructionsList.push(`Branding: "${d.businessName}"`);
      if (d.eventType) specialInstructionsList.push(`Event: ${d.eventType}`);
      if (d.finishType) specialInstructionsList.push(`Finish: ${d.finishType}`);
      if (d.specialInstructions) specialInstructionsList.push(`Note: ${d.specialInstructions}`);
    }
  });

  const specialInstructionsText =
    specialInstructionsList.length > 0 ? specialInstructionsList.join(' | ') : 'None';

  // Format creation time
  let orderTimeStr = '';
  try {
    const rawDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const d = isNaN(rawDate.getTime()) ? new Date() : rawDate;
    orderTimeStr = d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    orderTimeStr = new Date().toLocaleString('en-IN');
  }

  // Fulfillment details
  const isPickup = order.deliveryType === 'self_pickup';
  const customerAddress = [
    order.customer.address,
    order.customer.landmark ? `(Landmark: ${order.customer.landmark})` : '',
    order.customer.city,
    order.customer.pincode
  ].filter(Boolean).join(', ');

  const coords = order.deliveryCoordinates || order.customer.deliveryCoordinates;
  const gpsSection = coords
    ? `\n🗺️ *CUSTOMER GPS NAVIGATION (GOOGLE MAPS):*
• *Turn-by-Turn Route:* https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}
• *Pinned Coordinates:* ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}${coords.gateNote ? `\n• *Delivery / Entrance Note:* ${coords.gateNote}` : ''}`
    : '';

  const fulfillmentText = isPickup
    ? `🏬 *FULFILLMENT:* SELF PICKUP AT FACTORY
• *Pickup Counter:* ${order.pickupLocation || 'Factory Dispatch Counter #1, Plot 12, Sector V, Salt Lake, Kolkata'}
• *Ready Window:* ${order.pickupSlot || 'Ready in 30 mins (Mon-Sun 8:30 AM - 8:30 PM)'}`
    : `🚚 *FULFILLMENT:* DOORSTEP DELIVERY (${order.deliveryDistanceKm ? `~${order.deliveryDistanceKm} km - Under 7 km zone` : 'Under 7 km local radius'})
• *Delivery Address:* ${customerAddress}${gpsSection}`;

  return `🛒 *NEW ORDER RECEIVED — HH MINERAL WATER*

📦 *Order ID:* ${order.id}
🧾 *Invoice No:* ${order.invoiceNumber || 'HH/2026/' + order.id.replace(/\D/g, '').slice(-6).padStart(6, '0')}
⏰ *Order Time:* ${orderTimeStr}

👤 *CUSTOMER DETAILS:*
• *Name:* ${order.customer.name}
• *Phone:* ${order.customer.phone}
${order.customer.email ? `• *Email:* ${order.customer.email}\n` : ''}📍 ${fulfillmentText}

🛍️ *ORDERED PRODUCTS:*
${productsListText}

💰 *PAYMENT & BILLING:*
• *Subtotal:* ₹${order.subtotal}
• *Delivery Charge:* ${order.deliveryCharge === 0 ? 'FREE (Self Pickup / Zero Charge)' : `₹${order.deliveryCharge}`}
• *Grand Total:* *₹${order.totalAmount}*
• *Payment Method:* ${order.paymentMethod}
• *Payment Status:* ${order.paymentStatus}

🎨 *CUSTOMIZATION & NOTES:*
• *Custom Design:* ${customDesignFlag}
• *Artwork Files:* ${originalImageFlag}
• *Special Instructions:* ${specialInstructionsText}

📄 *GST Tax Invoice:* Generated & recorded in HH Admin Portal.
🏭 *HH MINERAL WATER BOTTLING & PACKAGING*
Owner Phone: +91 8017341130 | Kolkata, West Bengal`;
}

/**
 * Formats a dedicated delivery dispatch & Google Maps navigation message for the driver.
 * Contains direct 1-tap Google Maps turn-by-turn navigation URL for customer location.
 */
export function formatDriverDeliveryNavigationMessage(order: Order, driverName?: string): string {
  const coords = order.deliveryCoordinates || order.customer.deliveryCoordinates;
  const addressQuery = [order.customer.address, order.customer.landmark, order.customer.city, order.customer.pincode]
    .filter(Boolean)
    .join(', ');

  const googleMapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressQuery)}`;

  const itemsList = order.items
    .map(i => {
      const packCount = Math.round(i.quantity / 12);
      return `• ${i.product.name} (${i.product.size}) × ${packCount > 0 ? `${packCount} packs (` : ''}${i.quantity} bottles${packCount > 0 ? ')' : ''}`;
    })
    .join('\n');

  const paymentCollectionInstruction = order.paymentStatus === 'Paid'
    ? '✅ *ALREADY PAID ONLINE — DO NOT COLLECT CASH*'
    : `💵 *COLLECT CASH ON DELIVERY: ₹${order.totalAmount}*`;

  return `🚰 *HH MINERAL WATER — DRIVER DISPATCH & LIVE NAVIGATION*
${driverName ? `*Assigned Driver:* ${driverName}\n` : ''}
📦 *Order ID:* ${order.id}
🧾 *Invoice:* ${order.invoiceNumber || 'Attached'}
👤 *Customer:* ${order.customer.name}
📞 *Call Customer:* ${order.customer.phone}

🗺️ *GOOGLE MAPS TURN-BY-TURN NAVIGATION:*
👉 ${googleMapsUrl}
${coords ? `📍 *GPS Coordinates:* ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : ''}
${coords?.gateNote ? `🚪 *Delivery / Landmark Note:* ${coords.gateNote}` : ''}

📍 *Delivery Address:*
${order.customer.address}
${order.customer.landmark ? `Landmark: ${order.customer.landmark}\n` : ''}${order.customer.city} - ${order.customer.pincode}

🛍️ *Bottles / Crates to Deliver:*
${itemsList}

💰 *Payment Collection:*
${paymentCollectionInstruction}
• *Method:* ${order.paymentMethod}

⚠️ *Driver Instructions:*
1. Click the Google Maps link above for live turn-by-turn navigation directly to the customer's address.
2. Verify bottle seals and print/share invoice upon delivery.
3. Call customer if entry access is restricted.

🏭 *Plant Dispatch:* +91 8017341130`;
}

/**
 * Creates a WhatsApp share URL specifically targeted to a delivery driver.
 */
export function getDriverWhatsAppShareUrl(order: Order, driverPhone: string, driverName?: string): string {
  const message = formatDriverDeliveryNavigationMessage(order, driverName);
  const encoded = encodeURIComponent(message);
  const cleanPhone = driverPhone.replace(/\D/g, '');
  const target = cleanPhone.startsWith('91') && cleanPhone.length === 12
    ? cleanPhone
    : cleanPhone.length === 10
    ? `91${cleanPhone}`
    : cleanPhone;

  return target ? `https://wa.me/${target}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Formats a message for sharing the GST Tax Invoice directly via WhatsApp.
 */
export function formatInvoiceWhatsAppShareMessage(order: Order, invoiceNumber: string, grandTotal: number): string {
  return `🧾 *HH MINERAL WATER — TAX INVOICE*

Dear *${order.customer.name}*,
Thank you for ordering with *HH MINERAL WATER*.

*Invoice Details:*
• *Invoice No:* ${invoiceNumber}
• *Order ID:* ${order.id}
• *Total Amount:* ₹${grandTotal}
• *Payment:* ${order.paymentMethod}
• *Delivery to:* ${order.customer.address}, ${order.customer.city} - ${order.customer.pincode}

Your official GST Tax Invoice is available in your HH Mineral Water customer portal.

_Pure Hydration • High Mineral Balance • Pristine Quality_
*HH MINERAL WATER BOTTLING & PACKAGING*`;
}

/**
 * Creates a WhatsApp share link for customer invoice.
 */
export function getInvoiceShareWhatsAppUrl(order: Order, invoiceNumber: string, grandTotal: number, customerPhone?: string): string {
  const message = formatInvoiceWhatsAppShareMessage(order, invoiceNumber, grandTotal);
  const encoded = encodeURIComponent(message);
  const target = customerPhone ? (customerPhone.startsWith('91') ? customerPhone : `91${customerPhone.replace(/\D/g, '')}`) : '';
  return target ? `https://wa.me/${target}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Creates the direct WhatsApp URL for sending the order details to the owner (8017341130).
 */
export function getWhatsAppDirectUrl(order: Order, phone = OWNER_WHATSAPP_INTERNATIONAL): string {
  const message = formatOrderWhatsAppMessage(order);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Creates a generic WhatsApp chat link for customer support.
 */
export function getCustomerSupportWhatsAppUrl(phone = OWNER_WHATSAPP_INTERNATIONAL): string {
  const message = encodeURIComponent(
    'Hello HH MINERAL WATER team! I would like to inquire about mineral water orders & custom design labels.'
  );
  return `https://wa.me/${phone}?text=${message}`;
}
