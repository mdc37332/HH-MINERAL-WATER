import jsPDF from 'jspdf';
import { AdminSettings, Order } from '../types';
import {
  buildOrderDispatchQrPayload,
  createQrMatrix,
  getOrderDispatchCode,
} from './dispatchQr';

interface ProductAggregateRow {
  key: string;
  productName: string;
  size: string;
  isCustomDesign: boolean;
  totalQuantity: number;
  orderCount: number;
}

/**
 * Strips characters outside Latin-1 printable range so built-in jsPDF Helvetica renders cleanly.
 */
function sanitizePdfText(value: unknown, fallback = '-'): string {
  const str = String(value ?? '').trim();
  if (!str) return fallback;
  return str
    .replace(/₹/g, 'Rs. ')
    .replace(/[•·]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

function getOrderUnitsTotal(order: Order): number {
  return (order.items || []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
}

function formatPdfDateTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '-';
  const datePart = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

function getDeliveryAddressLine(order: Order): string {
  if (order.deliveryType === 'self_pickup') {
    const slot = order.pickupSlot ? `Slot: ${order.pickupSlot}` : 'Factory Dispatch Counter';
    return `FACTORY SELF PICKUP - ${slot}`;
  }
  const parts = [
    order.customer?.address,
    order.customer?.city,
    order.customer?.pincode ? `PIN ${order.customer.pincode}` : '',
  ]
    .map(p => (p || '').trim())
    .filter(Boolean);

  if (parts.length === 0) return 'Address on file';
  const dist =
    typeof order.deliveryDistanceKm === 'number' && order.deliveryDistanceKm > 0
      ? ` (${order.deliveryDistanceKm.toFixed(1)} km)`
      : '';
  return `${parts.join(', ')}${dist}`;
}

function buildProductTotals(orders: Order[]): ProductAggregateRow[] {
  const map = new Map<string, ProductAggregateRow>();

  for (const order of orders) {
    const seenInOrder = new Set<string>();
    for (const item of order.items || []) {
      const legacyItem = item as typeof item & { productName?: string; size?: string };
      const productName = sanitizePdfText(item?.product?.name || legacyItem.productName || 'HH Mineral Water');
      const size = sanitizePdfText(item?.product?.size || legacyItem.size || '500ml');
      const isCustomDesign = Boolean(item?.isCustomDesign);
      const qty = Math.max(0, Number(item?.quantity) || 0);
      if (qty <= 0) continue;

      const key = `${productName.toLowerCase()}__${size.toLowerCase()}__${isCustomDesign ? 'custom' : 'std'}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += qty;
        if (!seenInOrder.has(key)) {
          existing.orderCount += 1;
          seenInOrder.add(key);
        }
      } else {
        map.set(key, {
          key,
          productName,
          size,
          isCustomDesign,
          totalQuantity: qty,
          orderCount: 1,
        });
        seenInOrder.add(key);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.totalQuantity !== a.totalQuantity) return b.totalQuantity - a.totalQuantity;
    return a.productName.localeCompare(b.productName);
  });
}

function drawVectorQr(
  doc: jsPDF,
  payload: string,
  boxX: number,
  boxY: number,
  boxSize: number
): void {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(boxX, boxY, boxSize, boxSize, 'FD');

  const matrix = createQrMatrix(payload);
  const quietMm = 1.1;
  const modSize = (boxSize - quietMm * 2) / matrix.size;
  doc.setFillColor(15, 23, 42);
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.get(r, c)) {
        doc.rect(
          boxX + quietMm + c * modSize,
          boxY + quietMm + r * modSize,
          modSize + 0.02,
          modSize + 0.02,
          'F'
        );
      }
    }
  }
}

/**
 * Generates a consolidated factory-floor A4 PDF list for all orders in a status column,
 * including aggregated product totals, customer delivery addresses, and individual QR codes.
 */
export function generateDispatchBatchPdf(
  columnKey: string,
  columnTitle: string,
  orders: Order[],
  settings?: AdminSettings
): jsPDF {
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
  const bottomLimit = pageHeight - 15; // Leave space for page footer

  const safeColumnTitle = sanitizePdfText(columnTitle, 'Dispatch').toUpperCase();
  const generatedLabel = formatPdfDateTime(new Date().toISOString());
  const plantPhone = sanitizePdfText(settings?.ownerWhatsApp || '+91 8017341130');

  const totalOrders = orders.length;
  const totalUnits = orders.reduce((sum, ord) => sum + getOrderUnitsTotal(ord), 0);
  const totalValue = orders.reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0);
  const productTotals = buildProductTotals(orders);

  const drawContinuationHeader = (sectionLabel: string): number => {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, margin, contentWidth, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `HH MINERAL WATER - FACTORY BATCH MANIFEST [${safeColumnTitle}]`,
      margin + 3,
      margin + 6.3
    );
    doc.setFontSize(7.5);
    doc.setTextColor(250, 204, 21);
    doc.text(sectionLabel, pageWidth - margin - 3, margin + 6.3, { align: 'right' });
    return margin + 13.5;
  };

  // -------------------------------------------------------------
  // 1. TOP FACTORY HEADER BANNER (Page 1)
  // -------------------------------------------------------------
  let y = margin;
  doc.setFillColor(15, 23, 42); // #0f172a slate-900
  doc.roundedRect(margin, y, contentWidth, 21, 2, 2, 'F');

  // HH badge
  doc.setFillColor(197, 160, 89); // gold accent
  doc.roundedRect(margin + 3.5, y + 3.5, 13, 14, 1.8, 1.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('HH', margin + 10, y + 10.5, { align: 'center' });
  doc.setFontSize(4.5);
  doc.text('WATER', margin + 10, y + 14.5, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text('HH MINERAL WATER', margin + 19.5, y + 8.5);

  doc.setFontSize(8);
  doc.setTextColor(250, 204, 21);
  doc.text(
    `FACTORY FLOOR DISPATCH BATCH SHEET - ${safeColumnTitle} STATUS`,
    margin + 19.5,
    y + 13.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Printed: ${generatedLabel} | Plant Helpline: ${plantPhone}`,
    margin + 19.5,
    y + 18
  );

  // Right status pill
  doc.setFillColor(30, 41, 59);
  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.35);
  doc.roundedRect(pageWidth - margin - 46, y + 4, 42.5, 13, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(203, 213, 225);
  doc.text('BATCH LANE', pageWidth - margin - 24.75, y + 8.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(250, 204, 21);
  doc.text(safeColumnTitle, pageWidth - margin - 24.75, y + 13.8, { align: 'center' });

  y += 24;

  // -------------------------------------------------------------
  // 2. BATCH KPI SUMMARY BAR
  // -------------------------------------------------------------
  const kpiGap = 3;
  const kpiW = (contentWidth - kpiGap * 3) / 4;
  const kpiH = 14;
  const kpis = [
    { label: 'STATUS FILTER', value: safeColumnTitle },
    { label: 'ORDERS IN BATCH', value: `${totalOrders} Order${totalOrders === 1 ? '' : 's'}` },
    { label: 'TOTAL BOTTLE UNITS', value: `${totalUnits.toLocaleString('en-IN')} Units` },
    { label: 'TOTAL BATCH VALUE', value: `Rs. ${Math.round(totalValue).toLocaleString('en-IN')}` },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiW + kpiGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(kx, y, kpiW, kpiH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + 3, y + 5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, kx + 3, y + 10.8);
  });

  y += kpiH + 5;

  // -------------------------------------------------------------
  // 3. CONSOLIDATED PRODUCT TOTALS TABLE
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSOLIDATED PRODUCT TOTALS (FACTORY PICKING SUMMARY)', margin, y);
  y += 2.5;

  const drawProductTableHeader = (startY: number): number => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.rect(margin, startY, contentWidth, 6.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text('#', margin + 4.5, startY + 4.4, { align: 'center' });
    doc.text('PRODUCT / SKU', margin + 12, startY + 4.4);
    doc.text('BOTTLE SIZE', margin + 105, startY + 4.4);
    doc.text('LABEL TYPE', margin + 135, startY + 4.4);
    doc.text('ORDERS', margin + 166, startY + 4.4, { align: 'right' });
    doc.text('TOTAL QTY', pageWidth - margin - 3, startY + 4.4, { align: 'right' });
    return startY + 6.5;
  };

  y = drawProductTableHeader(y);

  if (productTotals.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 7, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No line items found in selected orders.', margin + 4, y + 4.8);
    y += 7;
  } else {
    productTotals.forEach((row, idx) => {
      if (y + 6.5 > bottomLimit) {
        doc.addPage();
        y = drawContinuationHeader('PRODUCT TOTALS (CONT.)');
        y = drawProductTableHeader(y);
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.rect(margin, y, contentWidth, 6.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), margin + 4.5, y + 4.3, { align: 'center' });

      doc.setTextColor(15, 23, 42);
      doc.text(row.productName.slice(0, 48), margin + 12, y + 4.3);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(row.size.slice(0, 16), margin + 105, y + 4.3);

      doc.setFont('helvetica', row.isCustomDesign ? 'bold' : 'normal');
      if (row.isCustomDesign) {
        doc.setTextColor(126, 34, 206);
      } else {
        doc.setTextColor(71, 85, 105);
      }
      doc.text(row.isCustomDesign ? 'Custom Label' : 'Standard HH', margin + 135, y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(String(row.orderCount), margin + 166, y + 4.3, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${row.totalQuantity.toLocaleString('en-IN')} pcs`, pageWidth - margin - 3, y + 4.3, {
        align: 'right',
      });

      y += 6.2;
    });

    // Grand total row
    if (y + 7 > bottomLimit) {
      doc.addPage();
      y = drawContinuationHeader('PRODUCT TOTALS SUMMARY');
    }
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.rect(margin, y, contentWidth, 6.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`GRAND TOTAL (${productTotals.length} SKUs across ${totalOrders} Orders)`, margin + 4, y + 4.6);
    doc.text(`${totalUnits.toLocaleString('en-IN')} Bottles / Units`, pageWidth - margin - 3, y + 4.6, {
      align: 'right',
    });
    y += 11;
  }

  // -------------------------------------------------------------
  // 4. ORDER-BY-ORDER DISPATCH CARDS WITH ADDRESSES & QR CODES
  // -------------------------------------------------------------
  if (y + 18 > bottomLimit) {
    doc.addPage();
    y = drawContinuationHeader('ORDER DISPATCH CARDS');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. INDIVIDUAL ORDER DISPATCH MANIFEST (${totalOrders} ORDERS WITH QR CODES)`, margin, y);
  y += 3;

  orders.forEach((order, orderIdx) => {
    const dispatchCode = getOrderDispatchCode(order);
    const qrPayload = buildOrderDispatchQrPayload(order, dispatchCode);
    const units = getOrderUnitsTotal(order);
    const customerName = sanitizePdfText(order.customer?.name || 'Valued Customer');
    const customerPhone = sanitizePdfText(order.customer?.phone || '-');
    const addressStr = sanitizePdfText(getDeliveryAddressLine(order));
    const itemsSummary = sanitizePdfText(
      (order.items || [])
        .map(it => {
          const legacyIt = it as typeof it & { productName?: string; size?: string };
          const pName = it.product?.name || legacyIt.productName || 'HH Mineral Water';
          const pSize = it.product?.size || legacyIt.size || '500ml';
          const customTag = it.isCustomDesign ? ' [Custom]' : '';
          return `${it.quantity}x ${pName} (${pSize}${customTag})`;
        })
        .join(', '),
      'Standard Packaged Water'
    );
    const customLabelInfo =
      order.isCustomOrder && order.customLabelDetails?.brandName
        ? sanitizePdfText(`Brand: ${order.customLabelDetails.brandName} (${order.customLabelDetails.finishType || 'Matte'})`)
        : '';

    const metaWidth = contentWidth - 36; // 154mm right of QR block
    doc.setFontSize(7.2);
    const addressLines: string[] = doc.splitTextToSize(`Address: ${addressStr}`, metaWidth);
    const itemLines: string[] = doc.splitTextToSize(
      `Items (${units} pcs): ${itemsSummary}${customLabelInfo ? ` | ${customLabelInfo}` : ''}`,
      metaWidth
    );

    const textBlockHeight =
      14 + // Order ID row + Customer row
      addressLines.length * 3.6 +
      itemLines.length * 3.6 +
      3;
    const cardHeight = Math.max(34, textBlockHeight);

    if (y + cardHeight > bottomLimit) {
      doc.addPage();
      y = drawContinuationHeader(`ORDERS MANIFEST (${safeColumnTitle})`);
    }

    // Outer card box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 1.8, 1.8, 'FD');

    // Left QR Sidebar tinted strip
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + 0.3, y + 0.3, 30, cardHeight - 0.6, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 30.3, y, margin + 30.3, y + cardHeight);

    // Vector QR Code (22mm x 22mm)
    const qrSize = 22;
    const qrX = margin + 4.3;
    const qrY = y + 2.5;
    drawVectorQr(doc, qrPayload, qrX, qrY, qrSize);

    // Code string below QR
    doc.setFont('courier', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(15, 23, 42);
    doc.text(dispatchCode.slice(0, 18), margin + 15.2, qrY + qrSize + 3.4, { align: 'center' });

    // Verified vs Pending indicator
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    if (order.dispatchVerifiedAt) {
      doc.setTextColor(4, 120, 87);
      doc.text('QR VERIFIED', margin + 15.2, qrY + qrSize + 6.5, { align: 'center' });
    } else {
      doc.setTextColor(14, 116, 144);
      doc.text('SCAN AT GATE', margin + 15.2, qrY + qrSize + 6.5, { align: 'center' });
    }

    // Right Content Column
    const rx = margin + 33;
    let cy = y + 5;

    // Row 1: #Idx Order ID + Status + Mode + Right Amount
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const idHeading = `#${orderIdx + 1}  ${sanitizePdfText(order.id)}`;
    doc.text(idHeading, rx, cy);

    const statusBadgeText = `[${sanitizePdfText(order.status).toUpperCase()}]  ${
      order.deliveryType === 'self_pickup' ? 'SELF PICKUP' : 'DOORSTEP'
    }${order.isCustomOrder ? '  |  CUSTOM LABEL' : ''}`;
    doc.setFontSize(6.5);
    doc.setTextColor(14, 116, 144);
    doc.text(statusBadgeText, rx + 42, cy);

    // Amount & Payment right aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${Math.round(order.totalAmount || 0).toLocaleString('en-IN')}`, pageWidth - margin - 3, cy, {
      align: 'right',
    });

    cy += 4.3;

    // Row 2: Customer Name & Phone + Date/Payment
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Customer: ${customerName}  |  Ph: ${customerPhone}`, rx, cy);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${sanitizePdfText(order.paymentMethod || 'Prepaid')} (${sanitizePdfText(order.paymentStatus || 'Pending')}) | ${formatPdfDateTime(order.createdAt)}`,
      pageWidth - margin - 3,
      cy,
      { align: 'right' }
    );

    cy += 4.6;

    // Row 3: Delivery Address (wrapped)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.1);
    doc.setTextColor(51, 65, 85);
    addressLines.forEach(line => {
      doc.text(line, rx, cy);
      cy += 3.6;
    });

    // Row 4: Items list (wrapped)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(15, 23, 42);
    itemLines.forEach(line => {
      doc.text(line, rx, cy);
      cy += 3.6;
    });

    y += cardHeight + 3;
  });

  // -------------------------------------------------------------
  // 5. STAMP PAGE NUMBERS & FOOTER ON ALL PAGES
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `HH MINERAL WATER Factory Floor Batch Sheet | Status: ${safeColumnTitle} | ${totalOrders} Orders / ${totalUnits} Units`,
      margin,
      pageHeight - 6.8
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6.8, {
      align: 'right',
    });
  }

  return doc;
}

/**
 * Generates and downloads the consolidated Factory-Floor Dispatch Batch PDF.
 */
export function downloadDispatchBatchPdf(
  columnKey: string,
  columnTitle: string,
  orders: Order[],
  settings?: AdminSettings
): boolean {
  const doc = generateDispatchBatchPdf(columnKey, columnTitle, orders, settings);
  const safeKey = (columnKey || 'batch').replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `HH_Dispatch_Batch_${safeKey}_${dateSlug}.pdf`;

  try {
    doc.save(filename);
    return true;
  } catch {
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
}
