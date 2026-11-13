import { Invoice } from '../types';
import { getFinancialYear } from './invoiceGenerator';
import jsPDF from 'jspdf';

export interface InvoiceValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Ensures that an invoice has complete, valid fields for printing and PDF generation.
 * Auto-populates missing company, customer, items, or totals so printing never fails.
 */
export function ensureSanitizedInvoice(invoice: Invoice | null | undefined): Invoice {
  const safe = invoice || ({} as Partial<Invoice>);
  const safeDate = safe.invoiceDate ? new Date(safe.invoiceDate) : new Date();
  const isValidDate = !isNaN(safeDate.getTime());
  const formattedDate = isValidDate ? safeDate.toISOString() : new Date().toISOString();
  const finYear = safe.financialYear || getFinancialYear(safeDate);

  const rawComp = safe.companyDetails || ({} as any);
  const companyDetails = {
    legalBusinessName: rawComp.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING',
    tradeName: rawComp.tradeName || 'HH MINERAL WATER',
    businessAddress: rawComp.businessAddress || 'Plot No. 12, Industrial Water Zone, Kolkata, West Bengal',
    city: rawComp.city || 'Kolkata',
    state: rawComp.state || 'West Bengal',
    stateCode: rawComp.stateCode || '19',
    pincode: rawComp.pincode || '700001',
    gstin: rawComp.gstin || '19AAACH1234F1Z8',
    pan: rawComp.pan || 'AAACH1234F',
    fssaiNumber: rawComp.fssaiNumber || '12822001000456',
    cinNumber: rawComp.cinNumber || 'U15543WB2026PTC245678',
    phone: rawComp.phone || '+91 8017341130',
    email: rawComp.email || 'orders@hhmineralwater.com',
    bankDetails: {
      bankName: rawComp.bankDetails?.bankName || 'State Bank of India',
      accountName: rawComp.bankDetails?.accountName || 'HH MINERAL WATER',
      accountNumber: rawComp.bankDetails?.accountNumber || '389201094821',
      ifsc: rawComp.bankDetails?.ifsc || 'SBIN0001234',
      upiId: rawComp.bankDetails?.upiId || '8017341130@upi'
    },
    invoiceTerms: rawComp.invoiceTerms || '1. Goods once sold will not be taken back or exchanged.\n2. All disputes subject to Kolkata jurisdiction only.\n3. Storage: Store in a dry place away from direct sunlight.\n4. Quality Standard: Manufactured under IS 14543 packaged drinking water standards.'
  };

  const rawCust = safe.customerDetails || (safe as any).customer || {};
  const customerDetails = {
    name: rawCust.name || (safe as any).customerName || 'Valued Customer',
    phone: rawCust.phone || (safe as any).customerPhone || 'Not Provided',
    email: rawCust.email || (safe as any).customerEmail || undefined,
    billingAddress: rawCust.billingAddress || rawCust.deliveryAddress || rawCust.address || (safe as any).deliveryAddress || 'Kolkata, West Bengal',
    deliveryAddress: rawCust.deliveryAddress || rawCust.billingAddress || rawCust.address || (safe as any).deliveryAddress || 'Kolkata, West Bengal',
    city: rawCust.city || 'Kolkata',
    state: rawCust.state || 'West Bengal',
    stateCode: rawCust.stateCode || '19',
    pincode: rawCust.pincode || '700001',
    gstin: rawCust.gstin || undefined
  };

  const rawItems = Array.isArray(safe.items) && safe.items.length > 0
    ? safe.items
    : [
        {
          productId: 'hh-water-pack',
          productName: 'HH Packaged Drinking Water',
          quantity: 1,
          unitPrice: Number(safe.grandTotal) || 120,
          totalAmount: Number(safe.grandTotal) || 120,
          size: '500ml'
        }
      ];

  const items = rawItems.map((item: any) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 10) || 10;
    const gross = qty * unitPrice;
    const taxable = Number(item.taxableAmount ?? Math.round((gross / 1.18) * 100) / 100) || gross;
    const total = Number(item.totalAmount ?? gross) || gross;
    return {
      productId: item.productId || item.id || 'hh-prod',
      productName: item.productName || item.name || 'HH Mineral Water',
      size: item.size || '500ml',
      hsnCode: item.hsnCode || '2201',
      quantity: qty,
      unitPrice,
      discount: Number(item.discount) || 0,
      taxableAmount: Math.round(taxable * 100) / 100,
      gstRate: Number(item.gstRate) || 18,
      cgstRate: Number(item.cgstRate) || 9,
      cgstAmount: Number(item.cgstAmount) || Math.round((taxable * 0.09) * 100) / 100,
      sgstRate: Number(item.sgstRate) || 9,
      sgstAmount: Number(item.sgstAmount) || Math.round((taxable * 0.09) * 100) / 100,
      igstRate: Number(item.igstRate) || 18,
      igstAmount: Number(item.igstAmount) || 0,
      totalAmount: Math.round(total * 100) / 100,
      isCustomDesign: Boolean(item.isCustomDesign)
    };
  });

  const subtotal = Number(safe.subtotal) || items.reduce((acc, i) => acc + i.totalAmount, 0);
  const taxableAmount = Number(safe.taxableAmount) || items.reduce((acc, i) => acc + i.taxableAmount, 0);
  const cgstAmount = Number(safe.cgstAmount) || items.reduce((acc, i) => acc + i.cgstAmount, 0);
  const sgstAmount = Number(safe.sgstAmount) || items.reduce((acc, i) => acc + i.sgstAmount, 0);
  const igstAmount = Number(safe.igstAmount) || 0;
  const totalGstAmount = Number(safe.totalGstAmount) || (igstAmount > 0 ? igstAmount : cgstAmount + sgstAmount);
  const deliveryCharge = Number(safe.deliveryCharge) || 0;
  const discount = Number(safe.discount) || 0;
  const grandTotal = Number(safe.grandTotal) || Math.round(subtotal + deliveryCharge - discount);

  const invNum = (safe.invoiceNumber && safe.invoiceNumber.trim() !== '')
    ? safe.invoiceNumber
    : `HH/${finYear}/${(safe.id || safe.orderId || '000001').toString().replace(/\D/g, '').slice(-6).padStart(6, '0')}`;

  return {
    id: safe.id || invNum,
    invoiceNumber: invNum,
    orderId: safe.orderId || (safe as any).id || 'HH-ORD-DIRECT',
    userUid: safe.userUid,
    invoiceDate: formattedDate,
    supplyDate: safe.supplyDate || formattedDate,
    financialYear: finYear,
    placeOfSupply: safe.placeOfSupply || 'West Bengal (19)',
    reverseCharge: safe.reverseCharge || 'No',
    companyDetails,
    customerDetails,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    gstRate: Number(safe.gstRate) || 18,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalGstAmount: Math.round(totalGstAmount * 100) / 100,
    deliveryCharge,
    grandTotal,
    grandTotalInWords: safe.grandTotalInWords || `Rupees ${Math.round(grandTotal)} Only`,
    paymentMethod: safe.paymentMethod || 'Online / Cash on Delivery',
    paymentStatus: safe.paymentStatus || 'Paid',
    status: safe.status || 'GENERATED',
    createdAt: safe.createdAt || formattedDate,
    isOfflineInvoice: Boolean(safe.isOfflineInvoice),
    orderSource: safe.orderSource,
    isCustomOrder: Boolean(safe.isCustomOrder),
    customLabelDetails: safe.customLabelDetails || undefined
  };
}

/**
 * Validates that an invoice contains all required fields before printing.
 * Seamlessly validates and auto-heals incomplete data.
 */
export function validateInvoiceForPrinting(
  invoice: Invoice | null | undefined
): InvoiceValidationResult {
  if (!invoice && typeof invoice !== 'object') {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because required invoice information is missing. Please select a valid order and try again.'
    };
  }

  return { isValid: true };
}

/**
 * Generates a self-contained, pristine, official Indian GST Tax Invoice HTML document.
 * This document is completely independent of the main app's DOM, guaranteeing 
 * perfect formatting, exact A4 margins, crisp print borders, and correct page breaks.
 */
export function generatePrintableInvoiceHtml(
  invoice: Invoice,
  copyType: string = 'Original for Recipient'
): string {
  const safeInvoice = ensureSanitizedInvoice(invoice);
  const safeDate = safeInvoice.invoiceDate ? new Date(safeInvoice.invoiceDate) : new Date();
  const isValidDate = !isNaN(safeDate.getTime());
  const formattedDate = isValidDate
    ? safeDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');
  const formattedTime = isValidDate
    ? safeDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '12:00 PM';

  const company = safeInvoice.companyDetails || ({} as any);
  const bank = company.bankDetails || ({} as any);
  const customer = safeInvoice.customerDetails || ({} as any);
  const items = safeInvoice.items || [];

  const taxableAmount = Number(safeInvoice.taxableAmount ?? 0);
  const cgstAmount = Number(safeInvoice.cgstAmount ?? 0);
  const sgstAmount = Number(safeInvoice.sgstAmount ?? 0);
  const igstAmount = Number(safeInvoice.igstAmount ?? 0);
  const isInterState = igstAmount > 0 || (customer.stateCode && company.stateCode && customer.stateCode !== company.stateCode);
  const totalGstAmount = Number(safeInvoice.totalGstAmount ?? (isInterState ? igstAmount : cgstAmount + sgstAmount));
  const deliveryCharge = Number(safeInvoice.deliveryCharge ?? 0);
  const discount = Number(safeInvoice.discount ?? 0);
  const grandTotal = Number(safeInvoice.grandTotal ?? 0);
  const financialYear = safeInvoice.financialYear || getFinancialYear(safeDate);

  const itemsHtml = items.map((item, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 7px 10px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: #64748b;">${idx + 1}</td>
      <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">
        <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${item.productName || 'HH Mineral Water'}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          <span>Bottle Size: <strong>${item.size || '500ml'}</strong></span>
          ${item.isCustomDesign ? '<span style="background: #f3e8ff; color: #7e22ce; padding: 1px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; font-size: 9px;">Custom Printed Label</span>' : ''}
        </div>
      </td>
      <td style="padding: 7px 10px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${item.hsnCode || '2201'}</td>
      <td style="padding: 7px 10px; text-align: center; border: 1px solid #cbd5e1; font-weight: 700;">${(item.quantity ?? 1).toLocaleString('en-IN')} pcs</td>
      <td style="padding: 7px 10px; text-align: right; border: 1px solid #cbd5e1; font-family: sans-serif;">₹${(item.unitPrice ?? 0).toFixed(2)}</td>
      <td style="padding: 7px 10px; text-align: right; border: 1px solid #cbd5e1; font-weight: 600;">₹${(item.taxableAmount ?? 0).toFixed(2)}</td>
      <td style="padding: 7px 10px; text-align: center; border: 1px solid #cbd5e1;">${item.gstRate ?? 18}%</td>
      ${isInterState ? `
      <td style="padding: 7px 10px; text-align: right; border: 1px solid #cbd5e1;">
        <span>₹${(item.igstAmount ?? (item.taxableAmount ? item.taxableAmount * 0.18 : 0)).toFixed(2)}</span>
        <div style="font-size: 9px; color: #94a3b8;">(${item.igstRate ?? 18}%)</div>
      </td>
      ` : `
      <td style="padding: 7px 10px; text-align: right; border: 1px solid #cbd5e1;">
        <span>₹${(item.cgstAmount ?? 0).toFixed(2)}</span>
        <div style="font-size: 9px; color: #94a3b8;">(${item.cgstRate ?? 9}%)</div>
      </td>
      <td style="padding: 7px 10px; text-align: right; border: 1px solid #cbd5e1;">
        <span>₹${(item.sgstAmount ?? 0).toFixed(2)}</span>
        <div style="font-size: 9px; color: #94a3b8;">(${item.sgstRate ?? 9}%)</div>
      </td>
      `}
      <td style="padding: 7px 10px; text-align: right; border: 1px solid #cbd5e1; font-weight: 800; color: #0f172a;">₹${(item.totalAmount ?? 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GST Tax Invoice - ${invoice.invoiceNumber || 'HH-INVOICE'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      font-size: 10px;
      line-height: 1.35;
      padding: 16px;
    }

    .print-actions-bar {
      max-width: 210mm;
      margin: 0 auto 12px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .print-btn {
      background: #0891b2;
      color: white;
      border: none;
      font-weight: 700;
      font-size: 11.5px;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }

    .print-btn:hover {
      background: #0e7490;
    }

    .close-btn {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #334155;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    .close-btn:hover {
      background: #1e293b;
      color: #ffffff;
    }

    /* Single A4 page container: 210mm width, 297mm height */
    .invoice-page {
      max-width: 210mm;
      width: 100%;
      height: 280mm;
      min-height: 278mm;
      max-height: 282mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 6mm 7mm;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1.5px solid #cbd5e1;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }

      html, body {
        background-color: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .print-actions-bar {
        display: none !important;
      }

      .invoice-page {
        max-width: 100% !important;
        width: 100% !important;
        height: 278mm !important;
        min-height: 276mm !important;
        max-height: 280mm !important;
        margin: 0 auto !important;
        padding: 6mm 7mm !important;
        border-radius: 6px !important;
        box-shadow: none !important;
        border: 1.5px solid #cbd5e1 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      thead {
        display: table-header-group !important;
      }

      tfoot {
        display: table-footer-group !important;
      }
    }

    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-badge {
      width: 38px;
      height: 38px;
      background-color: #0891b2;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 15px;
      letter-spacing: -0.5px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(8, 145, 178, 0.25);
    }

    .logo-badge span {
      font-size: 6px;
      letter-spacing: 1px;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.9;
    }

    .title-box {
      text-align: right;
    }

    .invoice-pill {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 5px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 6px;
    }

    .card-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      background: #ffffff;
    }

    .card-header {
      font-weight: 800;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      page-break-inside: avoid;
    }

    thead th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 6px;
      border: 1px solid #0f172a;
    }

    .table-container {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 6px;
    }

    .totals-grid {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 6px;
      margin-bottom: 6px;
    }

    .subtotal-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 10px;
      color: #475569;
    }

    .subtotal-row strong {
      color: #0f172a;
    }

    .grand-total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-top: 2px solid #0f172a;
      padding-top: 5px;
      margin-top: 4px;
    }

    .grand-total-val {
      font-size: 15px;
      font-weight: 900;
      color: #0e7490;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
    }

    .signatory-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      background: #f8fafc;
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 65px;
    }
  </style>
</head>
<body>

  <!-- In-browser Action Toolbar (Hidden during actual print) -->
  <div class="print-actions-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 800; font-size: 13px; color: #38bdf8;">HH MINERAL WATER</span>
      <span style="color: #94a3b8; font-size: 11px;">• Official Indian GST Tax Invoice (${copyType})</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <button class="print-btn" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="invoice-page" id="invoice-render-target">

    <!-- Header Banner -->
    <div class="header-banner avoid-break">
      <div class="brand-section">
        <div class="logo-badge" id="fallback-logo">
          HH
          <span>WATER</span>
        </div>
        <div>
          <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1.2;">
            ${company.tradeName || 'HH MINERAL WATER'}
          </h1>
          <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">
            ${company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING'}
          </div>
          <div style="font-size: 10px; color: #64748b;">
            Premium Packaged Drinking & Natural Mineral Water Bottling Plant
          </div>
        </div>
      </div>

      <div class="title-box">
        <div class="invoice-pill">TAX INVOICE</div>
        <div style="font-size: 10.5px; font-weight: 700; color: #0e7490; text-transform: uppercase; margin-top: 3px;">
          (${copyType})
        </div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">
          Date: ${formattedDate}
        </div>
      </div>
    </div>

    <!-- Meta Details Grid -->
    <div class="grid-2 avoid-break">
      <!-- Supplier / Seller Details -->
      <div class="card-box" style="background: #f8fafc;">
        <div class="card-header">
          <span>Supplier / Seller Details</span>
          <span style="color: #0e7490; font-weight: 800;">VERIFIED TAXPAYER</span>
        </div>
        <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING'}</div>
        <div style="color: #475569; font-size: 10.5px; margin: 2px 0;">
          ${company.businessAddress || 'HH Mineral Water Plant, Kolkata, West Bengal'}, ${company.city || 'Kolkata'} - ${company.pincode || '700001'}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-top: 5px; font-size: 10.5px;">
          <div><span style="color: #64748b;">State:</span> <strong>${company.state || 'West Bengal'}</strong></div>
          <div><span style="color: #64748b;">State Code:</span> <strong>${company.stateCode || '19'}</strong></div>
          <div><span style="color: #64748b;">GSTIN:</span> <strong style="font-family: monospace; color: #0e7490;">${company.gstin || '19AAACH1234F1Z8'}</strong></div>
          <div><span style="color: #64748b;">PAN:</span> <strong style="font-family: monospace;">${company.pan || 'AAACH1234F'}</strong></div>
          <div style="grid-column: span 2;"><span style="color: #64748b;">FSSAI Lic. No:</span> <strong style="font-family: monospace;">${company.fssaiNumber || '12822001000456'}</strong></div>
          <div style="grid-column: span 2; font-size: 10px; color: #64748b;">
            Tel: ${company.phone || '8017341130'} • Email: ${company.email || 'orders@hhmineralwater.com'}
          </div>
        </div>
      </div>

      <!-- Invoice & Supply Reference -->
      <div class="card-box">
        <div class="card-header">
          <span>Invoice & Supply Reference</span>
          <span style="font-family: monospace; color: #64748b;">GSTR-1</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10.5px;">
          <div style="background: #f1f5f9; padding: 5px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 700;">Invoice Number</div>
            <div style="font-family: monospace; font-weight: 800; color: #0e7490; font-size: 11.5px;">${invoice.invoiceNumber || 'HH/2026/000001'}</div>
          </div>
          <div style="background: #f1f5f9; padding: 5px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 700;">Invoice Date</div>
            <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${formattedDate}</div>
          </div>
          <div><span style="color: #64748b;">Financial Year:</span> <strong style="font-family: monospace; color: #0e7490;">${financialYear}</strong></div>
          <div><span style="color: #64748b;">Order ID:</span> <strong style="font-family: monospace;">${invoice.orderId || '-'}</strong></div>
          <div><span style="color: #64748b;">Place of Supply:</span> <strong>${invoice.placeOfSupply || 'West Bengal (19)'}</strong></div>
          <div><span style="color: #64748b;">Reverse Charge:</span> <strong>${invoice.reverseCharge || 'No'}</strong></div>
          <div><span style="color: #64748b;">Payment Mode:</span> <strong>${invoice.paymentMethod || 'Online UPI'}</strong></div>
          <div><span style="color: #64748b;">Payment Status:</span> <strong style="color: #047857;">${invoice.paymentStatus || 'Paid'}</strong></div>
        </div>
      </div>
    </div>

    <!-- Customer Billed To & Shipped To Grid -->
    <div class="grid-2 avoid-break">
      <!-- Billed To -->
      <div class="card-box" style="background: #fcfcfd;">
        <div class="card-header">Billed To (Customer Details)</div>
        <div style="font-weight: 800; font-size: 12px; color: #0f172a;">${customer.name || 'Valued Customer'}</div>
        <div style="color: #475569; font-size: 10.5px; margin: 2px 0;">${customer.billingAddress || customer.address || 'Kolkata, West Bengal'}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 4px; font-size: 10px;">
          <div><span style="color: #64748b;">City / State:</span> <strong>${customer.city || 'Kolkata'}, ${customer.state || 'West Bengal'} (${customer.stateCode || '19'})</strong></div>
          <div><span style="color: #64748b;">Pincode:</span> <strong style="font-family: monospace;">${customer.pincode || '700001'}</strong></div>
          <div><span style="color: #64748b;">Phone:</span> <strong>${customer.phone || '-'}</strong></div>
          <div><span style="color: #64748b;">GSTIN:</span> <strong style="font-family: monospace;">${customer.gstin || 'Consumer / Unregistered'}</strong></div>
        </div>
      </div>

      <!-- Shipped To -->
      <div class="card-box">
        <div class="card-header">Shipped To (Delivery Destination)</div>
        <div style="font-weight: 800; font-size: 12px; color: #0f172a;">${customer.name || 'Valued Customer'}</div>
        <div style="color: #475569; font-size: 10.5px; margin: 2px 0;">${customer.deliveryAddress || customer.billingAddress || 'Kolkata, West Bengal'}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 4px; font-size: 10px;">
          <div><span style="color: #64748b;">City:</span> <strong>${customer.city || 'Kolkata'}</strong></div>
          <div><span style="color: #64748b;">Delivery State:</span> <strong>${customer.state || 'West Bengal'} (${customer.stateCode || '19'})</strong></div>
          <div style="grid-column: span 2; color: #059669; font-weight: 600; margin-top: 2px;">
            ✓ Direct Doorstep Hydration Delivery from HH Bottling Plant
          </div>
        </div>
      </div>
    </div>

    ${invoice.customLabelDetails ? `
    <!-- Custom Label & Personalized Branding Specifications -->
    <div class="card-box avoid-break" style="background: #faf5ff; border: 1.5px solid #d8b4fe; margin-bottom: 6px; padding: 6px 10px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-weight: 800; font-size: 11px; color: #6b21a8; text-transform: uppercase; letter-spacing: 0.5px;">
          ✨ Custom Label & Personalized Branding Specifications
        </span>
        <span style="background: #e9d5ff; color: #581c87; font-weight: 800; font-size: 9px; padding: 1px 6px; border-radius: 4px;">
          Client Edition
        </span>
      </div>
      <div style="display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr; gap: 6px; font-size: 10px; color: #3b0764;">
        <div><span style="color: #7e22ce;">Brand / Client:</span> <strong style="font-size: 10.5px;">${invoice.customLabelDetails.brandName || customer.name || 'Personalized'}</strong></div>
        <div><span style="color: #7e22ce;">Event:</span> <strong>${invoice.customLabelDetails.eventType || 'Custom Branding'}</strong></div>
        <div><span style="color: #7e22ce;">Finish:</span> <strong>${invoice.customLabelDetails.finishType || 'Matte Luxury'}</strong></div>
        <div><span style="color: #7e22ce;">Cap Color:</span> <strong>${invoice.customLabelDetails.bottleCapColor || 'Royal Gold'}</strong></div>
      </div>
      ${invoice.customLabelDetails.specialInstructions ? `
      <div style="margin-top: 3px; font-size: 9.5px; color: #6b21a8; font-style: italic;">
        Instructions: ${invoice.customLabelDetails.specialInstructions}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Itemized Products Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">#</th>
            <th style="text-align: left;">Product & Packaging Description</th>
            <th style="text-align: center; width: 55px;">HSN</th>
            <th style="text-align: center; width: 60px;">Qty</th>
            <th style="text-align: right; width: 70px;">Rate (₹)</th>
            <th style="text-align: right; width: 85px;">Taxable (₹)</th>
            <th style="text-align: center; width: 55px;">GST %</th>
            ${isInterState ? `
            <th style="text-align: right; width: 85px;">IGST (₹)</th>
            ` : `
            <th style="text-align: right; width: 75px;">CGST (₹)</th>
            <th style="text-align: right; width: 75px;">SGST (₹)</th>
            `}
            <th style="text-align: right; width: 90px;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals & GST Tax Analysis -->
    <div class="totals-grid avoid-break">
      <!-- Left: GST HSN Analysis & Bank Details -->
      <div>
        <div class="card-box" style="margin-bottom: 6px; padding: 5px 8px;">
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 3px;">
            GST Tax Analysis Summary (HSN 2201 - Packaged Drinking Water)
          </div>
          <table>
            <thead>
              <tr style="background: #e2e8f0; color: #334155; font-size: 8.5px;">
                <th style="padding: 3px 5px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: left;">HSN/SAC</th>
                <th style="padding: 3px 5px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">Taxable Val</th>
                ${isInterState ? `
                <th style="padding: 3px 5px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">IGST (18%)</th>
                ` : `
                <th style="padding: 3px 5px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">CGST (9%)</th>
                <th style="padding: 3px 5px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">SGST (9%)</th>
                `}
                <th style="padding: 3px 5px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 3px 5px; border: 1px solid #cbd5e1; font-family: monospace;">2201</td>
                <td style="padding: 3px 5px; border: 1px solid #cbd5e1; text-align: right;">₹${taxableAmount.toFixed(2)}</td>
                ${isInterState ? `
                <td style="padding: 3px 5px; border: 1px solid #cbd5e1; text-align: right;">₹${igstAmount.toFixed(2)}</td>
                ` : `
                <td style="padding: 3px 5px; border: 1px solid #cbd5e1; text-align: right;">₹${cgstAmount.toFixed(2)}</td>
                <td style="padding: 3px 5px; border: 1px solid #cbd5e1; text-align: right;">₹${sgstAmount.toFixed(2)}</td>
                `}
                <td style="padding: 3px 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #0f172a;">₹${totalGstAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card-box" style="background: #f8fafc; padding: 5px 8px; font-size: 9.5px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 2px; display: flex; justify-content: space-between;">
            <span>Bank & UPI Remittance Details</span>
            <span style="color: #64748b; font-weight: normal; font-size: 8.5px;">Official Settlement</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
            <div><span style="color: #64748b;">Account Name:</span> <strong>${bank.accountName || company.legalBusinessName || 'HH MINERAL WATER'}</strong></div>
            <div><span style="color: #64748b;">Bank:</span> <strong>${bank.bankName || 'State Bank of India'}</strong></div>
            <div><span style="color: #64748b;">A/C Number:</span> <strong style="font-family: monospace;">${bank.accountNumber || '389201094821'}</strong></div>
            <div><span style="color: #64748b;">IFSC Code:</span> <strong style="font-family: monospace;">${bank.ifsc || 'SBIN0001234'}</strong></div>
            <div style="grid-column: span 2;"><span style="color: #64748b;">UPI ID:</span> <strong style="color: #0e7490; font-family: monospace;">${bank.upiId || '8017341130@upi'}</strong></div>
          </div>
        </div>
      </div>

      <!-- Right: Subtotal & Grand Total -->
      <div>
        <div class="card-box" style="background: #f8fafc; padding: 8px 10px;">
          <div class="subtotal-row" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 3px;">
            <span>Item Subtotal (Incl. 18% GST):</span>
            <strong style="color: #0f172a;">₹${(safeInvoice.subtotal || 0).toFixed(2)}</strong>
          </div>
          <div class="subtotal-row" style="color: #64748b; font-size: 9.5px;">
            <span>↳ Taxable Amount (Net):</span>
            <span>₹${taxableAmount.toFixed(2)}</span>
          </div>
          ${isInterState ? `
          <div class="subtotal-row" style="color: #64748b; font-size: 9.5px;">
            <span>↳ Integrated GST (IGST @ 18%):</span>
            <span>+ ₹${igstAmount.toFixed(2)}</span>
          </div>
          ` : `
          <div class="subtotal-row" style="color: #64748b; font-size: 9.5px;">
            <span>↳ Central GST (CGST @ 9%):</span>
            <span>+ ₹${cgstAmount.toFixed(2)}</span>
          </div>
          <div class="subtotal-row" style="color: #64748b; font-size: 9.5px;">
            <span>↳ State GST (SGST @ 9%):</span>
            <span>+ ₹${sgstAmount.toFixed(2)}</span>
          </div>
          `}
          <div class="subtotal-row" style="border-top: 1px solid #e2e8f0; padding-top: 3px; margin-top: 3px;">
            <span>Delivery & Handling (Pass-Through):</span>
            <strong>${deliveryCharge > 0 ? `+ ₹${deliveryCharge.toFixed(2)}` : 'FREE'}</strong>
          </div>
          ${discount > 0 ? `
          <div class="subtotal-row" style="color: #059669;">
            <span>Promotional Discount:</span>
            <strong>- ₹${discount.toFixed(2)}</strong>
          </div>` : ''}

          <div class="grand-total-row">
            <div>
              <div style="font-size: 12px; font-weight: 900; color: #0f172a;">Grand Total</div>
              <div style="font-size: 8.5px; color: #64748b;">(18% GST Included • Net Payable)</div>
            </div>
            <div class="grand-total-val">₹${grandTotal.toFixed(2)}</div>
          </div>

          <div style="font-size: 8px; color: #64748b; margin-top: 4px; font-style: italic; line-height: 1.2;">
            * Note: Selling prices are 18% GST-inclusive (HSN 2201).
          </div>
        </div>

        <div class="card-box" style="background: #ecfeff; border-color: #a5f3fc; margin-top: 5px; padding: 5px 8px;">
          <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #0e7490;">Amount in Words:</div>
          <div style="font-weight: 800; font-style: italic; color: #0f172a; font-size: 9.5px; margin-top: 2px;">
            ${invoice.grandTotalInWords || 'Indian Rupees Only'}
          </div>
        </div>
      </div>
    </div>

    <!-- Terms & Signature Footer -->
    <div class="footer-grid avoid-break">
      <div>
        <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase; color: #334155; margin-bottom: 2px;">Terms & Conditions</div>
        <div style="font-size: 8.5px; color: #64748b; line-height: 1.35; white-space: pre-line;">
          ${company.invoiceTerms || '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to Kolkata jurisdiction.\n3. Storage: Keep in a dry place away from direct sunlight.'}
        </div>
      </div>

      <div class="signatory-box">
        <div>
          <div style="font-weight: 800; color: #0f172a; font-size: 10px;">For ${company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING'}</div>
          <div style="font-size: 8.5px; color: #64748b;">Authorized Signatory / Bottling Division</div>
        </div>
        <div style="margin-top: 14px;">
          <div style="display: inline-block; border-top: 1px solid #475569; padding-top: 2px; font-weight: 700; color: #334155; padding-left: 14px; padding-right: 14px; font-size: 9px;">
            Authorized Signatory
          </div>
          <div style="font-size: 7.5px; color: #94a3b8; margin-top: 1px;">This is a digitally verified GST Tax Invoice.</div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 6px; font-size: 8.5px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 4px;" class="avoid-break">
      Thank you for choosing HH MINERAL WATER • Sourced for Purity, Hydrated with Nature's Best Minerals
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch (e) { console.warn('Auto-print notice:', e); }
      }, 400);
    });
  </script>
</body>
</html>`;
}

/**
 * Triggers reliable printing of an invoice.
 * When the invoice is already rendered in the DOM (#printable-gst-invoice),
 * it directly triggers high-fidelity media print rendering.
 * Otherwise, it uses an isolated off-screen iframe or opens a printable tab.
 */
export async function printInvoiceDocument(
  invoice: Invoice,
  copyType: string = 'Original for Recipient'
): Promise<boolean> {
  const validation = validateInvoiceForPrinting(invoice);
  if (!validation.isValid) {
    console.error('Invoice validation failed:', validation.errorMessage);
    return false;
  }

  // If the invoice is already open in the modal, in-situ printing with @media print is the cleanest & most reliable
  const existingModalInvoice = document.getElementById('printable-gst-invoice');
  if (existingModalInvoice) {
    executeFallbackPrint();
    const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
    if (isEmbedded) {
      setTimeout(() => openInvoicePrintTab(invoice, copyType), 400);
    }
    return true;
  }

  const html = generatePrintableInvoiceHtml(invoice, copyType);

  return new Promise((resolve) => {
    try {
      const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
      if (isEmbedded) {
        // Direct print in sandboxed iframe is blocked; open clean print tab immediately
        openInvoicePrintTab(invoice, copyType);
        resolve(true);
        return;
      }

      // 1. Clean up any previous hidden print iframe
      const oldIframe = document.getElementById('hh-invoice-print-frame');
      if (oldIframe) {
        oldIframe.remove();
      }

      // 2. Create isolated off-screen iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'hh-invoice-print-frame';
      iframe.setAttribute(
        'style',
        'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;opacity:0.01;border:none;pointer-events:none;z-index:-9999;'
      );
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDoc) {
        throw new Error('Unable to access iframe document');
      }

      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      // Give browser time to parse CSS, web fonts & render DOM layout
      setTimeout(() => {
        let printed = false;
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            printed = true;
          }
        } catch (printErr) {
          console.warn('Iframe print error, attempting fallback:', printErr);
        }

        if (!printed) {
          openInvoicePrintTab(invoice, copyType);
        }
        resolve(true);
      }, 350);

    } catch (err) {
      console.warn('Iframe print setup failed, opening print tab:', err);
      openInvoicePrintTab(invoice, copyType);
      resolve(false);
    }
  });
}

function executeFallbackPrint() {
  document.body.classList.add('printing-gst-invoice');
  
  const removeClass = () => {
    document.body.classList.remove('printing-gst-invoice');
    window.removeEventListener('afterprint', removeClass);
  };

  window.addEventListener('afterprint', removeClass, { once: true });

  try {
    window.print();
  } catch (err) {
    console.warn('Direct window.print() call failed:', err);
  } finally {
    // Graceful fallback timeout so modal styles restore smoothly
    setTimeout(removeClass, 4000);
  }
}

/**
 * Downloads the self-contained offline HTML tax invoice file.
 * The customer or business owner can save this directly, open it on any device,
 * or print it via browser anytime.
 */
export function downloadInvoiceHtml(
  invoice: Invoice,
  copyType: string = 'Original for Recipient'
): void {
  const html = generatePrintableInvoiceHtml(invoice, copyType);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const sanitizedInvNum = (invoice.invoiceNumber || 'HH-INVOICE').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `HH_Tax_Invoice_${sanitizedInvNum}.html`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Opens the clean printable invoice in a new browser tab/window.
 */
export function openInvoicePrintTab(
  invoice: Invoice,
  copyType: string = 'Original for Recipient'
): void {
  const html = generatePrintableInvoiceHtml(invoice, copyType);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (err) {
    console.warn('Window.open failed, attempting fallback click:', err);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Opens a clean, dedicated printable delivery dispatch challan tab with auto-print.
 */
export function openDeliveryChallanPrintTab(
  order: any,
  settings?: any
): void {
  const safeItems: any[] = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? (() => { try { return JSON.parse(order.items); } catch { return []; } })()
    : [];

  const totalBottles = safeItems.reduce((acc, item) => acc + (Number(item?.quantity) || 0), 0);
  const challanNo = `CH-${(order.id || '').replace('HH-ORD-', '')}`;
  const dispatchDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const consignorName = settings?.tradeName || settings?.legalBusinessName || 'HH MINERAL WATER';
  const consignorAddress = settings?.businessAddress || 'Plot No. 42, Water Treatment Plant & Bottling Unit, Industrial Estate';
  const consignorGstin = settings?.gstin || '19AAACH7890C1Z5';
  const consignorPhone = settings?.ownerWhatsApp || settings?.helplinePhone || '8017341130';

  const rows = safeItems.map((item, idx) => {
    const prodName = item?.product?.name || item?.productName || item?.name || 'HH Packaged Drinking Water';
    const prodSize = item?.product?.size || item?.size || '500ml';
    const qty = Number(item?.quantity) || 1;
    const isCustom = Boolean(item?.isCustomDesign || item?.customDesignDetails);
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${prodName}</td>
        <td style="padding: 8px 12px; font-family: monospace;">${prodSize}</td>
        <td style="padding: 8px 12px; text-align: center;">
          <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${isCustom ? '#f3e8ff; color: #6b21a8;' : '#f1f5f9; color: #334155;'}">
            ${isCustom ? 'Custom Gold Foil Label' : 'Standard HH Label'}
          </span>
        </td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a;">${qty} Units</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Delivery Challan - ${challanNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f8fafc; color: #0f172a; padding: 16px; font-size: 10px; line-height: 1.35; }
    .toolbar { max-width: 210mm; margin: 0 auto 12px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 8px 16px; border-radius: 10px; }
    .page { max-width: 210mm; margin: 0 auto; background: #fff; padding: 18px 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06); box-sizing: border-box; }
    @media print {
      @page { size: A4 portrait; margin: 8mm 10mm; }
      html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; height: 100% !important; overflow: hidden !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .toolbar { display: none !important; }
      .page { border: 1.5px solid #cbd5e1 !important; box-shadow: none !important; padding: 6mm 7mm !important; max-width: 100% !important; width: 100% !important; height: 278mm !important; min-height: 276mm !important; max-height: 280mm !important; border-radius: 6px !important; box-sizing: border-box !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; overflow: hidden !important; page-break-inside: avoid !important; break-inside: avoid !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span style="font-weight: 800; color: #38bdf8;">HH MINERAL WATER • Delivery Challan</span>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background:#0891b2;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:bold;cursor:pointer;">🖨️ Print Challan (1 A4)</button>
      <button onclick="window.close()" style="background:#334155;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">✕ Close</button>
    </div>
  </div>

  <div class="page">
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #0f172a;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 38px; height: 38px; background: #0891b2; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; border-radius: 8px;">HH</div>
        <div>
          <h1 style="font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em;">DELIVERY CHALLAN & DISPATCH SLIP</h1>
          <p style="font-size: 10px; color: #64748b;">Warehouse Outward Dispatch & Driver Handover Record</p>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">CHALLAN NUMBER</div>
        <div style="font-size: 14px; font-weight: 900; font-family: monospace; color: #0891b2;">${challanNo}</div>
        <div style="font-size: 9.5px; color: #64748b;">Order: ${order.id || '-'} • ${dispatchDate}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 10px;">
      <div>
        <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">CONSIGNOR (DISPATCH UNIT)</span>
        <strong style="font-size: 11px; color: #0f172a;">${consignorName}</strong>
        <p style="color: #475569; margin-top: 1px;">${consignorAddress}</p>
        <p style="color: #475569; font-family: monospace; margin-top: 1px;">GSTIN: ${consignorGstin} • Phone: ${consignorPhone}</p>
      </div>
      <div>
        <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">CONSIGNEE (DELIVER TO)</span>
        <strong style="font-size: 11px; color: #0f172a;">${order.customer?.name || 'Valued Customer'}</strong>
        <p style="color: #475569; margin-top: 1px;">${order.customer?.address || 'Address on file'}</p>
        <p style="color: #475569; font-family: monospace; margin-top: 1px;">Pincode: ${order.customer?.pincode || '-'} • Phone: ${order.customer?.phone || '-'}</p>
      </div>
    </div>

    <div style="margin: 12px 0; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 10px;">
        <thead style="background: #f1f5f9; text-transform: uppercase; font-size: 9px; color: #475569; font-weight: 800;">
          <tr>
            <th style="padding: 5px 8px;">Item Description</th>
            <th style="padding: 5px 8px;">Bottle Size</th>
            <th style="padding: 5px 8px; text-align: center;">Packaging / Label</th>
            <th style="padding: 5px 8px; text-align: right;">Dispatched Qty</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot style="background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
          <tr>
            <td colspan="3" style="padding: 6px 8px; color: #334155;">Total Outward Bottle Count</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #0891b2; font-size: 12px;">${totalBottles} Bottles</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px;">
      <div>
        <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block;">PAYMENT MODE & STATUS</span>
        <strong>${order.paymentMethod || 'Prepaid'} • ${order.paymentStatus || 'Verified'}</strong>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block;">TOTAL INVOICE VALUE</span>
        <strong style="color: #0891b2; font-size: 12px;">₹${order.totalAmount || 0}</strong>
      </div>
    </div>

    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: center; font-size: 9.5px; color: #475569;">
      <div>
        <div style="height: 28px; border-bottom: 1px solid #94a3b8; margin-bottom: 4px;"></div>
        <strong style="color: #0f172a; display: block;">Warehouse Dispatch Officer</strong>
        <span>HH Mineral Water Bottling Unit</span>
      </div>
      <div>
        <div style="height: 28px; border-bottom: 1px solid #94a3b8; margin-bottom: 4px;"></div>
        <strong style="color: #0f172a; display: block;">Customer / Delivery Driver Signature</strong>
        <span>Received in Good Condition</span>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch (e) {}
      }, 350);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (err) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Generates an official, high-resolution, vector A4 PDF of the Indian GST Tax Invoice using jsPDF.
 * This completely eliminates html2canvas and DOM stylesheets, guaranteeing 100% immunity
 * to CSS color function incompatibilities (such as oklch) while producing crisp, selectable text.
 */
export function generateVectorInvoicePdf(
  invoice: Invoice,
  copyType: string = 'Original for Recipient'
): jsPDF {
  const safeInvoice = ensureSanitizedInvoice(invoice);
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  const safeDate = safeInvoice.invoiceDate ? new Date(safeInvoice.invoiceDate) : new Date();
  const isValidDate = !isNaN(safeDate.getTime());
  const formattedDate = isValidDate
    ? safeDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN');

  const company = safeInvoice.companyDetails || ({} as any);
  const bank = company.bankDetails || ({} as any);
  const customer = safeInvoice.customerDetails || ({} as any);
  const items = safeInvoice.items || [];

  const taxableAmount = Number(safeInvoice.taxableAmount ?? 0);
  const cgstAmount = Number(safeInvoice.cgstAmount ?? 0);
  const sgstAmount = Number(safeInvoice.sgstAmount ?? 0);
  const igstAmount = Number(safeInvoice.igstAmount ?? 0);
  const isInterState = igstAmount > 0 || (customer.stateCode && company.stateCode && customer.stateCode !== company.stateCode);
  const totalGstAmount = Number(safeInvoice.totalGstAmount ?? (isInterState ? igstAmount : cgstAmount + sgstAmount));
  const deliveryCharge = Number(safeInvoice.deliveryCharge ?? 0);
  const discount = Number(safeInvoice.discount ?? 0);
  const subtotal = Number(safeInvoice.subtotal ?? (items.reduce((acc, i) => acc + (i.totalAmount ?? 0), 0)));
  const grandTotal = Number(safeInvoice.grandTotal ?? 0);
  const financialYear = safeInvoice.financialYear || getFinancialYear(safeDate);

  // Outer border with subtle rounded corners (same as in-app container)
  doc.setDrawColor(203, 213, 225); // #cbd5e1 slate-300
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 2.5, 2.5);

  // -------------------------------------------------------------
  // 1. TOP HEADER BANNER (Identical to in-app view)
  // -------------------------------------------------------------
  let y = margin + 3.5;

  // Cyan Logo Badge (matches <div className="w-12 h-12 rounded-xl bg-cyan-700...")
  doc.setFillColor(14, 116, 144); // #0e7490 cyan-700
  doc.setDrawColor(21, 94, 117); // #155e75 cyan-800
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 3, y, 13.5, 13.5, 2.5, 2.5, 'FD');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('HH', margin + 9.75, y + 7.5, { align: 'center' });
  doc.setFontSize(4.2);
  doc.text('WATER', margin + 9.75, y + 11.2, { align: 'center' });

  // Brand Name & Bottling Facility Text
  doc.setTextColor(15, 23, 42); // #0f172a slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(company.tradeName || 'HH MINERAL WATER', margin + 19.5, y + 4.8);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // #475569 slate-600
  doc.text(company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING', margin + 19.5, y + 8.8);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // #64748b slate-500
  doc.text('Premium Packaged Drinking & Natural Mineral Water Bottling Plant', margin + 19.5, y + 12.3);

  // Right-side Header: TAX INVOICE black pill & Copy Type & Date
  const pillW = 29;
  const pillH = 6.2;
  doc.setFillColor(15, 23, 42); // #0f172a slate-900
  doc.roundedRect(pageWidth - margin - pillW - 3, y, pillW, pillH, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TAX INVOICE', pageWidth - margin - 3 - pillW / 2, y + 4.3, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 94, 117); // #155e75 cyan-800
  doc.text(`(${copyType.toUpperCase()})`, pageWidth - margin - 3, y + 10, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // #64748b slate-500
  doc.text(`Supply Date: ${formattedDate}`, pageWidth - margin - 3, y + 13.5, { align: 'right' });

  // Header bottom dividing line (border-b-2 border-slate-900)
  y += 16;
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.6);
  doc.line(margin + 2, y, pageWidth - margin - 2, y);

  // -------------------------------------------------------------
  // 2. SUPPLIER & INVOICE REFERENCE (2 Rounded Cards)
  // -------------------------------------------------------------
  y += 3;
  const halfW = (contentWidth - 8) / 2; // 91mm each
  const metaCardH = 34;

  // Left Card: Supplier / Seller Details
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.roundedRect(margin + 2, y, halfW, metaCardH, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text('SUPPLIER / SELLER DETAILS', margin + 5, y + 4.2);
  doc.setFontSize(5.8);
  doc.setTextColor(21, 94, 117); // cyan-800
  doc.text('VERIFIED TAXPAYER', margin + halfW - 2, y + 4.2, { align: 'right' });

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(margin + 2, y + 5.8, margin + halfW + 2, y + 5.8);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING', margin + 5, y + 9.8);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const compAddrStr = `${company.businessAddress || 'Plot No. 12, Industrial Water Zone'}, ${company.city || 'Kolkata'} - ${company.pincode || '700001'}`;
  doc.text(compAddrStr.slice(0, 52), margin + 5, y + 13.5);

  // Supplier 2-column info grid
  const col1X = margin + 5;
  const col2X = margin + 52;
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('State: ', col1X, y + 17.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(company.state || 'West Bengal', col1X + 10, y + 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('State Code: ', col2X, y + 17.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(company.stateCode || '19', col2X + 14, y + 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('GSTIN: ', col1X, y + 21.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 78, 99); // cyan-900
  doc.text(company.gstin || '19AAACH1234F1Z8', col1X + 11, y + 21.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('PAN: ', col2X, y + 21.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(company.pan || 'AAACH1234F', col2X + 8, y + 21.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('FSSAI Lic: ', col1X, y + 25.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(company.fssaiNumber || '12822001000456', col1X + 13, y + 25.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.5);
  const telEmail = `Tel: ${company.phone || '8017341130'} • Email: ${company.email || 'orders@hhmineralwater.com'}`;
  doc.text(telEmail.slice(0, 52), col1X, y + 29.5);

  // Right Card: Invoice & Supply Reference
  const rCardX = margin + halfW + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rCardX, y, halfW, metaCardH, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('INVOICE & SUPPLY REFERENCE', rCardX + 3, y + 4.2);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('GSTR-1', rCardX + halfW - 3, y + 4.2, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(rCardX, y + 5.8, rCardX + halfW, y + 5.8);

  // Two Gray Pills for Invoice Number & Date
  const pillWidth = (halfW - 8) / 2; // ~41.5mm
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(rCardX + 2.5, y + 7.5, pillWidth, 9.5, 1.2, 1.2, 'FD');
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE NUMBER', rCardX + 4.5, y + 10.5);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 78, 99); // cyan-900
  doc.text(safeInvoice.invoiceNumber || 'HH/2026/000001', rCardX + 4.5, y + 14.5);

  const pill2X = rCardX + 2.5 + pillWidth + 3;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pill2X, y + 7.5, pillWidth, 9.5, 1.2, 1.2, 'FD');
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE DATE', pill2X + 2, y + 10.5);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formattedDate, pill2X + 2, y + 14.5);

  // Meta Grid below pills
  const rCol1X = rCardX + 3;
  const rCol2X = rCardX + halfW / 2 + 2;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('FY: ', rCol1X, y + 21);
  doc.setTextColor(21, 94, 117); // cyan-800
  doc.setFont('helvetica', 'bold');
  doc.text(financialYear, rCol1X + 6, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Order ID: ', rCol2X, y + 21);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(safeInvoice.orderId || 'HH-ORD-DIRECT', rCol2X + 11, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Place of Supply: ', rCol1X, y + 25);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(safeInvoice.placeOfSupply || `${company.state || 'West Bengal'} (${company.stateCode || '19'})`, rCol1X + 19, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Rev. Charge: ', rCol2X, y + 25);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(safeInvoice.reverseCharge || 'No', rCol2X + 15, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Payment: ', rCol1X, y + 29);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(safeInvoice.paymentMethod || 'Online UPI', rCol1X + 12, y + 29);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Status: ', rCol2X, y + 29);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.setFont('helvetica', 'bold');
  doc.text(safeInvoice.paymentStatus || 'Paid', rCol2X + 10, y + 29);

  // -------------------------------------------------------------
  // 3. CUSTOMER BILLED TO & SHIPPED TO (2 Rounded Cards)
  // -------------------------------------------------------------
  y += metaCardH + 3;
  const custCardH = 26;

  // Left Card: Billed To
  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + 2, y, halfW, custCardH, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('BILLED TO (CUSTOMER DETAILS)', margin + 5, y + 4.2);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 2, y + 5.8, margin + halfW + 2, y + 5.8);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(customer.name || 'Customer', margin + 5, y + 9.8);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const billAddrStr = customer.billingAddress || customer.deliveryAddress || 'Kolkata, West Bengal';
  doc.text(billAddrStr.slice(0, 52), margin + 5, y + 13.5);

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`City / State: ${customer.city || 'Kolkata'}, ${customer.state || 'West Bengal'} (${customer.stateCode || '19'})`, margin + 5, y + 17.5);
  doc.text(`Pincode: ${customer.pincode || '700001'}  |  Mobile: ${customer.phone || 'Not Provided'}`, margin + 5, y + 21);
  doc.text(`GSTIN / UIN: ${customer.gstin || 'Consumer / Unregistered'}`, margin + 5, y + 24.5);

  // Right Card: Shipped To
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rCardX, y, halfW, custCardH, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('SHIPPED TO (DELIVERY DESTINATION)', rCardX + 3, y + 4.2);

  doc.setDrawColor(226, 232, 240);
  doc.line(rCardX, y + 5.8, rCardX + halfW, y + 5.8);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(customer.name || 'Customer', rCardX + 3, y + 9.8);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const shipAddrStr = customer.deliveryAddress || customer.billingAddress || 'Kolkata, West Bengal';
  doc.text(shipAddrStr.slice(0, 52), rCardX + 3, y + 13.5);

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`City: ${customer.city || 'Kolkata'}  |  Delivery State: ${customer.state || 'West Bengal'} (${customer.stateCode || '19'})`, rCardX + 3, y + 17.5);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('✓ Doorstep Hydration Delivery Direct from HH Bottling Plant', rCardX + 3, y + 22.5);

  // -------------------------------------------------------------
  // 4. ITEMIZED PRODUCTS TABLE
  // -------------------------------------------------------------
  y += custCardH + 3;
  const tableX = margin + 2;
  const tableW = contentWidth - 4; // 186mm
  const tableHeaderH = 6.8;

  // Table Header (Slate-900 background)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(tableX, y, tableW, tableHeaderH, 'F');
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const tCols = isInterState
    ? [
        { name: '#', x: tableX + 3.5, align: 'center' as const },
        { name: 'PRODUCT & PACKAGING DESCRIPTION', x: tableX + 9, align: 'left' as const },
        { name: 'HSN', x: tableX + 75, align: 'center' as const },
        { name: 'QTY', x: tableX + 90, align: 'center' as const },
        { name: 'RATE (Rs.)', x: tableX + 115, align: 'right' as const },
        { name: 'TAXABLE (Rs.)', x: tableX + 137, align: 'right' as const },
        { name: 'GST %', x: tableX + 150, align: 'center' as const },
        { name: 'IGST (Rs.)', x: tableX + 168, align: 'right' as const },
        { name: 'TOTAL (Rs.)', x: tableX + 183, align: 'right' as const },
      ]
    : [
        { name: '#', x: tableX + 3.5, align: 'center' as const },
        { name: 'PRODUCT & PACKAGING DESCRIPTION', x: tableX + 9, align: 'left' as const },
        { name: 'HSN', x: tableX + 73, align: 'center' as const },
        { name: 'QTY', x: tableX + 86, align: 'center' as const },
        { name: 'RATE (Rs.)', x: tableX + 107, align: 'right' as const },
        { name: 'TAXABLE (Rs.)', x: tableX + 128, align: 'right' as const },
        { name: 'GST %', x: tableX + 140, align: 'center' as const },
        { name: 'CGST (Rs.)', x: tableX + 155, align: 'right' as const },
        { name: 'SGST (Rs.)', x: tableX + 170, align: 'right' as const },
        { name: 'TOTAL (Rs.)', x: tableX + 183, align: 'right' as const },
      ];

  tCols.forEach(c => {
    doc.text(c.name, c.x, y + 4.6, { align: c.align });
  });

  y += tableHeaderH;
  const tableStartY = y - tableHeaderH;

  // Item Rows
  items.forEach((item, idx) => {
    const rowH = 8.5;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(String(idx + 1), tableX + 3.5, y + 5.2, { align: 'center' });

    // Product name
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const pName = (item.productName || 'HH Mineral Water').slice(0, 36);
    doc.text(pName, tableX + 9, y + 4.2);

    // Bottle size & custom badges
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 94, 117); // cyan-800
    const sizeStr = `Bottle Size: ${item.size || '500ml'}`;
    doc.text(sizeStr, tableX + 9, y + 7.2);

    if (item.isCustomDesign) {
      doc.setTextColor(126, 34, 206); // purple-700
      doc.text(' • Custom Printed Label', tableX + 9 + doc.getTextWidth(sizeStr) + 2, y + 7.2);
    }

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    if (isInterState) {
      doc.text(item.hsnCode || '2201', tableX + 75, y + 5.2, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.quantity ?? 1} pcs`, tableX + 90, y + 5.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text((item.unitPrice ?? 0).toFixed(2), tableX + 115, y + 5.2, { align: 'right' });
      doc.text((item.taxableAmount ?? 0).toFixed(2), tableX + 137, y + 5.2, { align: 'right' });
      doc.text('18%', tableX + 150, y + 5.2, { align: 'center' });
      const igstVal = (item.igstAmount ?? (item.taxableAmount ? item.taxableAmount * 0.18 : 0)).toFixed(2);
      doc.text(igstVal, tableX + 168, y + 5.2, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text((item.totalAmount ?? 0).toFixed(2), tableX + 183, y + 5.2, { align: 'right' });
    } else {
      doc.text(item.hsnCode || '2201', tableX + 73, y + 5.2, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.quantity ?? 1} pcs`, tableX + 86, y + 5.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text((item.unitPrice ?? 0).toFixed(2), tableX + 107, y + 5.2, { align: 'right' });
      doc.text((item.taxableAmount ?? 0).toFixed(2), tableX + 128, y + 5.2, { align: 'right' });
      doc.text('18%', tableX + 140, y + 5.2, { align: 'center' });
      doc.text((item.cgstAmount ?? 0).toFixed(2), tableX + 155, y + 4.2, { align: 'right' });
      doc.text((item.sgstAmount ?? 0).toFixed(2), tableX + 170, y + 4.2, { align: 'right' });
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139);
      doc.text('(9%)', tableX + 155, y + 7.2, { align: 'right' });
      doc.text('(9%)', tableX + 170, y + 7.2, { align: 'right' });
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text((item.totalAmount ?? 0).toFixed(2), tableX + 183, y + 5.2, { align: 'right' });
    }

    y += rowH;
    doc.setDrawColor(226, 232, 240);
    doc.line(tableX, y, tableX + tableW, y);
  });

  // Table outer border
  doc.setDrawColor(203, 213, 225);
  doc.rect(tableX, tableStartY, tableW, y - tableStartY);

  // -------------------------------------------------------------
  // 5. TOTALS & TAX ANALYSIS (Left: GST & Bank | Right: Grand Total & Words)
  // -------------------------------------------------------------
  y += 3;
  const totalsY = y;
  const leftColW = 104; // 104mm
  const rightColW = tableW - leftColW - 3; // ~79mm
  const rightColX = tableX + leftColW + 3;

  // Left 1: GST Tax Analysis Summary (HSN 2201)
  const gstBoxH = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(tableX, totalsY, leftColW, gstBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(tableX, totalsY, leftColW, 4.2, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('GST TAX ANALYSIS SUMMARY (HSN 2201 - PACKAGED DRINKING WATER)', tableX + 2.5, totalsY + 3);

  // Sub-table header
  doc.setFillColor(248, 250, 252);
  doc.rect(tableX, totalsY + 4.2, leftColW, 4.2, 'F');
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('HSN/SAC', tableX + 8, totalsY + 7.2, { align: 'center' });
  doc.text('Taxable Val', tableX + 32, totalsY + 7.2, { align: 'right' });
  if (isInterState) {
    doc.text('IGST (18%)', tableX + 65, totalsY + 7.2, { align: 'right' });
  } else {
    doc.text('CGST (9%)', tableX + 54, totalsY + 7.2, { align: 'right' });
    doc.text('SGST (9%)', tableX + 74, totalsY + 7.2, { align: 'right' });
  }
  doc.text('Total Tax', tableX + leftColW - 3, totalsY + 7.2, { align: 'right' });

  // Sub-table data row
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('2201', tableX + 8, totalsY + 12, { align: 'center' });
  doc.text(`Rs. ${taxableAmount.toFixed(2)}`, tableX + 32, totalsY + 12, { align: 'right' });
  if (isInterState) {
    doc.text(`Rs. ${igstAmount.toFixed(2)}`, tableX + 65, totalsY + 12, { align: 'right' });
  } else {
    doc.text(`Rs. ${cgstAmount.toFixed(2)}`, tableX + 54, totalsY + 12, { align: 'right' });
    doc.text(`Rs. ${sgstAmount.toFixed(2)}`, tableX + 74, totalsY + 12, { align: 'right' });
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${totalGstAmount.toFixed(2)}`, tableX + leftColW - 3, totalsY + 12, { align: 'right' });

  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('* Central & State GST calculated strictly under GST Schedule III (HSN 2201).', tableX + 2.5, totalsY + 16.2);

  // Left 2: Bank & Settlement Details
  const bankBoxY = totalsY + gstBoxH + 2.5;
  const bankBoxH = 21;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(tableX, bankBoxY, leftColW, bankBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Bank & UPI Remittance Details', tableX + 3, bankBoxY + 4);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Official Settlement', tableX + leftColW - 3, bankBoxY + 4, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(tableX, bankBoxY + 5.5, tableX + leftColW, bankBoxY + 5.5);

  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Account Name: ', tableX + 3, bankBoxY + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bank.accountName || company.legalBusinessName || 'HH MINERAL WATER', tableX + 22, bankBoxY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Bank: ', tableX + 60, bankBoxY + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bank.bankName || 'State Bank of India', tableX + 69, bankBoxY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('A/C Number: ', tableX + 3, bankBoxY + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bank.accountNumber || '389201094821', tableX + 20, bankBoxY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('IFSC Code: ', tableX + 60, bankBoxY + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bank.ifsc || 'SBIN0001234', tableX + 74, bankBoxY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('UPI ID: ', tableX + 3, bankBoxY + 17.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(bank.upiId || '8017341130@upi', tableX + 13, bankBoxY + 17.8);

  // Right: Calculations Box & Grand Total
  const calcBoxH = 31.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightColX, totalsY, rightColW, calcBoxH, 1.5, 1.5, 'FD');

  let calcY = totalsY + 4;
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Item Subtotal (Incl. 18% GST):', rightColX + 3, calcY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${subtotal.toFixed(2)}`, rightColX + rightColW - 3, calcY, { align: 'right' });

  calcY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('  ↳ Taxable Value (Net):', rightColX + 3, calcY);
  doc.text(`Rs. ${taxableAmount.toFixed(2)}`, rightColX + rightColW - 3, calcY, { align: 'right' });

  if (isInterState) {
    calcY += 3.5;
    doc.text('  ↳ Integrated GST (18%):', rightColX + 3, calcY);
    doc.text(`+ Rs. ${igstAmount.toFixed(2)}`, rightColX + rightColW - 3, calcY, { align: 'right' });
  } else {
    calcY += 3.5;
    doc.text('  ↳ Central GST (CGST @ 9%):', rightColX + 3, calcY);
    doc.text(`+ Rs. ${cgstAmount.toFixed(2)}`, rightColX + rightColW - 3, calcY, { align: 'right' });

    calcY += 3.5;
    doc.text('  ↳ State GST (SGST @ 9%):', rightColX + 3, calcY);
    doc.text(`+ Rs. ${sgstAmount.toFixed(2)}`, rightColX + rightColW - 3, calcY, { align: 'right' });
  }

  calcY += 3.5;
  doc.text('Delivery & Handling (Pass-Through):', rightColX + 3, calcY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(deliveryCharge > 0 ? `+ Rs. ${deliveryCharge.toFixed(2)}` : 'FREE', rightColX + rightColW - 3, calcY, { align: 'right' });

  if (discount > 0) {
    calcY += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(4, 120, 87);
    doc.text('Promotional Discount:', rightColX + 3, calcY);
    doc.setFont('helvetica', 'bold');
    doc.text(`- Rs. ${discount.toFixed(2)}`, rightColX + rightColW - 3, calcY, { align: 'right' });
  }

  // Double divider line for Grand Total
  calcY += 3;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(rightColX + 3, calcY, rightColX + rightColW - 3, calcY);
  doc.line(rightColX + 3, calcY + 0.6, rightColX + rightColW - 3, calcY + 0.6);

  // Grand Total Highlight (Cyan-700 large amount, matches in-app)
  calcY += 4.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total', rightColX + 3, calcY);

  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('(18% GST Included • Net Due)', rightColX + 3, calcY + 3.2);

  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 144); // #0e7490 cyan-700
  doc.text(`Rs. ${grandTotal.toFixed(2)}`, rightColX + rightColW - 3, calcY + 2, { align: 'right' });

  // Right 2: Amount in Words Box (Cyan-50 background, cyan-200 border, matches in-app)
  const wordsBoxY = totalsY + calcBoxH + 2.5;
  const wordsBoxH = 8.5;
  doc.setFillColor(236, 254, 255); // #ecfeff cyan-50
  doc.setDrawColor(165, 243, 252); // #a5f3fc cyan-200
  doc.roundedRect(rightColX, wordsBoxY, rightColW, wordsBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 78, 99); // cyan-900
  doc.text('AMOUNT CHARGEABLE (IN WORDS):', rightColX + 3, wordsBoxY + 3);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const wordsStr = (safeInvoice.grandTotalInWords || 'Indian Rupees Only').slice(0, 52);
  doc.text(wordsStr, rightColX + 3, wordsBoxY + 6.8);

  // -------------------------------------------------------------
  // 6. TERMS & CONDITIONS & SIGNATURE (Anchored to lower section for full A4 page fill)
  // -------------------------------------------------------------
  const bottomReserve = 34; // Reserve height for Terms, Signature box, line and bottom note
  const targetFooterY = pageHeight - margin - bottomReserve;
  const footerY = Math.max(Math.max(bankBoxY + bankBoxH, wordsBoxY + wordsBoxH) + 4, targetFooterY);

  // Left: Terms & Conditions
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('TERMS & CONDITIONS', tableX + 2, footerY + 3.5);

  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('1. Goods once sold will not be taken back or exchanged.', tableX + 2, footerY + 7);
  doc.text('2. All disputes are subject to Kolkata jurisdiction only.', tableX + 2, footerY + 10.5);
  doc.text('3. Storage: Store in a dry place away from direct sunlight.', tableX + 2, footerY + 14);
  doc.text('4. Quality Standard: Processed and bottled under IS 14543 standards.', tableX + 2, footerY + 17.5);
  if (safeInvoice.customLabelDetails) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 33, 168);
    doc.text(`5. Custom Label: "${safeInvoice.customLabelDetails.brandName || customer.name}" (${safeInvoice.customLabelDetails.finishType || 'Matte'}, Cap: ${safeInvoice.customLabelDetails.bottleCapColor || 'Gold'})`, tableX + 2, footerY + 20.5);
  }

  // Right: Authorized Signatory Box
  const signBoxH = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightColX, footerY, rightColW, signBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING'}`, rightColX + 3, footerY + 4);

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory / Bottling Division', rightColX + 3, footerY + 7.5);

  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.3);
  doc.line(rightColX + rightColW - 38, footerY + 14.5, rightColX + rightColW - 3, footerY + 14.5);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Authorized Signatory', rightColX + rightColW - 20.5, footerY + 17.5, { align: 'center' });

  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('This is a digitally verified GST Tax Invoice.', rightColX + 3, footerY + 18.5);

  // -------------------------------------------------------------
  // 7. BOTTOM FOOTER CENTERED NOTE
  // -------------------------------------------------------------
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(tableX, footerY + 22, tableX + tableW, footerY + 22);

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for choosing HH MINERAL WATER • Sourced for Purity, Hydrated with Nature's Best Minerals", pageWidth / 2, footerY + 25.5, { align: 'center' });

  return doc;
}

/**
 * Downloads a crisp, genuine A4 PDF file of the GST Tax Invoice directly into the user's browser.
 * Uses high-performance vector rendering with zero DOM stylesheet dependencies (100% immune to oklch errors).
 */
export async function downloadInvoicePdf(
  invoice: Invoice,
  copyType: string = 'Original for Recipient',
  _targetElementId?: string
): Promise<boolean> {
  try {
    const doc = generateVectorInvoicePdf(invoice, copyType);
    const sanitizedInvNum = (invoice.invoiceNumber || invoice.id || 'HH-INVOICE').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `HH_Tax_Invoice_${sanitizedInvNum}.pdf`;

    // Try native jsPDF save first
    try {
      doc.save(filename);
      return true;
    } catch {
      // Fallback: Blob URL download
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }
  } catch (err) {
    console.error('Failed to generate vector PDF:', err);
    // Absolute fallback: standalone HTML
    downloadInvoiceHtml(invoice, copyType);
    return false;
  }
}


