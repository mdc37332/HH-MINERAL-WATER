import { Invoice } from '../types';
import { getFinancialYear } from './invoiceGenerator';

export interface InvoiceValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates that an invoice contains all required fields before printing.
 * Fulfills Requirement 11: Data Validation before printing.
 */
export function validateInvoiceForPrinting(
  invoice: Invoice | null | undefined
): InvoiceValidationResult {
  if (!invoice) {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because required invoice information is missing. Please verify the invoice data and try again.'
    };
  }

  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because invoice number is missing. Please verify the invoice data and try again.'
    };
  }

  if (!invoice.customerDetails || (!invoice.customerDetails.name && !invoice.customerDetails.phone)) {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because customer details are missing. Please verify the invoice data and try again.'
    };
  }

  if (!invoice.items || invoice.items.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because product items are missing. Please verify the invoice data and try again.'
    };
  }

  // Verify item snapshot values
  const hasInvalidItem = invoice.items.some(
    item => !item.productName || item.quantity == null || item.quantity <= 0 || item.unitPrice == null
  );
  if (hasInvalidItem) {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because product line items contain incomplete information. Please verify the invoice data and try again.'
    };
  }

  // Verify grand total exists and is a valid non-negative number
  if (invoice.grandTotal == null || isNaN(Number(invoice.grandTotal)) || Number(invoice.grandTotal) < 0) {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because invoice totals are invalid. Please verify the invoice data and try again.'
    };
  }

  // Verify business GST details
  if (!invoice.companyDetails || (!invoice.companyDetails.legalBusinessName && !invoice.companyDetails.tradeName)) {
    return {
      isValid: false,
      errorMessage: 'Unable to print invoice because business details are missing. Please verify the business GST configuration and try again.'
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
  const safeInvoice = invoice || ({} as Partial<Invoice>);
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
      font-size: 11px;
      line-height: 1.45;
      padding: 20px;
    }

    .print-actions-bar {
      max-width: 210mm;
      margin: 0 auto 16px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .print-btn {
      background: #0891b2;
      color: white;
      border: none;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
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
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
    }

    .close-btn:hover {
      background: #1e293b;
      color: #ffffff;
    }

    .invoice-page {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 18mm 16mm;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #cbd5e1;
    }

    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .print-actions-bar {
        display: none !important;
      }

      .invoice-page {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }

      @page {
        size: A4 portrait;
        margin: 10mm 12mm 10mm 12mm;
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
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      width: 48px;
      height: 48px;
      background-color: #0891b2;
      color: #ffffff;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: -0.5px;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(8, 145, 178, 0.3);
    }

    .logo-badge span {
      font-size: 7px;
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
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .card-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #ffffff;
    }

    .card-header {
      font-weight: 800;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      page-break-inside: auto;
    }

    thead th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border: 1px solid #0f172a;
    }

    .table-container {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 14px;
    }

    .totals-grid {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .subtotal-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 11.5px;
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
      padding-top: 8px;
      margin-top: 6px;
    }

    .grand-total-val {
      font-size: 18px;
      font-weight: 900;
      color: #0e7490;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 12px;
    }

    .signatory-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f8fafc;
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100px;
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
        <div class="card-box" style="margin-bottom: 10px; padding: 6px 10px;">
          <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 4px;">
            GST Tax Analysis Summary (HSN 2201 - Packaged Drinking Water)
          </div>
          <table>
            <thead>
              <tr style="background: #e2e8f0; color: #334155; font-size: 9px;">
                <th style="padding: 4px 6px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: left;">HSN/SAC</th>
                <th style="padding: 4px 6px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">Taxable Val</th>
                ${isInterState ? `
                <th style="padding: 4px 6px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">IGST (18%)</th>
                ` : `
                <th style="padding: 4px 6px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">CGST (9%)</th>
                <th style="padding: 4px 6px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right;">SGST (9%)</th>
                `}
                <th style="padding: 4px 6px; background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-family: monospace;">2201</td>
                <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right;">₹${taxableAmount.toFixed(2)}</td>
                ${isInterState ? `
                <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right;">₹${igstAmount.toFixed(2)}</td>
                ` : `
                <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right;">₹${cgstAmount.toFixed(2)}</td>
                <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right;">₹${sgstAmount.toFixed(2)}</td>
                `}
                <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #0f172a;">₹${totalGstAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card-box" style="background: #f8fafc; padding: 8px 12px; font-size: 10px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Bank & UPI Remittance Details</span>
            <span style="color: #64748b; font-weight: normal;">Official Settlement</span>
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
        <div class="card-box" style="background: #f8fafc; padding: 12px 14px;">
          <div class="subtotal-row">
            <span>Total Taxable Amount:</span>
            <strong>₹${taxableAmount.toFixed(2)}</strong>
          </div>
          ${isInterState ? `
          <div class="subtotal-row">
            <span>Integrated GST (IGST @ 18%):</span>
            <strong>+ ₹${igstAmount.toFixed(2)}</strong>
          </div>
          ` : `
          <div class="subtotal-row">
            <span>Central GST (CGST @ 9%):</span>
            <strong>+ ₹${cgstAmount.toFixed(2)}</strong>
          </div>
          <div class="subtotal-row">
            <span>State GST (SGST @ 9%):</span>
            <strong>+ ₹${sgstAmount.toFixed(2)}</strong>
          </div>
          `}
          <div class="subtotal-row">
            <span>Delivery & Handling:</span>
            <strong>${deliveryCharge > 0 ? `+ ₹${deliveryCharge.toFixed(2)}` : 'FREE'}</strong>
          </div>
          ${discount > 0 ? `
          <div class="subtotal-row" style="color: #059669;">
            <span>Promotional Discount:</span>
            <strong>- ₹${discount.toFixed(2)}</strong>
          </div>` : ''}

          <div class="grand-total-row">
            <div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a;">Grand Total</div>
              <div style="font-size: 9.5px; color: #64748b;">(Inclusive of all Taxes)</div>
            </div>
            <div class="grand-total-val">₹${grandTotal.toFixed(2)}</div>
          </div>
        </div>

        <div class="card-box" style="background: #ecfeff; border-color: #a5f3fc; margin-top: 8px; padding: 8px 12px;">
          <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #0e7490;">Amount in Words:</div>
          <div style="font-weight: 800; font-style: italic; color: #0f172a; font-size: 11px; margin-top: 2px;">
            ${invoice.grandTotalInWords || 'Indian Rupees Only'}
          </div>
        </div>
      </div>
    </div>

    <!-- Terms & Signature Footer -->
    <div class="footer-grid avoid-break">
      <div>
        <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #334155; margin-bottom: 4px;">Terms & Conditions</div>
        <div style="font-size: 9.5px; color: #64748b; line-height: 1.5; white-space: pre-line;">
          ${company.invoiceTerms || '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to local jurisdiction.\n3. Storage: Keep in a cool, dry place away from direct sunlight.'}
        </div>
      </div>

      <div class="signatory-box">
        <div>
          <div style="font-weight: 800; color: #0f172a; font-size: 11px;">For ${company.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING'}</div>
          <div style="font-size: 9.5px; color: #64748b;">Authorized Signatory / Bottling Division</div>
        </div>
        <div style="margin-top: 30px;">
          <div style="display: inline-block; border-top: 1px solid #475569; padding-top: 4px; font-weight: 700; color: #334155; padding-left: 20px; padding-right: 20px;">
            Authorized Signatory
          </div>
          <div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px;">This is a digitally verified GST Tax Invoice.</div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 16px; font-size: 9.5px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 8px;" class="avoid-break">
      Thank you for choosing HH MINERAL WATER • Sourced for Purity, Hydrated with Nature's Best Minerals
    </div>
  </div>

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
    return true;
  }

  const html = generatePrintableInvoiceHtml(invoice, copyType);

  return new Promise((resolve) => {
    try {
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
    // Generous fallback timeout (30 seconds) so slower print dialogs do not lose styles mid-render
    setTimeout(removeClass, 30000);
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
