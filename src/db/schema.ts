import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (synchronized with Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').default('customer').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products catalog table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  size: text('size').notNull(),
  price: integer('price').notNull(),
  mrp: integer('mrp').notNull(),
  image: text('image').notNull(),
  images: jsonb('images'),
  description: text('description').notNull(),
  shortDesc: text('short_desc').notNull(),
  inStock: boolean('in_stock').default(true).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  minOrderQty: integer('min_order_qty').default(1).notNull(),
  category: text('category').notNull(),
  badge: text('badge'),
  casePackSize: integer('case_pack_size').default(24).notNull(),
  packOptions: jsonb('pack_options'),
  videoUrl: text('video_url'),
  videoTitle: text('video_title'),
  customDesignPrice: integer('custom_design_price'),
  features: jsonb('features').notNull(),
  mineralInfo: jsonb('mineral_info').notNull(),
  gstRate: integer('gst_rate').default(18),
  hsnCode: text('hsn_code').default('2201'),
  discountPercent: integer('discount_percent'),
  stockCount: integer('stock_count').default(500),
  stockStatus: text('stock_status').default('In Stock'),
  tags: jsonb('tags'),
  version: integer('version').default(1),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Product Audit Logs table (Record of all product changes)
export const productAuditLogs = pgTable('product_audit_logs', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  changedField: text('changed_field').notNull(),
  oldValue: text('old_value').notNull(),
  newValue: text('new_value').notNull(),
  adminEmail: text('admin_email').notNull(),
  adminName: text('admin_name').notNull(),
  timestamp: text('timestamp').notNull(),
  deviceInfo: text('device_info'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // e.g. HH-ORD-74921
  userUid: text('user_uid'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  customerAddress: text('customer_address'),
  customerLandmark: text('customer_landmark'),
  customerCity: text('customer_city'),
  customerPincode: text('customer_pincode'),
  deliveryType: text('delivery_type').default('doorstep').notNull(),
  deliveryDistanceKm: integer('delivery_distance_km'),
  pickupSlot: text('pickup_slot'),
  pickupLocation: text('pickup_location'),
  items: jsonb('items').notNull(),
  subtotal: integer('subtotal').notNull(),
  deliveryCharge: integer('delivery_charge').notNull(),
  discount: integer('discount').default(0).notNull(),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  orderNotes: text('order_notes'),
  isCustomOrder: boolean('is_custom_order').default(false).notNull(),
  hasOriginalImage: boolean('has_original_image').default(false).notNull(),
  hasUploadedVideo: boolean('has_uploaded_video').default(false).notNull(),
  status: text('status').default('New').notNull(),
  statusHistory: jsonb('status_history').notNull(),
  whatsAppNotification: jsonb('whatsapp_notification').notNull(),
  invoiceNumber: text('invoice_number'),
  invoiceId: text('invoice_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// GST Tax Invoices table
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(), // e.g. HH/2026/000001
  invoiceNumber: text('invoice_number').notNull().unique(),
  orderId: text('order_id').notNull().unique(),
  userUid: text('user_uid'),
  invoiceDate: timestamp('invoice_date').defaultNow().notNull(),
  supplyDate: timestamp('supply_date').defaultNow().notNull(),
  placeOfSupply: text('place_of_supply').default('West Bengal (19)').notNull(),
  reverseCharge: text('reverse_charge').default('No').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  customerGstin: text('customer_gstin'),
  companyDetails: jsonb('company_details').notNull(),
  customerDetails: jsonb('customer_details').notNull(),
  items: jsonb('items').notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').default(0).notNull(),
  taxableAmount: integer('taxable_amount').notNull(),
  gstRate: integer('gst_rate').notNull(),
  cgstAmount: integer('cgst_amount').notNull(),
  sgstAmount: integer('sgst_amount').notNull(),
  igstAmount: integer('igst_amount').default(0).notNull(),
  totalGstAmount: integer('total_gst_amount').notNull(),
  deliveryCharge: integer('delivery_charge').notNull(),
  grandTotal: integer('grand_total').notNull(),
  grandTotalInWords: text('grand_total_in_words').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').notNull(),
  status: text('status').default('GENERATED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Store Settings table
export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  invoices: many(invoices),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userUid],
    references: [users.uid],
  }),
  invoice: one(invoices, {
    fields: [orders.id],
    references: [invoices.orderId],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [invoices.userUid],
    references: [users.uid],
  }),
}));

// ============================================================================
// LEVEL 3 AUTONOMOUS AI BUSINESS MANAGEMENT TABLES (ADDITIVE MIGRATION)
// ============================================================================

export const aiAgents = pgTable('ai_agents', {
  id: text('id').primaryKey(), // AGENT_00_ORCHESTRATOR .. AGENT_10_REPORTING
  code: text('code').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE | PAUSED | STOPPED | ERROR
  autonomyLevel: text('autonomy_level').default('LEVEL_3_MAX_CONTROLLED').notNull(),
  permissions: jsonb('permissions').notNull(),
  tasksCompleted: integer('tasks_completed').default(0).notNull(),
  tasksFailed: integer('tasks_failed').default(0).notNull(),
  lastRunAt: timestamp('last_run_at'),
  lastSummary: text('last_summary'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const aiTasks = pgTable('ai_tasks', {
  id: text('id').primaryKey(), // TASK-...
  agentId: text('agent_id').notNull(),
  agentName: text('agent_name').notNull(),
  eventSource: text('event_source').notNull(),
  idempotencyKey: text('idempotency_key').unique(),
  taskDescription: text('task_description').notNull(),
  executionPlan: jsonb('execution_plan').notNull(),
  authorizationLevel: text('authorization_level').notNull(), // AUTO_LEVEL_3 | OWNER_APPROVAL_REQUIRED
  status: text('status').default('PENDING').notNull(), // PENDING | RUNNING | COMPLETED | AWAITING_APPROVAL | FAILED | DEAD_LETTER
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  nextRetryAt: timestamp('next_retry_at'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  executionResult: jsonb('execution_result'),
  errorInfo: text('error_info'),
  verificationStatus: text('verification_status').default('PENDING').notNull(), // VERIFIED | UNVERIFIED | FAILED | PENDING
  toolCalls: jsonb('tool_calls'),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiApprovals = pgTable('ai_approvals', {
  id: text('id').primaryKey(), // APR-...
  taskId: text('task_id'),
  agentId: text('agent_id').notNull(),
  agentName: text('agent_name').notNull(),
  actionType: text('action_type').notNull(),
  title: text('title').notNull(),
  reason: text('reason').notNull(),
  expectedImpact: text('expected_impact').notNull(),
  proposedPayload: jsonb('proposed_payload').notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING | APPROVED | REJECTED | EXECUTED
  ownerEmail: text('owner_email'),
  decisionNote: text('decision_note'),
  decidedAt: timestamp('decided_at'),
  executedAt: timestamp('executed_at'),
  executionResult: jsonb('execution_result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiMemory = pgTable('ai_memory', {
  id: text('id').primaryKey(),
  memoryKey: text('memory_key').notNull().unique(),
  category: text('category').notNull(),
  sourceType: text('source_type').notNull(), // VERIFIED_FACT | OWNER_RULE | AI_PREDICTION
  title: text('title').notNull(),
  content: jsonb('content').notNull(),
  editableByOwner: boolean('editable_by_owner').default(true).notNull(),
  confidence: integer('confidence').default(100).notNull(),
  updatedBy: text('updated_by').default('SYSTEM').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiSchedules = pgTable('ai_schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cadence: text('cadence').notNull(), // CONTINUOUS | DAILY | WEEKLY | MONTHLY
  timezone: text('timezone').default('Asia/Kolkata').notNull(),
  agentId: text('agent_id').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  intervalMinutes: integer('interval_minutes').default(1440).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  lastStatus: text('last_status').default('IDLE').notNull(),
  lastSummary: text('last_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiSystemEvents = pgTable('ai_system_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  severity: text('severity').default('INFO').notNull(), // INFO | WARNING | CRITICAL
  source: text('source').notNull(),
  summary: text('summary').notNull(),
  details: jsonb('details'),
  resolved: boolean('resolved').default(false).notNull(),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiAgentMessages = pgTable('ai_agent_messages', {
  id: text('id').primaryKey(), // MSG-...
  correlationId: text('correlation_id').notNull(),
  taskId: text('task_id'),
  fromAgentId: text('from_agent_id').notNull(),
  fromAgentName: text('from_agent_name').notNull(),
  toAgentId: text('to_agent_id').notNull(),
  toAgentName: text('to_agent_name').notNull(),
  intent: text('intent').notNull(), // HANDOFF | DATA_REQUEST | VERIFICATION_REPORT | RISK_ALERT | APPROVAL_ESCALATION | RECOVERY_NOTICE
  subject: text('subject').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').default('DELIVERED').notNull(), // PENDING | DELIVERED | ACKNOWLEDGED | RESOLVED
  priority: text('priority').default('NORMAL').notNull(), // LOW | NORMAL | HIGH | CRITICAL
  firestoreSynced: boolean('firestore_synced').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


