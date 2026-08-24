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
Customer Name: ${order.customer.name}
Customer Phone: ${order.customer.phone}
Delivery Address: ${fullAddress}

Products:
${productsListText}

Custom Design: ${customDesignFlag}
Original Image: ${originalImageFlag}
Special Instructions: ${specialInstructionsText}

Total Amount: ₹${order.totalAmount}
Payment Method: ${order.paymentMethod}
Order Time: ${orderTimeStr}

Please check the HH OWNER APP for complete order details.`;
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
