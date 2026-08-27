import { Order } from '../types';

export const OWNER_WHATSAPP_NUMBER = '8017341130'; // As explicitly instructed
export const OWNER_WHATSAPP_INTERNATIONAL = '918017341130';

/**
 * Formats the exact order confirmation message specified in the prompt requirement.
 */
export function formatOrderWhatsAppMessage(order: Order): string {
  // Format items list
  const productsListText = order.items
    .map(item => {
      const customTag = item.isCustomDesign ? ' [CUSTOM DESIGN]' : '';
      const totalItemPrice = item.unitPrice * item.quantity;
      return `${item.product.name} (${item.product.size})${customTag} × ${item.quantity} — ₹${totalItemPrice}`;
    })
    .join('\n');

  // Custom Design flag
  const customDesignFlag = order.isCustomOrder ? 'YES' : 'NO';

  // Original Image flag
  const originalImageFlag = order.hasOriginalImage ? 'UPLOADED' : 'NOT UPLOADED';

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
    const d = new Date(order.createdAt);
    orderTimeStr = d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    orderTimeStr = new Date().toLocaleString();
  }

  // Full address
  const fullAddress = `${order.customer.address}, ${order.customer.landmark ? order.customer.landmark + ', ' : ''}${order.customer.city} - ${order.customer.pincode}`;

  return `🛒 NEW HH MINERAL WATER ORDER

Order ID: ${order.id}
Invoice No: ${order.invoiceNumber || 'HH/2026/' + order.id.replace(/\D/g, '').slice(-6).padStart(6, '0')}
Customer Name: ${order.customer.name}
Customer Phone: ${order.customer.phone}
Delivery Address: ${fullAddress}

Products:
${productsListText}

Custom Design: ${customDesignFlag}
Original Image: ${originalImageFlag}
Special Instructions: ${specialInstructionsText}

Taxable Value + GST: Included
Total Amount: ₹${order.totalAmount}
Payment Method: ${order.paymentMethod}
Order Time: ${orderTimeStr}

📄 Official GST Tax Invoice has been generated automatically and is available for viewing/download.
Please check the HH OWNER APP for complete order details.`;
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
