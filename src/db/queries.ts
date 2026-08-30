import { db } from './index.ts';
import { orders, products, storeSettings, users, invoices, productAuditLogs } from './schema.ts';
import { desc, eq, count, or } from 'drizzle-orm';
import { Order, Product, AdminSettings, Invoice, ProductAuditLog } from '../types.ts';

// User registration or retrieval
export async function getOrCreateUser(uid: string, email: string, role: string = 'customer') {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user.', { cause: error });
  }
}

// Products Queries
export async function getAllProducts(): Promise<Product[]> {
  try {
    const rows = await db.select().from(products);
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      price: p.price,
      mrp: p.mrp,
      customDesignPrice: p.customDesignPrice || (p.price * 2),
      image: p.image,
      description: p.description,
      shortDesc: p.shortDesc,
      inStock: p.inStock,
      minOrderQty: p.minOrderQty,
      category: p.category as any,
      badge: p.badge || undefined,
      casePackSize: p.casePackSize,
      features: p.features as string[],
      mineralInfo: p.mineralInfo as any,
      gstRate: p.gstRate ?? 18,
      hsnCode: p.hsnCode || '2201',
      discountPercent: p.discountPercent || (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
      stockCount: p.stockCount ?? 500,
      stockStatus: (p.stockStatus as any) || (p.inStock ? 'In Stock' : 'Out of Stock'),
      tags: (p.tags as string[]) || [],
      version: p.version || 1,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : undefined,
      updatedBy: p.updatedBy || undefined,
    }));
  } catch (error) {
    console.error('Database query getAllProducts failed:', error);
    throw new Error('Failed to fetch products.', { cause: error });
  }
}

export async function upsertProduct(product: Product, adminEmail: string = 'mdhussain170707@gmail.com') {
  try {
    const price = Math.round(Number(product.price)) || 10;
    const mrp = Math.round(Number(product.mrp)) || price;
    const discountPercent = product.discountPercent ?? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

    const payload = {
      id: product.id,
      name: product.name || 'HH Mineral Water',
      size: product.size || '500ml',
      price,
      mrp,
      customDesignPrice: product.customDesignPrice ? Math.round(Number(product.customDesignPrice)) : (price * 2 || 20),
      image: product.image || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
      description: product.description || 'Pure 7-stage filtration mineral water enriched with natural minerals.',
      shortDesc: product.shortDesc || `${product.size || 'Bottle'} Pure Mineral Water`,
      inStock: product.inStock !== false,
      minOrderQty: Math.max(1, Number(product.minOrderQty) || 1),
      category: product.category || 'Standard',
      badge: product.badge || null,
      casePackSize: Math.max(1, Number(product.casePackSize) || 24),
      features: Array.isArray(product.features) ? product.features : ['7-stage UV & Ozonation', 'BPA-Free PET'],
      mineralInfo: product.mineralInfo || {
        calcium: '20 mg/L',
        magnesium: '10 mg/L',
        potassium: '4 mg/L',
        sodium: '7 mg/L',
        bicarbonate: '60 mg/L',
        silica: '14 mg/L',
        tds: '125 ppm',
        ph: '7.4'
      },
      gstRate: product.gstRate ?? 18,
      hsnCode: product.hsnCode || '2201',
      discountPercent,
      stockCount: product.stockCount ?? 500,
      stockStatus: product.stockStatus || (product.inStock !== false ? 'In Stock' : 'Out of Stock'),
      tags: Array.isArray(product.tags) ? product.tags : [],
      version: (product.version || 0) + 1,
      updatedAt: new Date(),
      updatedBy: adminEmail,
    };

    const result = await db.insert(products)
      .values(payload)
      .onConflictDoUpdate({
        target: products.id,
        set: payload,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query upsertProduct failed:', error);
    throw new Error('Failed to upsert product.', { cause: error });
  }
}

export async function insertProductAuditLog(log: ProductAuditLog) {
  try {
    const result = await db.insert(productAuditLogs)
      .values({
        id: log.id,
        productId: log.productId,
        productName: log.productName,
        changedField: log.changedField,
        oldValue: log.oldValue,
        newValue: log.newValue,
        adminEmail: log.adminEmail,
        adminName: log.adminName,
        timestamp: log.timestamp,
        deviceInfo: log.deviceInfo || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query insertProductAuditLog failed:', error);
    return null;
  }
}

export async function getAllProductAuditLogs(): Promise<ProductAuditLog[]> {
  try {
    const rows = await db.select().from(productAuditLogs).orderBy(desc(productAuditLogs.createdAt));
    return rows.map(r => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      changedField: r.changedField,
      oldValue: r.oldValue,
      newValue: r.newValue,
      adminEmail: r.adminEmail,
      adminName: r.adminName,
      timestamp: r.timestamp,
      deviceInfo: r.deviceInfo || undefined,
    }));
  } catch (error) {
    console.error('Database query getAllProductAuditLogs failed:', error);
    return [];
  }
}

export async function clearAllProductAuditLogs() {
  try {
    const result = await db.delete(productAuditLogs).returning();
    return result;
  } catch (error) {
    console.error('Database query clearAllProductAuditLogs failed:', error);
    return [];
  }
}

export async function deleteProductById(productId: string) {
  try {
    const result = await db.delete(products).where(eq(products.id, productId)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query deleteProductById failed:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export async function deleteAllProducts() {
  try {
    const result = await db.delete(products).returning();
    return result;
  } catch (error) {
    console.error('Database query deleteAllProducts failed:', error);
    throw new Error('Failed to delete all products.', { cause: error });
  }
}

// Orders Queries
export async function getAllOrders(): Promise<Order[]> {
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map((o) => ({
      id: o.id,
      createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      customer: {
        name: o.customerName,
        phone: o.customerPhone,
        email: o.customerEmail || undefined,
        address: o.customerAddress,
        landmark: o.customerLandmark || undefined,
        city: o.customerCity,
        pincode: o.customerPincode,
      },
      items: o.items as any,
      subtotal: o.subtotal,
      deliveryCharge: o.deliveryCharge,
      discount: o.discount,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod as any,
      paymentStatus: o.paymentStatus as any,
      orderNotes: o.orderNotes || undefined,
      isCustomOrder: o.isCustomOrder,
      hasOriginalImage: o.hasOriginalImage,
      status: o.status as any,
      statusHistory: o.statusHistory as any,
      whatsAppNotification: o.whatsAppNotification as any,
    }));
  } catch (error) {
    console.error('Database query getAllOrders failed:', error);
    throw new Error('Failed to fetch orders.', { cause: error });
  }
}

export async function createOrder(order: Order, userUid?: string) {
  try {
    const result = await db.insert(orders)
      .values({
        id: order.id,
        userUid: userUid || null,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email || null,
        customerAddress: order.customer.address,
        customerLandmark: order.customer.landmark || null,
        customerCity: order.customer.city,
        customerPincode: order.customer.pincode,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        discount: order.discount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderNotes: order.orderNotes || null,
        isCustomOrder: order.isCustomOrder,
        hasOriginalImage: order.hasOriginalImage,
        status: order.status,
        statusHistory: order.statusHistory,
        whatsAppNotification: order.whatsAppNotification,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query createOrder failed:', error);
    throw new Error('Failed to create order.', { cause: error });
  }
}

export async function updateOrderStatusInDb(
  orderId: string,
  status: Order['status'],
  statusHistory: Order['statusHistory']
) {
  try {
    const result = await db.update(orders)
      .set({
        status,
        statusHistory,
      })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateOrderStatusInDb failed:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function deleteOrderById(orderId: string) {
  try {
    const result = await db.delete(orders).where(eq(orders.id, orderId)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query deleteOrderById failed:', error);
    throw new Error('Failed to delete order.', { cause: error });
  }
}

// Store Settings
export async function getStoreSettings(): Promise<AdminSettings | null> {
  try {
    const rows = await db.select().from(storeSettings).where(eq(storeSettings.key, 'global_settings'));
    if (rows.length > 0) {
      return rows[0].value as AdminSettings;
    }
    return null;
  } catch (error) {
    console.error('Database query getStoreSettings failed:', error);
    throw new Error('Failed to fetch store settings.', { cause: error });
  }
}

export async function saveStoreSettings(settings: AdminSettings) {
  try {
    const result = await db.insert(storeSettings)
      .values({
        key: 'global_settings',
        value: settings,
      })
      .onConflictDoUpdate({
        target: storeSettings.key,
        set: {
          value: settings,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query saveStoreSettings failed:', error);
    throw new Error('Failed to save store settings.', { cause: error });
  }
}

// ----------------------------------------------------
// GST Invoices Queries
// ----------------------------------------------------

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const rows = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    return rows.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId,
      userUid: inv.userUid || undefined,
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString() : new Date().toISOString(),
      supplyDate: inv.supplyDate ? inv.supplyDate.toISOString() : new Date().toISOString(),
      placeOfSupply: inv.placeOfSupply,
      reverseCharge: inv.reverseCharge as any,
      companyDetails: inv.companyDetails as any,
      customerDetails: inv.customerDetails as any,
      items: inv.items as any,
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxableAmount: inv.taxableAmount,
      gstRate: inv.gstRate,
      cgstAmount: inv.cgstAmount,
      sgstAmount: inv.sgstAmount,
      igstAmount: inv.igstAmount,
      totalGstAmount: inv.totalGstAmount,
      deliveryCharge: inv.deliveryCharge,
      grandTotal: inv.grandTotal,
      grandTotalInWords: inv.grandTotalInWords,
      paymentMethod: inv.paymentMethod,
      paymentStatus: inv.paymentStatus,
      status: inv.status as any,
      createdAt: inv.createdAt ? inv.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database query getAllInvoices failed:', error);
    return [];
  }
}

export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  try {
    const rows = await db.select().from(invoices).where(eq(invoices.orderId, orderId));
    if (rows.length === 0) return null;
    const inv = rows[0];
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId,
      userUid: inv.userUid || undefined,
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString() : new Date().toISOString(),
      supplyDate: inv.supplyDate ? inv.supplyDate.toISOString() : new Date().toISOString(),
      placeOfSupply: inv.placeOfSupply,
      reverseCharge: inv.reverseCharge as any,
      companyDetails: inv.companyDetails as any,
      customerDetails: inv.customerDetails as any,
      items: inv.items as any,
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxableAmount: inv.taxableAmount,
      gstRate: inv.gstRate,
      cgstAmount: inv.cgstAmount,
      sgstAmount: inv.sgstAmount,
      igstAmount: inv.igstAmount,
      totalGstAmount: inv.totalGstAmount,
      deliveryCharge: inv.deliveryCharge,
      grandTotal: inv.grandTotal,
      grandTotalInWords: inv.grandTotalInWords,
      paymentMethod: inv.paymentMethod,
      paymentStatus: inv.paymentStatus,
      status: inv.status as any,
      createdAt: inv.createdAt ? inv.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query getInvoiceByOrderId failed:', error);
    return null;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const rows = await db.select().from(invoices).where(eq(invoices.id, id));
    if (rows.length === 0) return null;
    const inv = rows[0];
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId,
      userUid: inv.userUid || undefined,
      invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString() : new Date().toISOString(),
      supplyDate: inv.supplyDate ? inv.supplyDate.toISOString() : new Date().toISOString(),
      placeOfSupply: inv.placeOfSupply,
      reverseCharge: inv.reverseCharge as any,
      companyDetails: inv.companyDetails as any,
      customerDetails: inv.customerDetails as any,
      items: inv.items as any,
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxableAmount: inv.taxableAmount,
      gstRate: inv.gstRate,
      cgstAmount: inv.cgstAmount,
      sgstAmount: inv.sgstAmount,
      igstAmount: inv.igstAmount,
      totalGstAmount: inv.totalGstAmount,
      deliveryCharge: inv.deliveryCharge,
      grandTotal: inv.grandTotal,
      grandTotalInWords: inv.grandTotalInWords,
      paymentMethod: inv.paymentMethod,
      paymentStatus: inv.paymentStatus,
      status: inv.status as any,
      createdAt: inv.createdAt ? inv.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database query getInvoiceById failed:', error);
    return null;
  }
}

export async function createInvoiceInDb(invoice: Invoice) {
  try {
    const result = await db.insert(invoices)
      .values({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        userUid: invoice.userUid || null,
        invoiceDate: new Date(invoice.invoiceDate),
        supplyDate: new Date(invoice.supplyDate || invoice.invoiceDate),
        placeOfSupply: invoice.placeOfSupply,
        reverseCharge: invoice.reverseCharge,
        customerName: invoice.customerDetails.name,
        customerPhone: invoice.customerDetails.phone,
        customerEmail: invoice.customerDetails.email || null,
        customerGstin: invoice.customerDetails.gstin || null,
        companyDetails: invoice.companyDetails,
        customerDetails: invoice.customerDetails,
        items: invoice.items,
        subtotal: Math.round(invoice.subtotal),
        discount: Math.round(invoice.discount || 0),
        taxableAmount: Math.round(invoice.taxableAmount),
        gstRate: Math.round(invoice.gstRate),
        cgstAmount: Math.round(invoice.cgstAmount),
        sgstAmount: Math.round(invoice.sgstAmount),
        igstAmount: Math.round(invoice.igstAmount || 0),
        totalGstAmount: Math.round(invoice.totalGstAmount),
        deliveryCharge: Math.round(invoice.deliveryCharge || 0),
        grandTotal: Math.round(invoice.grandTotal),
        grandTotalInWords: invoice.grandTotalInWords,
        paymentMethod: invoice.paymentMethod,
        paymentStatus: invoice.paymentStatus,
        status: invoice.status,
      })
      .onConflictDoUpdate({
        target: invoices.orderId,
        set: {
          items: invoice.items,
          grandTotal: Math.round(invoice.grandTotal),
          totalGstAmount: Math.round(invoice.totalGstAmount),
        },
      })
      .returning();

    // Also update order's invoiceNumber
    try {
      await db.update(orders)
        .set({ invoiceNumber: invoice.invoiceNumber })
        .where(eq(orders.id, invoice.orderId));
    } catch (e) {
      console.warn('Could not backfill invoiceNumber on orders table:', e);
    }

    return result[0];
  } catch (error) {
    console.error('Database query createInvoiceInDb failed:', error);
    throw new Error('Failed to create GST Invoice in database.', { cause: error });
  }
}

export async function getNextInvoiceCount(): Promise<number> {
  try {
    const res = await db.select({ value: count() }).from(invoices);
    return (res[0]?.value || 0) + 1;
  } catch {
    return 1;
  }
}

export async function deleteInvoiceById(id: string) {
  try {
    const result = await db.delete(invoices)
      .where(or(eq(invoices.id, id), eq(invoices.invoiceNumber, id), eq(invoices.orderId, id)))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query deleteInvoiceById failed:', error);
    throw new Error('Failed to delete invoice from database.', { cause: error });
  }
}

export async function deleteAllInvoices() {
  try {
    const result = await db.delete(invoices).returning();
    return result;
  } catch (error) {
    console.error('Database query deleteAllInvoices failed:', error);
    throw new Error('Failed to delete all invoices.', { cause: error });
  }
}

