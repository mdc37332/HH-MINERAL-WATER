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
  description: text('description').notNull(),
  shortDesc: text('short_desc').notNull(),
  inStock: boolean('in_stock').default(true).notNull(),
  minOrderQty: integer('min_order_qty').default(1).notNull(),
  category: text('category').notNull(),
  badge: text('badge'),
  casePackSize: integer('case_pack_size').default(24).notNull(),
  features: jsonb('features').notNull(),
  mineralInfo: jsonb('mineral_info').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // e.g. HH-ORD-74921
  userUid: text('user_uid'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  customerAddress: text('customer_address').notNull(),
  customerLandmark: text('customer_landmark'),
  customerCity: text('customer_city').notNull(),
  customerPincode: text('customer_pincode').notNull(),
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
  status: text('status').default('New').notNull(),
  statusHistory: jsonb('status_history').notNull(),
  whatsAppNotification: jsonb('whatsapp_notification').notNull(),
  invoiceNumber: text('invoice_number'),
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
