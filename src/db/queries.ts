import { db, createPool } from './index.ts';
import { orders, products, storeSettings, users, invoices, productAuditLogs } from './schema.ts';
import { desc, eq, count, or } from 'drizzle-orm';
import type { Order, Product, AdminSettings, Invoice, ProductAuditLog } from '../types.ts';
import { DEFAULT_BOTTLE_IMAGE, DEFAULT_HERO_IMAGE, isDeadOrDoctorImage } from '../data/bottlePresets.ts';

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
      images: (p.images as string[]) || (p.image ? [p.image] : []),
      description: p.description,
      shortDesc: p.shortDesc,
      inStock: p.inStock,
      minOrderQty: p.minOrderQty,
      category: p.category as any,
      badge: p.badge || undefined,
      casePackSize: p.casePackSize,
      packOptions: (p.packOptions as number[]) || undefined,
      videoUrl: p.videoUrl || undefined,
      videoTitle: p.videoTitle || undefined,
      features: p.features as string[],
      mineralInfo: p.mineralInfo as any,
      gstRate: p.gstRate ?? 18,
      hsnCode: p.hsnCode || '2201',
      discountPercent: p.discountPercent || (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
      stockCount: p.stockCount ?? 500,
      stockStatus: (p.stockStatus as any) || (p.inStock ? 'In Stock' : 'Out of Stock'),
      isVisible: p.isVisible !== false && !((p.tags as string[]) || []).includes('hidden_not_show'),
      showSellingPrice: !((p.tags as string[]) || []).includes('selling_price_off'),
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

export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const rows = await db.select().from(products).where(eq(products.id, productId));
    if (rows.length === 0) return null;
    const p = rows[0];
    return {
      id: p.id,
      name: p.name,
      size: p.size,
      price: p.price,
      mrp: p.mrp,
      customDesignPrice: p.customDesignPrice || (p.price * 2),
      image: p.image,
      images: (p.images as string[]) || (p.image ? [p.image] : []),
      description: p.description,
      shortDesc: p.shortDesc,
      inStock: p.inStock,
      minOrderQty: p.minOrderQty,
      category: p.category as any,
      badge: p.badge || undefined,
      casePackSize: p.casePackSize,
      packOptions: (p.packOptions as number[]) || undefined,
      videoUrl: p.videoUrl || undefined,
      videoTitle: p.videoTitle || undefined,
      features: p.features as string[],
      mineralInfo: p.mineralInfo as any,
      gstRate: p.gstRate ?? 18,
      hsnCode: p.hsnCode || '2201',
      discountPercent: p.discountPercent || (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
      stockCount: p.stockCount ?? 500,
      stockStatus: (p.stockStatus as any) || (p.inStock ? 'In Stock' : 'Out of Stock'),
      isVisible: p.isVisible !== false && !((p.tags as string[]) || []).includes('hidden_not_show'),
      showSellingPrice: !((p.tags as string[]) || []).includes('selling_price_off'),
      tags: (p.tags as string[]) || [],
      version: p.version || 1,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : undefined,
      updatedBy: p.updatedBy || undefined,
    };
  } catch (error) {
    console.error('Database query getProductById failed:', error);
    return null;
  }
}

export async function upsertProduct(product: Product, adminEmail: string = 'mdhussain170707@gmail.com') {
  try {
    const price = Math.round(Number(product.price)) || 10;
    const mrp = Math.round(Number(product.mrp)) || price;
    const discountPercent = product.discountPercent ?? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

    const rawTags = Array.isArray(product.tags) ? [...product.tags] : [];
    let updatedTags = rawTags;
    if (product.showSellingPrice === false) {
      if (!updatedTags.includes('selling_price_off')) {
        updatedTags.push('selling_price_off');
      }
    } else if (product.showSellingPrice === true) {
      updatedTags = updatedTags.filter(t => t !== 'selling_price_off');
    }

    const isVisible = product.isVisible !== false && !updatedTags.includes('hidden_not_show');
    if (product.isVisible === false) {
      if (!updatedTags.includes('hidden_not_show')) {
        updatedTags.push('hidden_not_show');
      }
    } else if (product.isVisible === true) {
      updatedTags = updatedTags.filter(t => t !== 'hidden_not_show');
    }

    const payload = {
      id: product.id,
      name: product.name || 'HH Mineral Water',
      size: product.size || '500ml',
      price,
      mrp,
      customDesignPrice: product.customDesignPrice ? Math.round(Number(product.customDesignPrice)) : (price * 2 || 20),
      image: product.image || DEFAULT_BOTTLE_IMAGE,
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image || DEFAULT_BOTTLE_IMAGE],
      description: product.description || 'Pure 7-stage filtration mineral water enriched with natural minerals.',
      shortDesc: product.shortDesc || `${product.size || 'Bottle'} Pure Mineral Water`,
      inStock: product.inStock !== false,
      isVisible: product.isVisible === false ? false : isVisible,
      minOrderQty: Math.max(1, Number(product.minOrderQty) || 1),
      category: product.category || 'Standard',
      badge: product.badge || null,
      casePackSize: Math.max(1, Number(product.casePackSize) || 24),
      packOptions: Array.isArray(product.packOptions) ? product.packOptions : [12, 24, 36, 48],
      videoUrl: product.videoUrl || null,
      videoTitle: product.videoTitle || null,
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
      tags: updatedTags,
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
      userUid: o.userUid || undefined,
      createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      customer: {
        name: o.customerName,
        phone: o.customerPhone,
        email: o.customerEmail || undefined,
        address: o.customerAddress || '',
        landmark: o.customerLandmark || undefined,
        city: o.customerCity || '',
        pincode: o.customerPincode || '',
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
      hasUploadedVideo: o.hasUploadedVideo || false,
      deliveryType: (o.deliveryType as any) || 'doorstep',
      deliveryDistanceKm: o.deliveryDistanceKm ?? undefined,
      pickupSlot: o.pickupSlot || undefined,
      pickupLocation: o.pickupLocation || undefined,
      status: o.status as any,
      statusHistory: o.statusHistory as any,
      whatsAppNotification: o.whatsAppNotification as any,
      invoiceNumber: o.invoiceNumber || undefined,
      invoiceId: o.invoiceId || undefined,
    }));
  } catch (error) {
    console.error('Database query getAllOrders failed:', error);
    throw new Error('Failed to fetch orders.', { cause: error });
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const rows = await db.select().from(orders).where(eq(orders.id, orderId));
    if (rows.length === 0) return null;
    const o = rows[0];
    return {
      id: o.id,
      userUid: o.userUid || undefined,
      createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      customer: {
        name: o.customerName,
        phone: o.customerPhone,
        email: o.customerEmail || undefined,
        address: o.customerAddress || '',
        landmark: o.customerLandmark || undefined,
        city: o.customerCity || '',
        pincode: o.customerPincode || '',
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
      hasUploadedVideo: o.hasUploadedVideo || false,
      deliveryType: (o.deliveryType as any) || 'doorstep',
      deliveryDistanceKm: o.deliveryDistanceKm ?? undefined,
      pickupSlot: o.pickupSlot || undefined,
      pickupLocation: o.pickupLocation || undefined,
      status: o.status as any,
      statusHistory: o.statusHistory as any,
      whatsAppNotification: o.whatsAppNotification as any,
      invoiceNumber: o.invoiceNumber || undefined,
      invoiceId: o.invoiceId || undefined,
    };
  } catch (error) {
    console.error('Database query getOrderById failed:', error);
    return null;
  }
}

export async function createOrder(order: Order, userUid?: string) {
  try {
    const effectiveUserUid = userUid || order.userUid || null;
    const now = new Date().toISOString();
    const result = await db.insert(orders)
      .values({
        id: order.id,
        userUid: effectiveUserUid,
        customerName: order.customer?.name || 'Customer',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || null,
        customerAddress: order.customer?.address || (order.deliveryType === 'self_pickup' ? 'Factory Pickup (Counter #1)' : 'Kolkata, West Bengal'),
        customerLandmark: order.customer?.landmark || null,
        customerCity: order.customer?.city || (order.deliveryType === 'self_pickup' ? 'Kolkata' : 'Kolkata'),
        customerPincode: order.customer?.pincode || (order.deliveryType === 'self_pickup' ? '700091' : '700001'),
        deliveryType: order.deliveryType || 'doorstep',
        deliveryDistanceKm: order.deliveryDistanceKm !== undefined ? Math.round(Number(order.deliveryDistanceKm)) : null,
        pickupSlot: order.pickupSlot || null,
        pickupLocation: order.pickupLocation || null,
        items: order.items || [],
        subtotal: Math.round(order.subtotal ?? order.totalAmount ?? 0),
        deliveryCharge: Math.round(order.deliveryCharge ?? 0),
        discount: Math.round(order.discount ?? 0),
        totalAmount: Math.round(order.totalAmount ?? 0),
        paymentMethod: order.paymentMethod || 'Cash on Delivery (COD)',
        paymentStatus: order.paymentStatus || 'Cash Due on Delivery',
        orderNotes: order.orderNotes || null,
        isCustomOrder: order.isCustomOrder ?? false,
        hasOriginalImage: order.hasOriginalImage ?? false,
        hasUploadedVideo: order.hasUploadedVideo || false,
        status: order.status || 'New',
        statusHistory: order.statusHistory?.length
          ? order.statusHistory
          : [{ status: order.status || 'New', timestamp: now, note: 'Order placed' }],
        whatsAppNotification: order.whatsAppNotification || {},
        invoiceNumber: order.invoiceNumber || null,
        invoiceId: order.invoiceId || null,
      })
      .returning();
    return result[0];
  } catch (error: any) {
    console.error('Database query createOrder failed:', error);
    throw new Error(`Failed to create order: ${error?.message || error}`, { cause: error });
  }
}

export async function updateOrderStatusInDb(
  orderId: string,
  status: Order['status'],
  statusHistory: Order['statusHistory']
) {
  try {
    const existing = await getOrderById(orderId);
    const existingHistory = Array.isArray(existing?.statusHistory) ? existing.statusHistory : [];
    const incomingHistory = Array.isArray(statusHistory) ? statusHistory : [];

    let mergedHistory = existingHistory;
    if (incomingHistory.length > 0) {
      const seen = new Set(existingHistory.map(h => `${h?.timestamp || ''}|${h?.status || ''}`));
      const toAppend = incomingHistory.filter(h => h && !seen.has(`${h.timestamp || ''}|${h.status || ''}`));
      mergedHistory = incomingHistory.length >= existingHistory.length && existingHistory.length === 0
        ? incomingHistory
        : [...existingHistory, ...toAppend];
    }

    const result = await db.update(orders)
      .set({
        status,
        statusHistory: mergedHistory,
      })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateOrderStatusInDb failed:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function updateOrderInDb(order: Order) {
  try {
    const result = await db.update(orders)
      .set({
        customerName: order.customer?.name || 'Customer',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || null,
        customerAddress: order.customer?.address || (order.deliveryType === 'self_pickup' ? 'Factory Pickup (Counter #1)' : 'Kolkata, West Bengal'),
        customerLandmark: order.customer?.landmark || null,
        customerCity: order.customer?.city || 'Kolkata',
        customerPincode: order.customer?.pincode || '700001',
        deliveryType: order.deliveryType || 'doorstep',
        deliveryDistanceKm: order.deliveryDistanceKm !== undefined ? Math.round(Number(order.deliveryDistanceKm)) : null,
        pickupSlot: order.pickupSlot || null,
        pickupLocation: order.pickupLocation || null,
        items: order.items || [],
        subtotal: Math.round(order.subtotal ?? order.totalAmount ?? 0),
        deliveryCharge: Math.round(order.deliveryCharge ?? 0),
        discount: Math.round(order.discount ?? 0),
        totalAmount: Math.round(order.totalAmount ?? 0),
        paymentMethod: order.paymentMethod || 'Cash on Delivery (COD)',
        paymentStatus: order.paymentStatus || 'Cash Due on Delivery',
        orderNotes: order.orderNotes || null,
        isCustomOrder: order.isCustomOrder ?? false,
        hasOriginalImage: order.hasOriginalImage ?? false,
        hasUploadedVideo: order.hasUploadedVideo || false,
        status: order.status || 'New',
        statusHistory: order.statusHistory || [],
        whatsAppNotification: order.whatsAppNotification || {},
        invoiceNumber: order.invoiceNumber || null,
        invoiceId: order.invoiceId || null,
      })
      .where(eq(orders.id, order.id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateOrderInDb failed:', error);
    throw new Error('Failed to update order in database.', { cause: error });
  }
}

export async function deleteAllOrdersInDb() {
  try {
    const result = await db.delete(orders).returning();
    return result;
  } catch (error) {
    console.error('Database query deleteAllOrdersInDb failed:', error);
    throw new Error('Failed to delete all orders.', { cause: error });
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
      const settings = rows[0].value as AdminSettings;
      if (settings && typeof settings === 'object') {
        if (isDeadOrDoctorImage(settings.heroBannerImage)) {
          settings.heroBannerImage = DEFAULT_HERO_IMAGE;
        }
        if (settings.heroBannerVideo && settings.heroBannerVideo.includes('coverr.co')) {
          settings.heroBannerVideo = 'https://vjs.zencdn.net/v/oceans.mp4';
        }
      }
      return settings;
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

export async function getNextInvoiceCount(): Promise<number> {
  try {
    const pool = createPool();
    const resInv = await pool.query(`
      SELECT COALESCE(MAX(
        ((regexp_match(invoice_number, '(\\d+)$'))[1])::integer
      ), 0) as max_seq
      FROM invoices;
    `);
    const invMax = parseInt(resInv.rows[0]?.max_seq, 10) || 0;

    const resOrd = await pool.query(`
      SELECT COALESCE(MAX(
        ((regexp_match(invoice_number, '(\\d+)$'))[1])::integer
      ), 0) as max_seq
      FROM orders
      WHERE invoice_number IS NOT NULL AND invoice_number != '';
    `);
    const ordMax = parseInt(resOrd.rows[0]?.max_seq, 10) || 0;

    const maxSeq = Math.max(invMax, ordMax);
    return maxSeq + 1;
  } catch (error) {
    console.error('Error computing next invoice count:', error);
    try {
      const res = await db.select({ value: count() }).from(invoices);
      return (res[0]?.value || 0) + 1;
    } catch {
      return 1;
    }
  }
}

export async function createInvoiceInDb(invoice: Invoice) {
  try {
    if (!invoice || !invoice.orderId) {
      return invoice;
    }

    // If an invoice already exists for this order, return it immediately to prevent race conditions & duplicate key violations
    const existing = await getInvoiceByOrderId(invoice.orderId);
    if (existing) {
      return existing;
    }

    const pool = createPool();

    // Check if the proposed invoice id or invoiceNumber is already used by another order
    let finalInvoiceNumber = invoice.invoiceNumber;
    let finalId = invoice.id || invoice.invoiceNumber;

    const checkConflict = async (idVal: string, numVal: string, orderId: string): Promise<boolean> => {
      try {
        const res = await pool.query(
          `SELECT id FROM invoices WHERE (id = $1 OR invoice_number = $2) AND order_id != $3 LIMIT 1;`,
          [idVal, numVal, orderId]
        );
        return res.rows.length > 0;
      } catch {
        return false;
      }
    };

    const hasConflict = await checkConflict(finalId, finalInvoiceNumber, invoice.orderId);
    if (hasConflict) {
      // Collision detected with another order's invoice number. Dynamically allocate next guaranteed unique sequence!
      const prefixMatch = finalInvoiceNumber ? finalInvoiceNumber.match(/^(.*\/)(\d+)$/) : null;
      const basePrefix = prefixMatch ? prefixMatch[1] : 'HH/2026/';
      const candidateSeq = await getNextInvoiceCount();

      for (let attempt = 0; attempt < 25; attempt++) {
        const candidateNumber = `${basePrefix}${String(candidateSeq + attempt).padStart(6, '0')}`;
        const conflict = await checkConflict(candidateNumber, candidateNumber, invoice.orderId);
        if (!conflict) {
          finalInvoiceNumber = candidateNumber;
          finalId = candidateNumber;
          break;
        }
      }
    }

    const cust = invoice.customerDetails || ({} as any);
    const result = await db.insert(invoices)
      .values({
        id: finalId,
        invoiceNumber: finalInvoiceNumber,
        orderId: invoice.orderId,
        userUid: invoice.userUid || null,
        invoiceDate: new Date(invoice.invoiceDate || new Date()),
        supplyDate: new Date(invoice.supplyDate || invoice.invoiceDate || new Date()),
        placeOfSupply: invoice.placeOfSupply || 'West Bengal (19)',
        reverseCharge: invoice.reverseCharge || 'No',
        customerName: cust.name || 'Valued Customer',
        customerPhone: cust.phone || '',
        customerEmail: cust.email || null,
        customerGstin: cust.gstin || null,
        companyDetails: invoice.companyDetails || {},
        customerDetails: cust,
        items: invoice.items || [],
        subtotal: Math.round(Number(invoice.subtotal) || 0),
        discount: Math.round(Number(invoice.discount) || 0),
        taxableAmount: Math.round(Number(invoice.taxableAmount) || 0),
        gstRate: Math.round(Number(invoice.gstRate) || 18),
        cgstAmount: Math.round(Number(invoice.cgstAmount) || 0),
        sgstAmount: Math.round(Number(invoice.sgstAmount) || 0),
        igstAmount: Math.round(Number(invoice.igstAmount) || 0),
        totalGstAmount: Math.round(Number(invoice.totalGstAmount) || 0),
        deliveryCharge: Math.round(Number(invoice.deliveryCharge) || 0),
        grandTotal: Math.round(Number(invoice.grandTotal) || 0),
        grandTotalInWords: invoice.grandTotalInWords || `Rupees ${Math.round(Number(invoice.grandTotal) || 0)} Only`,
        paymentMethod: invoice.paymentMethod || 'Online / Cash on Delivery',
        paymentStatus: invoice.paymentStatus || 'Paid',
        status: invoice.status || 'GENERATED',
      })
      .onConflictDoUpdate({
        target: invoices.orderId,
        set: {
          items: invoice.items || [],
          grandTotal: Math.round(Number(invoice.grandTotal) || 0),
          totalGstAmount: Math.round(Number(invoice.totalGstAmount) || 0),
        },
      })
      .returning();

    // Also update order's invoiceNumber & invoiceId so they remain permanently in sync
    try {
      await db.update(orders)
        .set({ invoiceNumber: finalInvoiceNumber, invoiceId: finalId })
        .where(eq(orders.id, invoice.orderId));
    } catch (e) {
      console.warn('Could not backfill invoiceNumber on orders table:', e);
    }

    const saved = result[0];
    if (saved) {
      return {
        ...invoice,
        ...saved,
        id: saved.id,
        invoiceNumber: saved.invoiceNumber,
        invoiceDate: saved.invoiceDate ? saved.invoiceDate.toISOString() : invoice.invoiceDate,
        supplyDate: saved.supplyDate ? saved.supplyDate.toISOString() : invoice.supplyDate,
        createdAt: saved.createdAt ? saved.createdAt.toISOString() : invoice.createdAt,
      } as Invoice;
    }
    return invoice;
  } catch (error) {
    console.error('Database query createInvoiceInDb failed:', error);
    return invoice;
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

