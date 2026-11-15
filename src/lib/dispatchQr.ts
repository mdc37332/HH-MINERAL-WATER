import QRCode from 'qrcode';
import { Invoice, Order } from '../types';

const DISPATCH_QR_RECORDS_STORAGE_KEY = 'hh_dispatch_qr_records_v1';

interface CachedDispatchQrRecord {
  dispatchQrCode?: string;
  dispatchQrGeneratedAt?: string;
  dispatchVerifiedAt?: string;
  dispatchVerifiedBy?: string;
}

/**
 * Safely reads cached dispatch QR verification metadata from localStorage
 * (used when only an Invoice is passed without a hydrated Order reference).
 */
export function getCachedDispatchQrRecord(orderId?: string): CachedDispatchQrRecord | undefined {
  if (!orderId || typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(DISPATCH_QR_RECORDS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed[orderId]) {
      return parsed[orderId] as CachedDispatchQrRecord;
    }
  } catch {
    // ignore storage errors
  }
  return undefined;
}

/**
 * Deterministic 32-bit FNV-1a hash helper (browser + SSR safe)
 */
function fnv1aHash(input: string, seed = 0x811c9dc5): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

/**
 * Computes the deterministic unique dispatch verification code from raw fields.
 * Format: HH-DSP-<ORDER_SUFFIX>-<SIG6>
 */
export function computeDeterministicDispatchCodeFromFields(
  orderId: string,
  phone: string = '',
  totalAmount: number = 0,
  dateIso: string = ''
): string {
  const cleanId = (orderId || 'ORDER').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const suffix = cleanId.slice(-5).padStart(5, '0');
  const rawSignatureInput = [
    orderId || '',
    phone || '',
    String(Math.round(totalAmount || 0)),
    dateIso ? dateIso.slice(0, 10) : '',
  ].join('|');
  const sig = fnv1aHash(rawSignatureInput, 0x9e3779b1);
  return `HH-DSP-${suffix}-${sig}`;
}

/**
 * Computes the deterministic unique dispatch verification code for an order.
 * Format: HH-DSP-<ORDER_SUFFIX>-<SIG6>
 */
export function computeDeterministicDispatchCode(order: Order): string {
  return computeDeterministicDispatchCodeFromFields(
    order.id || '',
    order.customer?.phone || '',
    order.totalAmount || 0,
    order.createdAt || ''
  );
}

/**
 * Returns the active unique dispatch scan code linked to an order.
 * Prefers persisted `order.dispatchQrCode` if present; otherwise computes deterministic code.
 */
export function getOrderDispatchCode(order: Order): string {
  if (order.dispatchQrCode && order.dispatchQrCode.trim().length > 0) {
    return order.dispatchQrCode.trim().toUpperCase();
  }
  return computeDeterministicDispatchCode(order);
}

/**
 * Generates a fresh rotated unique dispatch code (e.g., if a physical dispatch slip is reissued).
 */
export function createRotatedDispatchCode(order: Order): string {
  const cleanId = (order.id || 'ORDER').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const suffix = cleanId.slice(-5).padStart(5, '0');
  const nonce = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'X');
  const sig = fnv1aHash(`${order.id}|${nonce}|${Date.now()}`, 0x85ebca6b).slice(0, 4);
  return `HH-DSP-${suffix}-${nonce}${sig}`;
}

/**
 * Builds the scannable QR payload string linked to an order.
 * Encodes a clean verification URL so both smartphone cameras and factory counter scanners resolve instantly.
 */
export function buildQrVerificationPayloadUrl(orderId: string, code: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://hhmineralwater.com';
  return `${origin}/?dispatchVerify=${encodeURIComponent(orderId)}&code=${encodeURIComponent(code.trim())}`;
}

export function buildOrderDispatchQrPayload(order: Order, overrideCode?: string): string {
  const code = (overrideCode || getOrderDispatchCode(order)).trim();
  return buildQrVerificationPayloadUrl(order.id, code);
}

export interface InvoiceDispatchQrInfo {
  orderId: string;
  invoiceNumber: string;
  dispatchCode: string;
  payload: string;
  qrGeneratedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  deliveryType?: Order['deliveryType'];
  orderStatus?: Order['status'];
}

/**
 * Resolves the Dispatch Counter QR metadata for a GST Invoice Paper.
 * Prefers the live hydrated `linkedOrder`, then falls back to cached QR records,
 * and finally falls back deterministically from invoice metadata.
 */
export function getInvoiceDispatchQrInfo(
  invoice: Invoice,
  linkedOrder?: Order
): InvoiceDispatchQrInfo {
  const orderId = linkedOrder?.id || invoice.orderId || invoice.id || 'HH-ORD-DIRECT';
  const cached = getCachedDispatchQrRecord(orderId);

  const dispatchCode = linkedOrder
    ? getOrderDispatchCode(linkedOrder)
    : (cached?.dispatchQrCode
        ? cached.dispatchQrCode.trim().toUpperCase()
        : computeDeterministicDispatchCodeFromFields(
            orderId,
            invoice.customerDetails?.phone || '',
            invoice.grandTotal || 0,
            invoice.createdAt || invoice.invoiceDate || ''
          ));

  const verifiedAt = linkedOrder?.dispatchVerifiedAt || cached?.dispatchVerifiedAt;
  const verifiedBy = linkedOrder?.dispatchVerifiedBy || cached?.dispatchVerifiedBy;
  const qrGeneratedAt = linkedOrder?.dispatchQrGeneratedAt || cached?.dispatchQrGeneratedAt;

  return {
    orderId,
    invoiceNumber: invoice.invoiceNumber || '',
    dispatchCode,
    payload: buildQrVerificationPayloadUrl(orderId, dispatchCode),
    qrGeneratedAt,
    verifiedAt,
    verifiedBy,
    deliveryType: linkedOrder?.deliveryType,
    orderStatus: linkedOrder?.status,
  };
}

export interface ParsedDispatchScan {
  orderId?: string;
  code?: string;
  raw: string;
}

/**
 * Parses raw scanned input from a handheld 2D QR scanner, camera scanner, or manual code paste.
 * Supports:
 * 1. Full verification URL (`https://.../?dispatchVerify=HH-ORD-...&code=HH-DSP-...`)
 * 2. JSON payload (`{"orderId":"HH-ORD-...","code":"HH-DSP-..."}`)
 * 3. Direct dispatch code (`HH-DSP-...`)
 * 4. Pipe-separated (`HH-ORD-123|HH-DSP-...`)
 * 5. Direct Order ID (`HH-ORD-...`), GST Invoice Number (`HH/2026/...`), or Phone
 */
export function parseDispatchScanInput(rawInput: string): ParsedDispatchScan {
  const raw = (rawInput || '').trim();
  if (!raw) return { raw: '' };

  // 1. JSON format
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        orderId: typeof parsed.orderId === 'string' ? parsed.orderId.trim() : typeof parsed.id === 'string' ? parsed.id.trim() : undefined,
        code: typeof parsed.code === 'string' ? parsed.code.trim().toUpperCase() : undefined,
        raw,
      };
    } catch {
      // fall through
    }
  }

  // 2. URL or query string format
  if (raw.includes('dispatchVerify=') || raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const urlObj = new URL(raw.startsWith('http') ? raw : `https://local.hh/${raw.replace(/^\?/, '?')}`);
      const orderId = urlObj.searchParams.get('dispatchVerify')?.trim() || undefined;
      const code = urlObj.searchParams.get('code')?.trim().toUpperCase() || undefined;
      if (orderId || code) {
        return { orderId, code, raw };
      }
    } catch {
      const ordMatch = raw.match(/dispatchVerify=([^&\s]+)/i);
      const codeMatch = raw.match(/code=([^&\s]+)/i);
      if (ordMatch || codeMatch) {
        return {
          orderId: ordMatch ? decodeURIComponent(ordMatch[1]).trim() : undefined,
          code: codeMatch ? decodeURIComponent(codeMatch[1]).trim().toUpperCase() : undefined,
          raw,
        };
      }
    }
  }

  // 3. Dispatch token directly (`HH-DSP-...`)
  const upper = raw.toUpperCase();
  if (upper.startsWith('HH-DSP-')) {
    return { code: upper, raw };
  }

  // 4. Pipe-separated (`HH-ORD-123|HH-DSP-...`)
  if (raw.includes('|')) {
    const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
    const codePart = parts.find(p => p.toUpperCase().startsWith('HH-DSP-'));
    const ordPart = parts.find(p => !p.toUpperCase().startsWith('HH-DSP-'));
    return { orderId: ordPart, code: codePart?.toUpperCase(), raw };
  }

  // 5. Fallback: treat as Order ID, Invoice Number, or Customer Phone lookup string
  return { orderId: raw, raw };
}

export interface DispatchVerificationMatch {
  matched: boolean;
  order?: Order;
  matchedInvoice?: Invoice;
  expectedCode?: string;
  providedCode?: string;
  signatureValid: boolean;
  reason?: string;
}

/**
 * Matches a scanned QR payload, token, Order ID, GST Invoice Number, or Phone against live orders.
 */
export function verifyOrderAgainstScan(
  orders: Order[],
  rawInput: string,
  invoices?: Invoice[]
): DispatchVerificationMatch {
  const parsed = parseDispatchScanInput(rawInput);
  if (!parsed.raw) {
    return { matched: false, signatureValid: false, reason: 'Please scan or enter an Order ID, Invoice No., or Dispatch QR Code.' };
  }

  let matchedOrder: Order | undefined;
  let matchedInvoice: Invoice | undefined;

  if (parsed.orderId) {
    const targetLower = parsed.orderId.toLowerCase();
    matchedOrder =
      orders.find(o => o.id.toLowerCase() === targetLower) ||
      orders.find(o => o.id.toLowerCase().endsWith(targetLower) && targetLower.length >= 4);

    // Match against GST Invoice Number if provided (e.g., HH/2026-27/000001)
    if (!matchedOrder && invoices && invoices.length > 0) {
      matchedInvoice =
        invoices.find(inv => (inv.invoiceNumber || '').toLowerCase() === targetLower) ||
        invoices.find(
          inv =>
            targetLower.length >= 5 &&
            (inv.invoiceNumber || '').toLowerCase().includes(targetLower)
        );
      if (matchedInvoice?.orderId) {
        matchedOrder = orders.find(o => o.id === matchedInvoice!.orderId);
      }
    }

    // Match against exact 10-digit customer phone if typed in scanner
    if (!matchedOrder) {
      const digitsOnly = parsed.orderId.replace(/\D/g, '');
      if (digitsOnly.length >= 10) {
        const last10 = digitsOnly.slice(-10);
        matchedOrder = orders.find(o => (o.customer?.phone || '').replace(/\D/g, '').endsWith(last10));
      }
    }
  }

  if (!matchedOrder && parsed.code) {
    matchedOrder = orders.find(o => {
      const activeCode = getOrderDispatchCode(o).toUpperCase();
      const deterministicCode = computeDeterministicDispatchCode(o).toUpperCase();
      return activeCode === parsed.code || deterministicCode === parsed.code;
    });
  }

  if (!matchedOrder) {
    return {
      matched: false,
      signatureValid: false,
      providedCode: parsed.code,
      reason: `No active order found matching "${parsed.orderId || parsed.code || parsed.raw}".`,
    };
  }

  if (!matchedInvoice && invoices && invoices.length > 0) {
    matchedInvoice = invoices.find(inv => inv.orderId === matchedOrder!.id);
  }

  const expectedCode = getOrderDispatchCode(matchedOrder).toUpperCase();
  const deterministicCode = computeDeterministicDispatchCode(matchedOrder).toUpperCase();

  if (parsed.code) {
    const isCodeValid =
      parsed.code === expectedCode ||
      (!matchedOrder.dispatchQrCode && parsed.code === deterministicCode);
    if (!isCodeValid) {
      return {
        matched: true,
        order: matchedOrder,
        matchedInvoice,
        expectedCode,
        providedCode: parsed.code,
        signatureValid: false,
        reason: `Verification token mismatch! Expected ${expectedCode}, scanned ${parsed.code}.`,
      };
    }
  }

  return {
    matched: true,
    order: matchedOrder,
    matchedInvoice,
    expectedCode,
    providedCode: parsed.code || expectedCode,
    signatureValid: true,
  };
}

/**
 * Creates a synchronous QR module matrix (browser + jsPDF friendly, zero async wait).
 */
export function createQrMatrix(payload: string): { size: number; get(row: number, col: number): number } {
  const qr = QRCode.create(payload || 'https://hhmineralwater.com', {
    errorCorrectionLevel: 'H',
  });
  return {
    size: qr.modules.size,
    get: (row: number, col: number) => qr.modules.get(row, col),
  };
}

/**
 * Synchronously builds a crisp compact inline SVG string for GST Invoice Paper & Delivery Challan printouts.
 */
export function buildQrSvgSync(
  payload: string,
  sizePx = 88,
  options?: { darkColor?: string; lightColor?: string; quietZone?: number }
): string {
  const matrix = createQrMatrix(payload);
  const quiet = options?.quietZone ?? 2;
  const total = matrix.size + quiet * 2;
  const dark = options?.darkColor || '#0f172a';
  const light = options?.lightColor || '#ffffff';

  const parts: string[] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.get(r, c)) {
        parts.push(`M${c + quiet},${r + quiet}h1v1h-1z`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Dispatch Counter Verification QR"><rect width="${total}" height="${total}" fill="${light}"/><path d="${parts.join('')}" fill="${dark}"/></svg>`;
}

export function buildOrderQrSvgSync(order: Order, sizePx = 88, overrideCode?: string): string {
  return buildQrSvgSync(buildOrderDispatchQrPayload(order, overrideCode), sizePx);
}

export function buildInvoiceQrSvgSync(invoice: Invoice, linkedOrder?: Order, sizePx = 88): string {
  const info = getInvoiceDispatchQrInfo(invoice, linkedOrder);
  return buildQrSvgSync(info.payload, sizePx);
}

/**
 * Generates a high-contrast PNG data URL QR code for an order (ECC Level H for factory labels).
 */
export async function generateOrderQrDataUrl(
  order: Order,
  options?: { width?: number; darkColor?: string; lightColor?: string; overrideCode?: string }
): Promise<string> {
  const payload = buildOrderDispatchQrPayload(order, options?.overrideCode);
  return QRCode.toDataURL(payload, {
    width: options?.width || 320,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: options?.darkColor || '#0f172a',
      light: options?.lightColor || '#ffffff',
    },
  });
}

/**
 * Generates crisp inline SVG markup for thermal/A4 delivery challans & dispatch labels.
 */
export async function generateOrderQrSvg(order: Order, width = 140, overrideCode?: string): Promise<string> {
  const payload = buildOrderDispatchQrPayload(order, overrideCode);
  return QRCode.toString(payload, {
    type: 'svg',
    width,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Creates a downloadable high-resolution Dispatch Verification Pass PNG card (with QR + Order details)
 * so counter staff or dispatch printers can print/share a complete label image.
 */
export async function renderDispatchPassCardPng(order: Order, storeName = 'HH MINERAL WATER'): Promise<string> {
  const qrDataUrl = await generateOrderQrDataUrl(order, { width: 380 });
  const code = getOrderDispatchCode(order);
  const totalBottles = (order.items || []).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 820;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qrDataUrl;

  // Card background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dark header bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, 118);

  // Gold accent strip
  ctx.fillStyle = '#C5A059';
  ctx.fillRect(0, 114, canvas.width, 6);

  // Brand title
  ctx.fillStyle = '#DFC283';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(storeName.toUpperCase(), canvas.width / 2, 52);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('FACTORY DISPATCH COUNTER — VERIFICATION QR', canvas.width / 2, 88);

  // Draw QR image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  // QR border frame
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(120, 145, 400, 400);
  ctx.drawImage(img, 130, 155, 380, 380);

  // Scan code badge
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(60, 565, 520, 52);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 565, 520, 52);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, canvas.width / 2, 599);

  // Order Metadata
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(`ORDER ID: ${order.id}`, 60, 662);
  ctx.fillText(`BOTTLES: ${totalBottles} Units • ₹${order.totalAmount}`, 60, 694);
  ctx.fillText(`CUSTOMER: ${(order.customer?.name || 'Customer').slice(0, 32)} (${order.customer?.phone || '-'})`, 60, 726);
  ctx.fillText(
    `MODE: ${order.deliveryType === 'self_pickup' ? 'SELF PICKUP COUNTER' : 'DOORSTEP DISPATCH'} • ${order.paymentStatus}`,
    60,
    758
  );

  ctx.fillStyle = '#64748b';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Generated: ${new Date().toLocaleString('en-IN')}`, 60, 794);

  return canvas.toDataURL('image/png');
}

/**
 * Generates clean, printable HTML for one or multiple Dispatch QR Labels (A4 grid or thermal ready).
 */
export function openPrintableDispatchQrSheet(
  orders: Order[],
  qrDataUrls: Record<string, string>,
  storeName = 'HH MINERAL WATER'
): void {
  if (typeof window === 'undefined' || orders.length === 0) return;

  const cardsHtml = orders
    .map(ord => {
      const code = getOrderDispatchCode(ord);
      const totalBottles = (ord.items || []).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
      const qrImg = qrDataUrls[ord.id] || '';
      const modeLabel = ord.deliveryType === 'self_pickup' ? 'SELF PICKUP' : 'DOORSTEP DELIVERY';
      const itemSummary = (ord.items || [])
        .map(it => `${it.product?.size || ''} x${it.quantity}`)
        .join(', ');

      return `
        <div class="label-card">
          <div class="label-header">
            <span class="brand">${storeName}</span>
            <span class="mode">${modeLabel}</span>
          </div>
          <div class="label-body">
            <div class="qr-box">
              ${qrImg ? `<img src="${qrImg}" alt="QR ${ord.id}" />` : '<div class="qr-placeholder">QR</div>'}
            </div>
            <div class="meta">
              <div class="ord-id">${ord.id}</div>
              <div class="scan-code">${code}</div>
              <div class="row"><strong>Customer:</strong> ${ord.customer?.name || 'Customer'}</div>
              <div class="row"><strong>Phone:</strong> ${ord.customer?.phone || '-'}</div>
              <div class="row"><strong>Items:</strong> ${totalBottles} Bottles (${itemSummary || 'Standard'})</div>
              <div class="row"><strong>Amount:</strong> ₹${ord.totalAmount} (${ord.paymentStatus || 'Confirmed'})</div>
              <div class="row"><strong>Status:</strong> ${ord.dispatchVerifiedAt ? 'VERIFIED AT COUNTER' : ord.status}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispatch Counter QR Labels — ${storeName}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    body { margin: 0; padding: 16px; background: #fff; color: #0f172a; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #cbd5e1; }
    .toolbar button { background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .label-card { border: 2px solid #0f172a; border-radius: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
    .label-header { background: #0f172a; color: #DFC283; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; }
    .mode { background: #C5A059; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; }
    .label-body { display: flex; gap: 10px; padding: 10px; align-items: center; }
    .qr-box { width: 118px; height: 118px; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; shrink: 0; background: #fff; }
    .qr-box img { width: 112px; height: 112px; display: block; }
    .meta { flex: 1; min-width: 0; font-size: 10px; line-height: 1.4; }
    .ord-id { font-size: 13px; font-weight: 900; font-family: monospace; color: #0f172a; }
    .scan-code { display: inline-block; background: #f1f5f9; border: 1px solid #94a3b8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 800; font-size: 10px; margin: 3px 0 5px; }
    .row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media print {
      body { padding: 0; }
      .toolbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>${storeName} — Factory Dispatch Counter QR Labels (${orders.length})</strong>
    </div>
    <button onclick="window.print()">Print QR Labels</button>
  </div>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
