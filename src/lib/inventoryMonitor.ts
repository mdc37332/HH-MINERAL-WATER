import { Product, RawMaterialStockItem, LowStockAlertItem, LowStockAuditSummary, AdminSettings } from '../types';
import { OWNER_WHATSAPP_NUMBER } from './whatsapp';

/**
 * Evaluates current finished bottle inventory and raw material stocks
 * against their critical and reorder thresholds.
 */
export function auditInventoryStockLevels(
  products: Product[],
  rawMaterials: RawMaterialStockItem[],
  settings?: AdminSettings | null
): LowStockAuditSummary {
  const criticalItems: LowStockAlertItem[] = [];
  const warningItems: LowStockAlertItem[] = [];
  let healthyCount = 0;

  const defaultBottleCrit = settings?.defaultBottleCriticalThreshold ?? 50;
  const defaultBottleReorder = settings?.defaultBottleReorderLevel ?? 100;

  // 1. Audit Finished Bottled Water Inventory
  products.forEach((p) => {
    const stock = typeof p.stockCount === 'number' ? p.stockCount : 100;
    const critThreshold = p.lowStockThreshold ?? defaultBottleCrit;
    const reorderThreshold = p.reorderLevel ?? defaultBottleReorder;

    if (stock <= critThreshold) {
      criticalItems.push({
        id: p.id,
        type: 'bottle',
        name: `${p.name} (${p.size})`,
        currentStock: stock,
        unit: 'cases/bottles',
        criticalThreshold: critThreshold,
        reorderLevel: reorderThreshold,
        severity: 'CRITICAL',
        size: p.size,
        category: p.category,
      });
    } else if (stock <= reorderThreshold) {
      warningItems.push({
        id: p.id,
        type: 'bottle',
        name: `${p.name} (${p.size})`,
        currentStock: stock,
        unit: 'cases/bottles',
        criticalThreshold: critThreshold,
        reorderLevel: reorderThreshold,
        severity: 'WARNING',
        size: p.size,
        category: p.category,
      });
    } else {
      healthyCount++;
    }
  });

  // 2. Audit Raw Materials & Packaging Supplies
  rawMaterials.forEach((rm) => {
    const stock = Number(rm.currentStock) || 0;
    const critThreshold = Number(rm.criticalThreshold) || 10;
    const reorderThreshold = Number(rm.reorderLevel) || 25;

    if (stock <= critThreshold) {
      criticalItems.push({
        id: rm.id,
        type: 'raw_material',
        name: rm.name,
        currentStock: stock,
        unit: rm.unit,
        criticalThreshold: critThreshold,
        reorderLevel: reorderThreshold,
        severity: 'CRITICAL',
        vendorName: rm.standardVendorName,
        vendorPhone: rm.standardVendorPhone,
        hsnCode: rm.hsnCode,
        category: rm.category,
      });
    } else if (stock <= reorderThreshold) {
      warningItems.push({
        id: rm.id,
        type: 'raw_material',
        name: rm.name,
        currentStock: stock,
        unit: rm.unit,
        criticalThreshold: critThreshold,
        reorderLevel: reorderThreshold,
        severity: 'WARNING',
        vendorName: rm.standardVendorName,
        vendorPhone: rm.standardVendorPhone,
        hsnCode: rm.hsnCode,
        category: rm.category,
      });
    } else {
      healthyCount++;
    }
  });

  const totalItemsChecked = products.length + rawMaterials.length;

  return {
    checkedAt: new Date().toISOString(),
    totalItemsChecked,
    criticalCount: criticalItems.length,
    warningCount: warningItems.length,
    healthyCount,
    criticalItems,
    warningItems,
    hasCriticalStock: criticalItems.length > 0,
    hasLowStock: criticalItems.length > 0 || warningItems.length > 0,
  };
}

/**
 * Formats a high-priority, scannable WhatsApp alert message
 * targeted to Admin / Owner WhatsApp (+91 8017341130).
 */
export function formatLowStockWhatsAppMessage(
  summary: LowStockAuditSummary,
  settings?: AdminSettings | null,
  appUrl?: string
): string {
  const facility = settings?.tradeName || 'HH MINERAL WATER BOTTLING PLANT';
  const plantAddress = settings?.factoryAddress || 'Salt Lake Sector V, Kolkata';
  const dateStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const bottleCritical = summary.criticalItems.filter((i) => i.type === 'bottle');
  const rawCritical = summary.criticalItems.filter((i) => i.type === 'raw_material');
  const rawWarning = summary.warningItems.filter((i) => i.type === 'raw_material');

  let body = `🚨 *CRITICAL LOW-STOCK ALERT — ${facility.toUpperCase()}*\n`;
  body += `📅 *Date & Time:* ${dateStr}\n`;
  body += `📍 *Facility:* ${plantAddress}\n`;
  body += `⚠️ *Urgency:* IMMEDIATE ACTION REQUIRED (${summary.criticalCount} Critical, ${summary.warningCount} Low)\n\n`;

  body += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (bottleCritical.length > 0) {
    body += `🔴 *FINISHED BOTTLE INVENTORY CRITICAL:*\n`;
    bottleCritical.forEach((item, idx) => {
      body += `${idx + 1}. *${item.name}*\n`;
      body += `   ⚠️ Stock: *${item.currentStock} ${item.unit}* (Critical Threshold: ${item.criticalThreshold})\n`;
    });
    body += `\n`;
  }

  if (rawCritical.length > 0) {
    body += `🔴 *RAW MATERIALS & PACKAGING CRITICAL:*\n`;
    rawCritical.forEach((item, idx) => {
      body += `${idx + 1}. *${item.name}* (HSN ${item.hsnCode || '3923'})\n`;
      body += `   ⚠️ Stock: *${item.currentStock} ${item.unit}* (Min Threshold: ${item.criticalThreshold} ${item.unit})\n`;
      if (item.vendorName) {
        body += `   🏢 Vendor: ${item.vendorName} ${item.vendorPhone ? `(${item.vendorPhone})` : ''}\n`;
      }
    });
    body += `\n`;
  }

  if (rawWarning.length > 0) {
    body += `🟡 *UPCOMING REORDER LEVEL WARNINGS:*\n`;
    rawWarning.slice(0, 3).forEach((item, idx) => {
      body += `${idx + 1}. *${item.name}*: ${item.currentStock} ${item.unit} (Reorder: ${item.reorderLevel})\n`;
    });
    body += `\n`;
  }

  body += `━━━━━━━━━━━━━━━━━━━━━\n`;
  body += `⚡ *Recommended Plant Protocol:*\n`;
  body += `1. Place raw material POs immediately to prevent bottling downtime.\n`;
  body += `2. Prioritize bottling runs for critical finished products.\n`;
  if (appUrl) {
    body += `\n🔗 *Open Plant Admin Dashboard:* ${appUrl}`;
  } else {
    body += `\n📲 *Automated Alert System: HH Water Plant Cloud Control*`;
  }

  return body;
}

/**
 * Returns direct WhatsApp click-to-chat URL targeted to Admin (+91 8017341130)
 */
export function getLowStockWhatsAppDirectUrl(
  summary: LowStockAuditSummary,
  settings?: AdminSettings | null,
  appUrl?: string
): string {
  const targetPhone = settings?.adminWhatsAppNumber || settings?.ownerWhatsApp || OWNER_WHATSAPP_NUMBER;
  const cleanPhone = (targetPhone || '8017341130').replace(/\D/g, '');
  const destination = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const message = formatLowStockWhatsAppMessage(summary, settings, appUrl);
  return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
}
