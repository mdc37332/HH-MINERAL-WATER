import { getAllAiMemory, seedAiMemoryIfMissing } from '../../db/aiQueries.ts';
import type { AiMemoryRecord } from './types.ts';

const INITIAL_BUSINESS_MEMORIES: Array<Omit<AiMemoryRecord, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'mem-rule-custom-600',
    memoryKey: 'rule_custom_design_min_600',
    category: 'BUSINESS_RULE',
    sourceType: 'OWNER_RULE',
    title: 'Custom Design Order Minimum Quantity Policy',
    content: {
      minimumPieces: 600,
      maximumPieces: 'UNLIMITED',
      leadTimeDays: 7,
      acceptedArtworkFormats: ['JPG', 'JPEG', 'PNG', 'WEBP'],
      preserveOriginalArtwork: true,
      exactRejectionMessage: 'Minimum quantity for Custom Design Orders is 600 pieces.',
    },
    editableByOwner: true,
    confidence: 100,
    updatedBy: 'mdhussain170707@gmail.com',
  },
  {
    id: 'mem-rule-single-owner',
    memoryKey: 'rule_single_owner_auth',
    category: 'BUSINESS_RULE',
    sourceType: 'OWNER_RULE',
    title: 'Single-Owner Admin Access Policy',
    content: {
      authorizedOwnerEmail: 'mdhussain170707@gmail.com',
      adminWhatsAppPhone: '8017341130',
      policy: 'Only the Owner Admin controls pricing, GST config, refunds, approvals, AI Master switch, and business memory.',
    },
    editableByOwner: false,
    confidence: 100,
    updatedBy: 'mdhussain170707@gmail.com',
  },
  {
    id: 'mem-rule-gst-compliance',
    memoryKey: 'rule_gst_compliance',
    category: 'PRICING_CONFIG',
    sourceType: 'VERIFIED_FACT',
    title: 'GST Tax Invoice & HSN Policy',
    content: {
      defaultHsnCode: '2201',
      defaultGstRatePercent: 18,
      placeOfSupply: 'West Bengal (19)',
      invoiceOrderRelation: 'Strict 1:1 (every eligible order has a unique sequential GST invoice)',
    },
    editableByOwner: true,
    confidence: 100,
    updatedBy: 'system_verified',
  },
  {
    id: 'mem-rule-inventory-thresholds',
    memoryKey: 'rule_inventory_thresholds',
    category: 'INVENTORY_THRESHOLD',
    sourceType: 'OWNER_RULE',
    title: 'Finished Bottle & Raw Material Low-Stock Thresholds',
    content: {
      lowStockBottleUnitsThreshold: 50,
      criticalBottleUnitsThreshold: 20,
      preventOverselling: true,
      requireApprovalBeforeRestockPurchase: true,
    },
    editableByOwner: true,
    confidence: 100,
    updatedBy: 'mdhussain170707@gmail.com',
  },
  {
    id: 'mem-rule-autonomy-l3',
    memoryKey: 'rule_autonomy_level3',
    category: 'OWNER_PREFERENCE',
    sourceType: 'OWNER_RULE',
    title: 'Level 3 Maximum Controlled Autonomy Charter',
    content: {
      autoExecute: [
        'Monitor & validate orders',
        'Detect duplicate orders',
        'Reserve stock atomically & flag low stock',
        'Reconcile missing GST invoices',
        'Retry failed WhatsApp/email alerts safely',
        'Generate daily/weekly/monthly reports & marketing drafts',
        'Monitor security & recover transient job errors',
      ],
      ownerApprovalRequired: [
        'Changing product prices or discounts',
        'Issuing refunds or cancelling finalized invoices',
        'Modifying GST rates/settings or major stock write-offs',
        'Deleting products or suspending customers',
        'Publishing marketing campaigns or sending bulk WhatsApp messages',
        'Executing inventory restock purchase orders',
      ],
    },
    editableByOwner: true,
    confidence: 100,
    updatedBy: 'mdhussain170707@gmail.com',
  },
];

let memorySeeded = false;

export async function ensureBusinessMemorySeeded(): Promise<AiMemoryRecord[]> {
  if (!memorySeeded) {
    for (const mem of INITIAL_BUSINESS_MEMORIES) {
      await seedAiMemoryIfMissing(mem);
    }
    memorySeeded = true;
  }
  return getAllAiMemory();
}

export function sanitizeUntrustedText(text: string, maxLen = 1200): string {
  return String(text || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .trim()
    .slice(0, maxLen);
}

export async function formatMemoryContextForPrompt(): Promise<string> {
  const records = await ensureBusinessMemorySeeded();
  const facts = records
    .filter(m => m.sourceType !== 'AI_PREDICTION')
    .slice(0, 12)
    .map(m => `- [${m.sourceType} | ${m.category}] ${m.title}: ${JSON.stringify(m.content)}`);
  const predictions = records
    .filter(m => m.sourceType === 'AI_PREDICTION')
    .slice(0, 4)
    .map(m => `- [AI_PREDICTION | ${m.confidence}%] ${m.title}: ${JSON.stringify(m.content)}`);

  return [
    'VERIFIED BUSINESS FACTS & OWNER RULES (AUTHORITATIVE):',
    ...facts,
    predictions.length > 0 ? '\nAI PREDICTIONS (ADVISORY ONLY, NOT GUARANTEED FACTS):' : '',
    ...predictions,
  ]
    .filter(Boolean)
    .join('\n');
}
