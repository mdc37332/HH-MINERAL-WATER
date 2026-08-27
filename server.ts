import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAllProducts,
  upsertProduct,
  deleteProductById,
  getAllOrders,
  createOrder,
  updateOrderStatusInDb,
  deleteOrderById,
  getStoreSettings,
  saveStoreSettings,
  getOrCreateUser,
  getAllInvoices,
  getInvoiceById,
  getInvoiceByOrderId,
  createInvoiceInDb,
  getNextInvoiceCount,
} from './src/db/queries.ts';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  handleAdminLoginStep1,
  handleAdminResendOtp,
  handleAdminVerifyOtp,
  handleAdminVerifySession,
  handleAdminLogout,
  handleAdminLogoutAll,
  requireAdminAuth,
  getAuditLogs,
  logAuditEvent,
  AUTHORIZED_ADMIN_EMAIL
} from './src/server/adminSecurity.ts';
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS } from './src/data/initialProducts.ts';
import { Order, Product, AdminSettings, Invoice } from './src/types.ts';
import { generateGstInvoice } from './src/lib/invoiceGenerator.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Seed default products & settings lazily if needed
  async function ensureSeedData() {
    try {
      const existingProducts = await getAllProducts();
      if (existingProducts.length === 0) {
        console.log('Seeding initial products into Cloud SQL...');
        for (const p of INITIAL_PRODUCTS) {
          await upsertProduct(p);
        }
      }
      const existingSettings = await getStoreSettings();
      if (!existingSettings) {
        await saveStoreSettings(DEFAULT_ADMIN_SETTINGS as AdminSettings);
      }
    } catch (err) {
      console.warn('Seed data check deferred or pool client connecting:', err);
    }
  }

  // Run initial check non-blockingly
  ensureSeedData();

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'cloudsql-postgresql' });
  });

  // --- ADMIN AUTHENTICATION & SECURITY (2-Step Verification) ---
  app.post('/api/admin/login-step1', handleAdminLoginStep1);
  app.post('/api/admin/resend-otp', handleAdminResendOtp);
  app.post('/api/admin/verify-otp', handleAdminVerifyOtp);
  app.get('/api/admin/verify-session', handleAdminVerifySession);
  app.post('/api/admin/logout', handleAdminLogout);
  app.post('/api/admin/logout-all', handleAdminLogoutAll);
  app.get('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
    res.json(getAuditLogs());
  });

  // Auth synchronization (Customer accounts)
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'User UID missing from token' });
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email || 'user@example.com');
      res.json(user);
    } catch (error: any) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user' });
    }
  });

  // Products API (Public Read, Protected Admin Write)
  app.get('/api/products', async (req, res) => {
    try {
      let productsList = await getAllProducts();
      if (productsList.length === 0) {
        // Populate and return fallback initial products
        for (const p of INITIAL_PRODUCTS) {
          await upsertProduct(p);
        }
        productsList = await getAllProducts();
      }
      res.json(productsList);
    } catch (error: any) {
      console.error('Failed to get products from Cloud SQL:', error);
      // Fallback to in-memory initial products to ensure flawless UI uptime
      res.json(INITIAL_PRODUCTS);
    }
  });

  app.post('/api/products', requireAdminAuth, async (req, res) => {
    try {
      const product: Product = req.body;
      if (!product.id || !product.name || !product.size) {
        return res.status(400).json({ error: 'Invalid product payload' });
      }
      const saved = await upsertProduct(product);
      logAuditEvent('ADMIN_PRODUCT_UPDATED', `Product updated or created: ${product.name} (${product.size}) - ₹${product.price}`);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save product:', error);
      res.status(500).json({ error: error.message || 'Failed to save product' });
    }
  });

  app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteProductById(id);
      logAuditEvent('ADMIN_PRODUCT_DELETED', `Product deleted with ID: ${id}`);
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
  });

  // Orders API
  app.get('/api/orders', async (req, res) => {
    try {
      const ordersList = await getAllOrders();
      res.json(ordersList);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      res.json([]);
    }
  });

  app.post('/api/orders', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const order: Order = req.body;
      if (!order.id || !order.customer || !order.items) {
        return res.status(400).json({ error: 'Invalid order structure' });
      }
      const userUid = req.user?.uid;
      const created = await createOrder(order, userUid);

      // Automatically generate professional GST Tax Invoice immediately after successful order creation
      try {
        const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const nextCount = await getNextInvoiceCount();
        const generatedInvoice = generateGstInvoice(order, currentSettings, nextCount);
        
        await createInvoiceInDb(generatedInvoice);
        logAuditEvent(
          'GST_INVOICE_GENERATED',
          `GST Tax Invoice ${generatedInvoice.invoiceNumber} generated for order ${order.id} (Grand Total: ₹${generatedInvoice.grandTotal})`
        );
      } catch (invErr) {
        console.error('Non-blocking GST Invoice auto-generation error:', invErr);
      }

      res.status(201).json(created);
    } catch (error: any) {
      console.error('Failed to create order in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });

  app.patch('/api/orders/:id/status', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, statusHistory } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      const updated = await updateOrderStatusInDb(id, status, statusHistory || []);
      logAuditEvent('ADMIN_ORDER_STATUS_CHANGED', `Order ${id} status updated to ${status}`);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      res.status(500).json({ error: error.message || 'Failed to update order status' });
    }
  });

  app.delete('/api/orders/:id', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteOrderById(id);
      logAuditEvent('ADMIN_ORDER_DELETED', `Order deleted permanently by Administrator: ${id}`);
      res.json({ success: true, deleted, message: `Order ${id} deleted successfully.` });
    } catch (error: any) {
      console.error('Failed to delete order:', error);
      res.status(500).json({ error: error.message || 'Failed to delete order' });
    }
  });

  // --- GST INVOICES API ---
  app.get('/api/invoices', async (req, res) => {
    try {
      const invoicesList = await getAllInvoices();
      res.json(invoicesList);
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      res.json([]);
    }
  });

  app.get('/api/invoices/:id', async (req, res) => {
    try {
      const invoice = await getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error: any) {
      console.error('Failed to get invoice by ID:', error);
      res.status(500).json({ error: error.message || 'Failed to get invoice' });
    }
  });

  app.get('/api/invoices/order/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      let invoice = await getInvoiceByOrderId(orderId);
      
      // If invoice not yet generated, generate it on demand
      if (!invoice) {
        const allOrders = await getAllOrders();
        const targetOrder = allOrders.find(o => o.id === orderId);
        if (targetOrder) {
          const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
          const nextCount = await getNextInvoiceCount();
          const newInvoice = generateGstInvoice(targetOrder, currentSettings, nextCount);
          await createInvoiceInDb(newInvoice);
          invoice = newInvoice;
        }
      }

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found for this order' });
      }
      res.json(invoice);
    } catch (error: any) {
      console.error('Failed to get invoice for order:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch invoice for order' });
    }
  });

  app.post('/api/invoices/generate', async (req, res) => {
    try {
      const { order, sequenceNumber } = req.body;
      if (!order || !order.id || !order.customer) {
        return res.status(400).json({ error: 'Invalid order structure for invoice generation' });
      }

      // Check if invoice already exists to prevent duplication
      const existing = await getInvoiceByOrderId(order.id);
      if (existing) {
        return res.json(existing);
      }

      const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const nextCount = sequenceNumber || (await getNextInvoiceCount());
      const newInvoice = generateGstInvoice(order, currentSettings, nextCount);
      const saved = await createInvoiceInDb(newInvoice);
      logAuditEvent('GST_INVOICE_GENERATED', `GST Invoice ${newInvoice.invoiceNumber} created for ${order.id}`);
      res.status(201).json(saved || newInvoice);
    } catch (error: any) {
      console.error('Failed to generate invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to generate invoice' });
    }
  });

  // Settings API (Public Read, Protected Admin Write)
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await getStoreSettings();
      res.json(settings || DEFAULT_ADMIN_SETTINGS);
    } catch (error: any) {
      console.error('Failed to get settings:', error);
      res.json(DEFAULT_ADMIN_SETTINGS);
    }
  });

  app.post('/api/settings', requireAdminAuth, async (req, res) => {
    try {
      const settings: AdminSettings = req.body;
      const saved = await saveStoreSettings(settings);
      logAuditEvent('ADMIN_SETTINGS_UPDATED', `Store & visual settings updated by administrator.`);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      res.status(500).json({ error: error.message || 'Failed to save settings' });
    }
  });


  // Vite middleware for development vs Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HH Mineral Water Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});

