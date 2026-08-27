import { Order, AdminSettings, Invoice, InvoiceItem } from '../types';
import { numberToIndianRupees } from './numberToWords';

/**
 * Deterministically generates an official GST Tax Invoice from an Order and AdminSettings.
 */
export function generateGstInvoice(
  order: Order,
  settings: AdminSettings,
  sequenceNumber?: number | string
): Invoice {
  const invoicePrefix = settings.invoicePrefix || 'HH/2026/';
  
  // Format sequential invoice number, e.g. HH/2026/000042
  let invoiceNumber: string;
  if (sequenceNumber) {
    const padded = String(sequenceNumber).padStart(6, '0');
    invoiceNumber = `${invoicePrefix}${padded}`;
  } else if (order.invoiceNumber) {
    invoiceNumber = order.invoiceNumber;
  } else {
    // Extract numerical seed from Order ID (e.g. HH-ORD-74921 -> 074921)
    const numericPart = order.id.replace(/\D/g, '').slice(-6).padStart(6, '0');
    invoiceNumber = `${invoicePrefix}${numericPart}`;
  }

  const defaultGstRate = settings.defaultGstRate ?? 18;
  const isGstInclusive = settings.pricesIncludeGst ?? true;
  const companyStateCode = settings.stateCode || '19';
  const companyState = settings.state || 'West Bengal';

  // Determine Customer State
  let customerState = companyState;
  let customerStateCode = companyStateCode;

  const isIntraState = true; // Most local water deliveries are intra-state (CGST + SGST)

  let totalTaxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalGrossItems = 0;

  const items: InvoiceItem[] = order.items.map((cartItem) => {
    const qty = Math.max(1, cartItem.quantity);
    const unitPrice = cartItem.unitPrice;
    const grossItemTotal = qty * unitPrice;
    const itemDiscount = 0;
    const itemGstRate = defaultGstRate;

    let taxableValue: number;
    let lineGstAmount: number;
    let lineTotal: number;

    if (isGstInclusive) {
      // MRP inclusive of GST: Taxable Value = Gross / (1 + Rate/100)
      taxableValue = Math.round((grossItemTotal / (1 + itemGstRate / 100)) * 100) / 100;
      lineGstAmount = Math.round((grossItemTotal - taxableValue) * 100) / 100;
      lineTotal = grossItemTotal;
    } else {
      // GST added on top
      taxableValue = grossItemTotal;
      lineGstAmount = Math.round((taxableValue * (itemGstRate / 100)) * 100) / 100;
      lineTotal = taxableValue + lineGstAmount;
    }

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isIntraState) {
      cgstRate = itemGstRate / 2;
      sgstRate = itemGstRate / 2;
      cgstAmount = Math.round((lineGstAmount / 2) * 100) / 100;
      sgstAmount = Math.round((lineGstAmount - cgstAmount) * 100) / 100;
    } else {
      igstRate = itemGstRate;
      igstAmount = lineGstAmount;
    }

    totalTaxableAmount += taxableValue;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;
    totalIgst += igstAmount;
    totalGrossItems += lineTotal;

    return {
      productId: cartItem.productId,
      productName: cartItem.product.name,
      size: cartItem.product.size,
      hsnCode: settings.hsnCode || '2201',
      quantity: qty,
      unitPrice,
      discount: itemDiscount,
      taxableAmount: taxableValue,
      gstRate: itemGstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalAmount: lineTotal,
      isCustomDesign: cartItem.isCustomDesign
    };
  });

  const deliveryCharge = order.deliveryCharge || 0;
  const grandTotal = Math.round(order.totalAmount || (totalGrossItems + deliveryCharge));
  const totalGstAmount = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
  const taxableRounded = Math.round(totalTaxableAmount * 100) / 100;

  const invoiceDate = order.createdAt || new Date().toISOString();

  return {
    id: invoiceNumber,
    invoiceNumber,
    orderId: order.id,
    userUid: order.userUid,
    invoiceDate,
    supplyDate: invoiceDate,
    placeOfSupply: `${companyState} (${companyStateCode})`,
    reverseCharge: 'No',
    companyDetails: {
      legalBusinessName: settings.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING',
      tradeName: settings.tradeName || 'HH MINERAL WATER',
      businessAddress: settings.businessAddress || settings.address || 'HH Mineral Water Plant, Kolkata, West Bengal',
      city: 'Kolkata',
      state: companyState,
      stateCode: companyStateCode,
      pincode: '700001',
      gstin: settings.gstin || '',
      pan: settings.panNumber || '',
      fssaiNumber: settings.fssaiNumber || '12822001000456',
      cinNumber: settings.cinNumber || '',
      phone: settings.helplinePhone || settings.ownerWhatsApp || '8017341130',
      email: settings.contactEmail || 'orders@hhmineralwater.com',
      bankDetails: {
        bankName: settings.bankName || 'State Bank of India',
        accountName: settings.bankAccountName || settings.legalBusinessName || 'HH MINERAL WATER',
        accountNumber: settings.bankAccountNumber || '389201094821',
        ifsc: settings.bankIfsc || 'SBIN0001234',
        upiId: settings.bankUpiId || `${settings.ownerWhatsApp}@upi`
      },
      invoiceTerms: settings.invoiceTerms || '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to local jurisdiction.\n3. Storage: Keep in a cool, dry place away from direct sunlight.'
    },
    customerDetails: {
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email,
      billingAddress: order.customer.address + (order.customer.landmark ? `, Near ${order.customer.landmark}` : ''),
      deliveryAddress: order.customer.address + (order.customer.landmark ? `, Near ${order.customer.landmark}` : ''),
      city: order.customer.city || 'Kolkata',
      state: customerState,
      stateCode: customerStateCode,
      pincode: order.customer.pincode || '700001',
      gstin: order.customer.gstin
    },
    items,
    subtotal: totalGrossItems,
    discount: order.discount || 0,
    taxableAmount: taxableRounded,
    gstRate: defaultGstRate,
    cgstAmount: Math.round(totalCgst * 100) / 100,
    sgstAmount: Math.round(totalSgst * 100) / 100,
    igstAmount: Math.round(totalIgst * 100) / 100,
    totalGstAmount,
    deliveryCharge,
    grandTotal,
    grandTotalInWords: numberToIndianRupees(grandTotal),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: 'GENERATED',
    createdAt: invoiceDate
  };
}
