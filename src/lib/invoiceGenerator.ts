import { Order, AdminSettings, Invoice, InvoiceItem } from '../types';
import { DEFAULT_ADMIN_SETTINGS } from '../data/initialProducts';
import { numberToIndianRupees } from './numberToWords';

/**
 * Computes Indian financial year e.g. "2026-27"
 */
export function getFinancialYear(dateInput?: Date | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const month = validDate.getMonth(); // 0-indexed: 0=Jan, 3=April
  const year = validDate.getFullYear();
  if (month >= 3) {
    const nextYearShort = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${nextYearShort}`;
  } else {
    const yearShort = String(year % 100).padStart(2, '0');
    return `${year - 1}-${yearShort}`;
  }
}

const INDIAN_GST_STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01', 'himachal pradesh': '02', 'punjab': '03', 'chandigarh': '04',
  'uttarakhand': '05', 'haryana': '06', 'delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09',
  'bihar': '10', 'sikkim': '11', 'arunachal pradesh': '12', 'nagaland': '13', 'manipur': '14',
  'mizoram': '15', 'tripura': '16', 'meghalaya': '17', 'assam': '18', 'west bengal': '19',
  'jharkhand': '20', 'odisha': '21', 'orissa': '21', 'chhattisgarh': '22', 'madhya pradesh': '23',
  'gujarat': '24', 'dadra and nagar haveli and daman and diu': '26', 'maharashtra': '27',
  'andhra pradesh': '37', 'karnataka': '29', 'goa': '30', 'lakshadweep': '31', 'kerala': '32',
  'tamil nadu': '33', 'puducherry': '34', 'andaman and nicobar islands': '35', 'telangana': '36',
  'ladakh': '38'
};

function resolveGstStateCode(stateName?: string, explicitCode?: string, gstin?: string, fallbackCode = '19'): string {
  if (explicitCode && /^\d{2}$/.test(explicitCode.trim())) return explicitCode.trim();
  if (gstin && /^\d{2}/.test(gstin.trim())) return gstin.trim().slice(0, 2);
  if (stateName) {
    const normalized = stateName.trim().toLowerCase();
    if (INDIAN_GST_STATE_CODES[normalized]) return INDIAN_GST_STATE_CODES[normalized];
  }
  return fallbackCode;
}

/**
 * Deterministically generates an official GST Tax Invoice from an Order and AdminSettings.
 */
export function generateGstInvoice(
  order: Order,
  settings?: AdminSettings,
  sequenceNumber?: number | string
): Invoice {
  const safeOrder = order || ({} as any);
  const safeSettings = settings || DEFAULT_ADMIN_SETTINGS;
  const orderId = safeOrder.id || `HH-ORD-${Date.now().toString().slice(-6)}`;
  const finYear = getFinancialYear(safeOrder.createdAt || new Date());
  const defaultPrefix = `HH/${finYear}/`;
  const invoicePrefix = safeSettings.invoicePrefix || defaultPrefix;
  
  // Format sequential invoice number, e.g. HH/2026-27/000042
  let invoiceNumber: string;
  if (safeOrder.invoiceNumber) {
    // Preserve finalized invoice number if already set on order
    invoiceNumber = safeOrder.invoiceNumber;
  } else if (sequenceNumber) {
    const padded = String(sequenceNumber).padStart(6, '0');
    invoiceNumber = `${invoicePrefix}${padded}`;
  } else {
    // Extract numerical seed from Order ID (e.g. HH-ORD-74921 -> 074921)
    const numericPart = String(orderId).replace(/\D/g, '').slice(-6).padStart(6, '0');
    invoiceNumber = `${invoicePrefix}${numericPart}`;
  }

  const defaultGstRate = safeSettings.defaultGstRate ?? 18;
  const isGstInclusive = safeSettings.pricesIncludeGst ?? true;
  const companyStateCode = safeSettings.stateCode || '19';
  const companyState = safeSettings.state || 'West Bengal';

  // Determine Customer State and whether transaction is Intra-State or Inter-State
  const custAny = (safeOrder.customer || (safeOrder as any).customerDetails || {}) as any;
  const customerState = custAny.state || companyState;
  const customerGstin = custAny.gstin || (safeOrder as any).gstin;
  const customerStateCode = resolveGstStateCode(customerState, custAny.stateCode, customerGstin, companyStateCode);

  // Intra-state (CGST + SGST) if customer is in same state, otherwise Inter-state (IGST)
  const isIntraState = customerStateCode === companyStateCode;

  let totalTaxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalGrossItems = 0;

  const rawItems = Array.isArray(safeOrder.items)
    ? safeOrder.items
    : typeof safeOrder.items === 'string'
    ? (() => {
        try { return JSON.parse(safeOrder.items); } catch { return []; }
      })()
    : [];

  const itemsList = rawItems.length > 0 ? rawItems : [
    {
      productId: 'hh-water-pack',
      productName: 'HH Packaged Drinking Water',
      quantity: 1,
      unitPrice: Number(safeOrder.totalAmount) || 120,
      size: '500ml'
    }
  ];

  const items: InvoiceItem[] = itemsList.map((cartItem: any) => {
    const qty = Math.max(1, Number(cartItem.quantity) || 1);
    const unitPrice = Number(cartItem.unitPrice ?? cartItem.price ?? cartItem.product?.price ?? 10) || 10;
    const grossItemTotal = qty * unitPrice;
    const itemDiscount = 0;
    const itemGstRate = defaultGstRate;
    const prodName = cartItem.product?.name || cartItem.name || cartItem.productName || 'HH Mineral Water';
    const prodSize = cartItem.product?.size || cartItem.size || '500ml';
    const prodId = cartItem.productId || cartItem.id || 'prod-500ml';

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
      productId: prodId,
      productName: prodName,
      size: prodSize,
      hsnCode: safeSettings.hsnCode || '2201',
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
      isCustomDesign: Boolean(cartItem.isCustomDesign)
    };
  });

  const deliveryCharge = Number(safeOrder.deliveryCharge) || 0;
  const discountAmount = Number(safeOrder.discount) || 0;
  const rawOrderTotal = safeOrder.totalAmount !== undefined && safeOrder.totalAmount !== null
    ? Number(safeOrder.totalAmount)
    : NaN;
  const grandTotal = Math.max(
    0,
    Math.round(Number.isFinite(rawOrderTotal) ? rawOrderTotal : (totalGrossItems + deliveryCharge - discountAmount))
  );
  const totalGstAmount = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
  const taxableRounded = Math.round(totalTaxableAmount * 100) / 100;

  const invoiceDate = safeOrder.createdAt || new Date().toISOString();

  return {
    id: invoiceNumber,
    invoiceNumber,
    orderId,
    userUid: safeOrder.userUid,
    invoiceDate,
    financialYear: finYear,
    supplyDate: invoiceDate,
    placeOfSupply: `${customerState} (${customerStateCode})`,
    reverseCharge: 'No',
    companyDetails: {
      legalBusinessName: safeSettings.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING',
      tradeName: safeSettings.tradeName || 'HH MINERAL WATER',
      businessAddress: safeSettings.businessAddress || (safeSettings as any).address || 'Plot No. 12, Industrial Water Zone, Kolkata, West Bengal',
      city: (safeSettings as any).city || 'Kolkata',
      state: companyState,
      stateCode: companyStateCode,
      pincode: (safeSettings as any).pincode || '700001',
      gstin: safeSettings.gstin || '19AAACH1234F1Z8',
      pan: safeSettings.pan || (safeSettings as any).panNumber || 'AAACH1234F',
      fssaiNumber: safeSettings.fssaiNumber || '12822001000456',
      cinNumber: safeSettings.cinNumber || 'U15543WB2026PTC245678',
      phone: safeSettings.helplinePhone || safeSettings.ownerWhatsApp || '8017341130',
      email: safeSettings.contactEmail || 'orders@hhmineralwater.com',
      bankDetails: {
        bankName: safeSettings.bankName || 'State Bank of India',
        accountName: safeSettings.accountHolderName || safeSettings.legalBusinessName || 'HH MINERAL WATER',
        accountNumber: safeSettings.accountNumber || '389201094821',
        ifsc: safeSettings.ifscCode || 'SBIN0001234',
        upiId: safeSettings.upiId || `${safeSettings.ownerWhatsApp || '8017341130'}@upi`
      },
      invoiceTerms: safeSettings.invoiceTerms || '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to local jurisdiction.\n3. Storage: Keep in a dry place away from direct sunlight.'
    },
    customerDetails: {
      name: custAny.name || (safeOrder as any).customerName || 'Valued Customer',
      phone: custAny.phone || (safeOrder as any).customerPhone || 'Not Provided',
      email: custAny.email || (safeOrder as any).customerEmail || undefined,
      billingAddress: (custAny.address || (safeOrder as any).deliveryAddress || 'Kolkata, West Bengal') + (custAny.landmark ? `, Near ${custAny.landmark}` : ''),
      deliveryAddress: (custAny.address || (safeOrder as any).deliveryAddress || 'Kolkata, West Bengal') + (custAny.landmark ? `, Near ${custAny.landmark}` : ''),
      city: custAny.city || 'Kolkata',
      state: customerState,
      stateCode: customerStateCode,
      pincode: custAny.pincode || '700001',
      gstin: custAny.gstin || (safeOrder as any).gstin || undefined
    },
    items,
    subtotal: totalGrossItems,
    discount: Number(safeOrder.discount) || 0,
    taxableAmount: taxableRounded,
    gstRate: defaultGstRate,
    cgstAmount: Math.round(totalCgst * 100) / 100,
    sgstAmount: Math.round(totalSgst * 100) / 100,
    igstAmount: Math.round(totalIgst * 100) / 100,
    totalGstAmount,
    deliveryCharge,
    grandTotal,
    grandTotalInWords: numberToIndianRupees(grandTotal),
    paymentMethod: safeOrder.paymentMethod || 'Online / Cash on Delivery',
    paymentStatus: safeOrder.paymentStatus || 'Paid',
    status: 'GENERATED',
    createdAt: invoiceDate,
    isOfflineInvoice: Boolean(safeOrder.isOfflineSale),
    orderSource: safeOrder.orderSource || (safeOrder.isOfflineSale ? 'offline_counter' : 'online'),
    isCustomOrder: Boolean(safeOrder.isCustomOrder),
    customLabelDetails: safeOrder.customLabelDetails || undefined
  };
}
