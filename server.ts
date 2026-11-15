import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getAllProducts,
  getProductById,
  upsertProduct,
  deleteProductById,
  deleteAllProducts,
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatusInDb,
  updateOrderInDb,
  deleteOrderById,
  deleteAllOrdersInDb,
  getStoreSettings,
  saveStoreSettings,
  getOrCreateUser,
  getAllInvoices,
  getInvoiceById,
  getInvoiceByOrderId,
  createInvoiceInDb,
  getNextInvoiceCount,
  deleteInvoiceById,
  deleteAllInvoices,
  getAllProductAuditLogs,
  insertProductAuditLog,
  clearAllProductAuditLogs,
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
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS, DEFAULT_RAW_MATERIALS_INVENTORY } from './src/data/initialProducts.ts';
import type { Order, Product, AdminSettings, Invoice, RawMaterialStockItem, LowStockAuditSummary } from './src/types.ts';
import { generateGstInvoice } from './src/lib/invoiceGenerator.ts';
import {
  dispatchOrderToAdminWhatsApp,
  sendTestWhatsAppAlert,
  normalizeWhatsAppDestination,
  isTokenBlocked,
  clearTokenBlockedStatus,
  formatOrderCloudApiMessage,
  sendMetaWhatsAppMessage,
} from './src/server/whatsappCloudApi.ts';
import {
  auditInventoryStockLevels,
  formatLowStockWhatsAppMessage,
  getLowStockWhatsAppDirectUrl,
} from './src/lib/inventoryMonitor.ts';
import {
  dispatchOrderEmailToAdmin,
  sendAdminTestEmail,
  getAdminTargetEmails,
} from './src/server/adminOrderEmail.ts';
import {
  acknowledgeCrossAgentMessage,
  deleteAiMemoryById,
  getAllAiAgents,
  getAllAiApprovals,
  getAllAiMemory,
  getAllAiSchedules,
  getAiTasks,
  getAiApprovalById,
  getAiTaskById,
  getCrossAgentMessages,
  getCrossAgentMessagesByCorrelation,
  getDailyTokenUsageSummary,
  getMasterAiConfig,
  getRecentAiSystemEvents,
  recordAiSystemEvent,
  reserveOrderStockAtomically,
  setMasterAiStatus,
  updateAiAgentStatus,
  updateAiApproval,
  updateAiSchedule,
  updateAiTask,
  upsertAiMemoryByOwner,
} from './src/db/aiQueries.ts';
import { getGeminiIntegrationStatus } from './src/server/ai/geminiClient.ts';
import { ensureAgentsSeeded } from './src/server/ai/agentRegistry.ts';
import { ensureBusinessMemorySeeded, sanitizeUntrustedText } from './src/server/ai/memoryService.ts';
import { executeApprovedAction, executeRegisteredTool } from './src/server/ai/toolRegistry.ts';
import {
  getFirestoreBridgeHealth,
  syncProductStockToFirestoreFromServer,
} from './src/server/ai/firestoreBridge.ts';
import {
  handleBusinessEvent,
  handleCustomerSupportQuery,
  processOwnerNaturalLanguageCommand,
} from './src/server/ai/orchestrator.ts';
import {
  ensureAiSystemBootstrapped,
  processRetryQueueAndSchedules,
  runScheduleById,
  startAiBackgroundWorker,
} from './src/server/ai/schedulerAndRecovery.ts';
import type { AgentId, AgentStatus, BusinessEventType } from './src/server/ai/types.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Video and Media Uploads Directory (Disk-backed, supports KB, MB, and GB files)
  const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
  const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  // Serve static uploaded videos with byte-range streaming support
  app.use('/uploads/videos', express.static(VIDEOS_DIR));

  app.use(express.json({ limit: '50mb' }));

  // Seed default products & settings lazily only on truly fresh database (never after admin deletion)
  async function ensureSeedData() {
    try {
      const existingProducts = await getAllProducts();
      if (!existingProducts || existingProducts.length === 0) {
        const auditLogs = await getAllProductAuditLogs();
        const wasDeletedByAdmin = Array.isArray(auditLogs) && auditLogs.some(
          log => log.changedField === 'ALL_PRODUCTS_DELETED' || log.changedField === 'PRODUCT_DELETED'
        );
        if (!wasDeletedByAdmin && INITIAL_PRODUCTS.length > 0) {
          console.log('Seeding initial products into database...');
          for (const p of INITIAL_PRODUCTS) {
            await upsertProduct(p);
          }
        }
      }
      const existingSettings = await getStoreSettings();
      if (!existingSettings) {
        await saveStoreSettings(DEFAULT_ADMIN_SETTINGS as AdminSettings);
      }
      await ensureAiSystemBootstrapped();
      startAiBackgroundWorker();
    } catch (err) {
      console.warn('Seed data check notice:', err);
    }
  }

  // Run initial check non-blockingly
  ensureSeedData();

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'cloudsql-postgresql', aiOrchestrator: 'level-3-ready' });
  });

  // --- STREAMING VIDEO UPLOAD API (Supports KB, MB, GB files with zero memory crash) ---
  app.post('/api/upload-video', (req, res) => {
    let destinationPath = '';
    let writeStream: fs.WriteStream | null = null;
    const cleanupPartialFile = () => {
      try {
        if (writeStream && !writeStream.destroyed) {
          writeStream.destroy();
        }
        if (destinationPath && fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }
      } catch {}
    };

    try {
      const rawFileName = (req.headers['x-file-name'] as string) || `video_${Date.now()}.mp4`;
      let decodedName = rawFileName;
      try {
        decodedName = decodeURIComponent(rawFileName);
      } catch {}
      const cleanFileName = decodedName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeUniqueName = `video_${Date.now()}_${cleanFileName}`;
      destinationPath = path.join(VIDEOS_DIR, safeUniqueName);

      writeStream = fs.createWriteStream(destinationPath);
      let totalBytes = 0;

      req.on('data', (chunk) => {
        totalBytes += chunk.length;
      });

      req.on('aborted', () => {
        cleanupPartialFile();
      });

      req.on('error', (err) => {
        console.error('[Video Upload Request Error]:', err);
        cleanupPartialFile();
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: err.message || 'Video upload stream failed' });
        }
      });

      req.pipe(writeStream);

      writeStream.on('finish', () => {
        if (res.headersSent) return;
        let sizeFormatted = `${totalBytes} B`;
        if (totalBytes >= 1024 * 1024 * 1024) {
          sizeFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (totalBytes >= 1024 * 1024) {
          sizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else if (totalBytes >= 1024) {
          sizeFormatted = `${(totalBytes / 1024).toFixed(1)} KB`;
        }

        console.log(`[Video Upload] Saved: ${safeUniqueName} (${sizeFormatted}) to disk`);
        res.json({
          success: true,
          url: `/uploads/videos/${safeUniqueName}`,
          filename: safeUniqueName,
          size: totalBytes,
          sizeFormatted,
        });
      });

      writeStream.on('error', (err) => {
        console.error('[Video Upload Error]:', err);
        cleanupPartialFile();
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: err.message || 'Failed to save video to disk' });
        }
      });
    } catch (error: any) {
      console.error('[Video Upload Exception]:', error);
      cleanupPartialFile();
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: error.message || 'Video upload processing error' });
      }
    }
  });

  // Dedicated Range-Request Video Streaming (Instant seeking for KB, MB, and multi-GB files)
  app.get('/api/videos/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const safeFilename = path.basename(filename);
      const videoPath = path.join(VIDEOS_DIR, safeFilename);

      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const ext = path.extname(safeFilename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.m4v': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.ogg': 'video/ogg',
        '.ogv': 'video/ogg',
      };
      const contentType = mimeTypes[ext] || 'video/mp4';

      if (fileSize === 0) {
        res.writeHead(200, {
          'Content-Length': 0,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
        });
        return res.end();
      }

      const range = req.headers.range;
      if (range && range.startsWith('bytes=')) {
        const parts = range.replace(/^bytes=/, '').split(',')[0].trim().split('-');
        let start: number;
        let end: number;

        if (parts[0] === '') {
          // Suffix-byte-range: e.g. bytes=-500
          const suffixLength = parseInt(parts[1], 10);
          if (isNaN(suffixLength) || suffixLength <= 0) {
            return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          }
          start = Math.max(0, fileSize - suffixLength);
          end = fileSize - 1;
        } else {
          start = parseInt(parts[0], 10);
          end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        }

        if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || start > end) {
          return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        }
        end = Math.min(end, fileSize - 1);

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(videoPath, { start, end });
        fileStream.on('error', (streamErr) => {
          console.error('Video range stream error:', streamErr);
          if (!res.headersSent) res.status(500).end();
          else res.destroy();
        });
        res.on('close', () => {
          if (!fileStream.destroyed) fileStream.destroy();
        });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        });
        fileStream.pipe(res);
      } else {
        const fileStream = fs.createReadStream(videoPath);
        fileStream.on('error', (streamErr) => {
          console.error('Video stream error:', streamErr);
          if (!res.headersSent) res.status(500).end();
          else res.destroy();
        });
        res.on('close', () => {
          if (!fileStream.destroyed) fileStream.destroy();
        });
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
        });
        fileStream.pipe(res);
      }
    } catch (err: any) {
      console.error('Error streaming video:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream video' });
      }
    }
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
      const auditLogs = await getAllProductAuditLogs().catch(() => []);
      const wasCatalogCleared = auditLogs.some((l: any) => l?.changedField === 'ALL_PRODUCTS_DELETED');
      const was1LDeleted = auditLogs.some(
        (l: any) => l?.changedField === 'PRODUCT_DELETED' && l?.productId === 'prod-1L'
      );

      if (!productsList || productsList.length === 0) {
        if (!wasCatalogCleared && INITIAL_PRODUCTS.length > 0) {
          for (const p of INITIAL_PRODUCTS) {
            await upsertProduct(p);
          }
          productsList = await getAllProducts();
        }
      } else if (!was1LDeleted && !wasCatalogCleared) {
        // Ensure default 1 Litre product exists unless Admin explicitly deleted it
        const has1L = productsList.some(
          p => p.id === 'prod-1L' || (p.size && (p.size.toLowerCase() === '1l' || p.size.toLowerCase() === '1 litre'))
        );
        if (!has1L) {
          const initial1L = INITIAL_PRODUCTS.find(p => p.id === 'prod-1L');
          if (initial1L) {
            await upsertProduct(initial1L);
            productsList = await getAllProducts();
          }
        }
      }
      res.json(Array.isArray(productsList) ? productsList : []);
    } catch (error: any) {
      console.error('Failed to get products from Cloud SQL:', error);
      res.json(INITIAL_PRODUCTS);
    }
  });

  // Product Audit Logs API (Admin Only)
  app.get('/api/products/audit-logs', requireAdminAuth, async (req, res) => {
    try {
      const logs = await getAllProductAuditLogs();
      res.json(logs);
    } catch (error: any) {
      console.error('Failed to get product audit logs:', error);
      res.json([]);
    }
  });

  app.delete('/api/products/audit-logs', requireAdminAuth, async (req, res) => {
    try {
      const result = await clearAllProductAuditLogs();
      logAuditEvent('ADMIN_PRODUCT_AUDIT_CLEARED', 'All product audit logs cleared by admin');
      res.json({ success: true, count: result.length });
    } catch (error: any) {
      console.error('Failed to clear product audit logs:', error);
      res.status(500).json({ error: 'Failed to clear product audit logs' });
    }
  });

  app.post('/api/products', requireAdminAuth, async (req, res) => {
    try {
      const product: Product = req.body;
      if (!product.id || !product.name || !product.size) {
        return res.status(400).json({ error: 'Invalid product payload' });
      }

      const adminSession = (req as any).adminSession;
      const adminEmail = adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      const adminName = 'Authorized Admin';
      const userAgent = (req.headers['user-agent'] || 'Browser').slice(0, 100);
      const deviceInfo = /Mobile|Android|iPhone/i.test(userAgent) ? 'Mobile Device' : /Tablet|iPad/i.test(userAgent) ? 'Tablet' : 'Desktop Browser';

      // Fetch existing for audit log diff
      const existingList = await getAllProducts();
      const existing = existingList.find(p => p.id === product.id);

      const saved = await upsertProduct(product, adminEmail);

      // Record audit diffs
      const now = new Date().toISOString();
      if (existing) {
        const fieldsToTrack: (keyof Product)[] = [
          'name', 'price', 'mrp', 'customDesignPrice', 'size', 'category',
          'inStock', 'isVisible', 'stockStatus', 'stockCount', 'discountPercent', 'gstRate',
          'hsnCode', 'image', 'shortDesc', 'description', 'badge', 'casePackSize'
        ];

        for (const field of fieldsToTrack) {
          const oldVal = existing[field];
          const newVal = product[field];
          if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
            await insertProductAuditLog({
              id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              productId: product.id,
              productName: product.name,
              changedField: String(field),
              oldValue: oldVal !== undefined ? (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : 'None',
              newValue: newVal !== undefined ? (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : 'None',
              adminEmail,
              adminName,
              timestamp: now,
              deviceInfo
            });
          }
        }
      } else {
        await insertProductAuditLog({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId: product.id,
          productName: product.name,
          changedField: 'PRODUCT_CREATED',
          oldValue: 'None (New Variant)',
          newValue: `${product.size} created @ ₹${product.price}`,
          adminEmail,
          adminName,
          timestamp: now,
          deviceInfo
        });
      }

      logAuditEvent('ADMIN_PRODUCT_UPDATED', `Product updated or created: ${product.name} (${product.size}) - ₹${product.price} by ${adminEmail}`);

      // Sync product update to Firestore bridge & trigger Low-Stock Orchestrator check if threshold hit
      setImmediate(() => {
        syncProductStockToFirestoreFromServer({
          id: saved.id,
          stockCount: saved.stockCount ?? 0,
          stockStatus: saved.stockStatus as any,
          inStock: saved.inStock,
          isVisible: saved.isVisible,
          price: saved.price,
          discountPercent: saved.discountPercent ?? undefined,
        }).catch(() => {});
        if (!saved.inStock || (saved.stockCount ?? 0) <= 50) {
          handleBusinessEvent(
            'LOW_STOCK_DETECTED',
            { productId: saved.id, name: saved.name, stockCount: saved.stockCount ?? 0 },
            `LOW_STOCK:${saved.id}:${saved.stockCount ?? 0}`
          ).catch(() => {});
        }
      });

      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save product:', error);
      res.status(500).json({ error: error.message || 'Failed to save product' });
    }
  });

  // Delete All Products (Admin Only)
  app.delete('/api/products', requireAdminAuth, async (req, res) => {
    try {
      const deleted = await deleteAllProducts();
      const adminSession = (req as any).adminSession;
      const adminEmail = adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      await insertProductAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: 'ALL',
        productName: 'ALL_PRODUCTS_CATALOG',
        changedField: 'ALL_PRODUCTS_DELETED',
        oldValue: 'Catalog active',
        newValue: 'All products removed from catalog',
        adminEmail,
        adminName: 'Authorized Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: 'Admin Session'
      });
      logAuditEvent('ADMIN_ALL_PRODUCTS_DELETED', 'All products deleted from store catalog');
      res.json({ success: true, count: deleted.length });
    } catch (error: any) {
      console.error('Failed to delete all products:', error);
      res.status(500).json({ error: error.message || 'Failed to delete all products' });
    }
  });

  app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteProductById(id);
      const adminSession = (req as any).adminSession;
      const adminEmail = adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      await insertProductAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: id,
        productName: deleted?.name || id,
        changedField: 'PRODUCT_DELETED',
        oldValue: 'Active in Catalog',
        newValue: 'Deleted from Database',
        adminEmail,
        adminName: 'Authorized Admin',
        timestamp: new Date().toISOString(),
        deviceInfo: 'Admin Session'
      });
      logAuditEvent('ADMIN_PRODUCT_DELETED', `Product deleted with ID: ${id}`);
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error: any) {
      console.error('Failed to fetch product:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch product' });
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

  app.get('/api/orders/:id', async (req, res) => {
    try {
      const order = await getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch order' });
    }
  });

  app.post('/api/orders', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const order: Order = req.body;
      if (!order.id || !order.customer || !Array.isArray(order.items) || order.items.length === 0) {
        return res.status(400).json({ error: 'Invalid order structure' });
      }

      // 1. Server-side Idempotency Check against duplicate orders
      const existingOrder = await getOrderById(order.id);
      if (existingOrder) {
        return res.status(200).json(existingOrder);
      }

      // 2. Enforce Custom Design Minimum Quantity (Strictly 600 pieces) & Artwork Format Validation
      const customItems = order.items.filter(i => i.isCustomDesign);
      if (customItems.length > 0 || order.isCustomOrder) {
        const hasUndersizedCustomItem = customItems.some(i => (Number(i.quantity) || 0) < 600);
        const totalCustomQty = customItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        if (hasUndersizedCustomItem || (customItems.length > 0 && totalCustomQty < 600)) {
          return res.status(400).json({
            error: 'Minimum quantity for Custom Design Orders is 600 pieces.',
          });
        }
        // Validate artwork image formats if uploaded
        for (const item of customItems) {
          const imgs = item.customDesignDetails?.uploadedImages || [];
          for (const img of imgs) {
            const mime = String(img.type || '').toLowerCase();
            const name = String(img.name || '').toLowerCase();
            if (mime && !mime.startsWith('video/') && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
              if (!/\.(jpe?g|png|webp)$/i.test(name)) {
                return res.status(400).json({
                  error: 'Unsupported custom artwork format. Accepted formats: JPG, JPEG, PNG, WEBP.',
                });
              }
            }
          }
        }
      }

      // 3. Atomic PostgreSQL Inventory Reservation to prevent overselling
      const itemsToReserve = order.items
        .map(item => ({
          productId: item.product?.id || '',
          quantity: Number(item.quantity) || 0,
          name: item.product?.name,
        }))
        .filter(i => Boolean(i.productId) && i.quantity > 0);

      const reservation = await reserveOrderStockAtomically(itemsToReserve);
      if (!reservation.ok) {
        return res.status(409).json({
          error: `Insufficient stock for ${reservation.insufficientItem}`,
        });
      }

      if (!order.createdAt) {
        order.createdAt = new Date().toISOString();
      }
      const userUid = req.user?.uid || order.userUid;
      const created = await createOrder(order, userUid);

      // Automatically generate or link professional GST Tax Invoice immediately after successful order creation
      try {
        const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        let invoice = await getInvoiceByOrderId(order.id);

        if (!invoice) {
          const candidateInvoiceNumber = order.invoiceNumber || (created as any)?.invoiceNumber;
          const seqMatch = candidateInvoiceNumber ? candidateInvoiceNumber.match(/(\d+)$/) : null;
          const nextCount = seqMatch ? parseInt(seqMatch[1], 10) : await getNextInvoiceCount();

          const orderForInvoice = {
            ...order,
            invoiceNumber: candidateInvoiceNumber || undefined,
          };
          const generatedInvoice = generateGstInvoice(orderForInvoice, currentSettings, nextCount);
          if (candidateInvoiceNumber) {
            generatedInvoice.invoiceNumber = candidateInvoiceNumber;
            generatedInvoice.id = candidateInvoiceNumber;
          }
          invoice = await createInvoiceInDb(generatedInvoice);
        }

        if (invoice) {
          created.invoiceNumber = invoice.invoiceNumber;
          created.invoiceId = invoice.id;
          order.invoiceNumber = invoice.invoiceNumber;
          order.invoiceId = invoice.id;
        }
        logAuditEvent(
          'GST_INVOICE_GENERATED',
          `GST Tax Invoice ${invoice?.invoiceNumber || created.invoiceNumber} linked for order ${order.id} (Grand Total: ₹${invoice?.grandTotal || order.totalAmount})`
        );
      } catch (invErr) {
        console.error('Non-blocking GST Invoice auto-generation error:', invErr);
      }

      // Option 4: Meta WhatsApp Cloud API automated background dispatch to Admin (+91 8017341130)
      try {
        const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const whatsappResult = await dispatchOrderToAdminWhatsApp(order, currentSettings, process.env.APP_URL);
        if (whatsappResult.success) {
          order.whatsAppNotification = {
            ...(order.whatsAppNotification || {
              targetPhone: whatsappResult.targetPhone,
              messageFormatted: '',
              retryCount: 0,
            }),
            status: 'SENT',
            sentAt: whatsappResult.dispatchedAt,
            lastAttempt: whatsappResult.dispatchedAt,
            targetPhone: whatsappResult.targetPhone,
            adminNotification: {
              status: 'SENT',
              targetPhone: whatsappResult.targetPhone,
              retryCount: 0,
              lastAttempt: whatsappResult.dispatchedAt,
              messageId: whatsappResult.messageId,
              sentAt: whatsappResult.dispatchedAt,
            },
          };
          await updateOrderInDb(order);
          logAuditEvent(
            'WHATSAPP_CLOUD_API_DISPATCHED',
            `Automated WhatsApp order alert dispatched to Admin (+${whatsappResult.targetPhone}) for order ${order.id}. Message ID: ${whatsappResult.messageId}`
          );
        } else {
          // Graceful fallback to Direct 1-Click WhatsApp links
          order.whatsAppNotification = {
            ...(order.whatsAppNotification || {
              targetPhone: whatsappResult.targetPhone,
              messageFormatted: '',
              retryCount: 0,
            }),
            status: 'PENDING',
            lastAttempt: whatsappResult.dispatchedAt,
            targetPhone: whatsappResult.targetPhone,
            adminNotification: {
              status: 'PENDING',
              targetPhone: whatsappResult.targetPhone,
              retryCount: 0,
              lastAttempt: whatsappResult.dispatchedAt,
              error: whatsappResult.error,
            },
          };
          await updateOrderInDb(order);
          console.log(`[Order ${order.id}] Direct 1-Click WhatsApp notification link ready (+${whatsappResult.targetPhone}). Notice: ${whatsappResult.error || 'Ready'}`);
          logAuditEvent(
            'WHATSAPP_ALERT_PREPARED',
            `Direct WhatsApp notification link ready for order ${order.id} (+${whatsappResult.targetPhone})`
          );
        }
      } catch (waErr) {
        console.warn('Non-blocking WhatsApp Cloud API notice:', waErr);
      }

      // Automated background dispatch of full order details to Admin Email (mdc37332@gmail.com, mdhussain170707@gmail.com)
      try {
        const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const emailResult = await dispatchOrderEmailToAdmin(order, currentSettings, process.env.APP_URL);
        
        order.adminEmailNotification = {
          status: emailResult.mode === 'SMTP' ? 'SENT' : (emailResult.mode === 'CONFIG_REQUIRED' ? 'CONFIG_REQUIRED' : 'FAILED'),
          sentAt: emailResult.dispatchedAt,
          targetEmails: emailResult.targetEmails,
          retryCount: 0,
          lastAttempt: emailResult.dispatchedAt,
          messageId: emailResult.messageId,
          mode: emailResult.mode === 'SMTP' ? 'smtp' : 'log_fallback',
          error: emailResult.error
        };

        await updateOrderInDb(order);
        (created as any).adminEmailNotification = order.adminEmailNotification;
        logAuditEvent(
          'ADMIN_ORDER_EMAIL_DISPATCHED',
          `Order details dispatched to Admin Email (${emailResult.targetEmails.join(', ')}) for order ${order.id} [${emailResult.mode}]`
        );
      } catch (emailErr) {
        console.error('Non-blocking Admin Order Email dispatch error:', emailErr);
      }

      // Trigger Master AI Orchestrator asynchronously (ORDER_PLACED + Low Stock audit)
      setImmediate(() => {
        handleBusinessEvent(
          'ORDER_PLACED',
          {
            orderId: order.id,
            totalAmount: order.totalAmount,
            isCustomOrder: Boolean(order.isCustomOrder),
            customerName: order.customer?.name,
          },
          `ORDER_PLACED:${order.id}`
        ).catch(err => console.warn('Non-blocking AI ORDER_PLACED event notice:', err));
      });

      res.status(201).json(created);
    } catch (error: any) {
      console.error('Failed to create order in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });

  // Dedicated endpoint to send or resend order details to admin email ID
  app.post('/api/orders/:id/notify-admin-email', async (req, res) => {
    try {
      const { id } = req.params;
      const { customRecipient } = req.body || {};
      const order = await getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const emailResult = await dispatchOrderEmailToAdmin(order, currentSettings, process.env.APP_URL, customRecipient);

      order.adminEmailNotification = {
        status: emailResult.mode === 'SMTP' ? 'SENT' : (emailResult.mode === 'CONFIG_REQUIRED' ? 'CONFIG_REQUIRED' : 'FAILED'),
        sentAt: emailResult.dispatchedAt,
        targetEmails: emailResult.targetEmails,
        retryCount: (order.adminEmailNotification?.retryCount || 0) + 1,
        lastAttempt: emailResult.dispatchedAt,
        messageId: emailResult.messageId,
        mode: emailResult.mode === 'SMTP' ? 'smtp' : 'log_fallback',
        error: emailResult.error
      };

      await updateOrderInDb(order);
      logAuditEvent(
        'ADMIN_ORDER_EMAIL_RESENT',
        `Admin email notification resent for order ${order.id} to ${emailResult.targetEmails.join(', ')} [${emailResult.mode}]`
      );

      res.json({
        success: emailResult.success,
        mode: emailResult.mode,
        targetEmails: emailResult.targetEmails,
        messageId: emailResult.messageId,
        previewSnippet: emailResult.previewSnippet,
        error: emailResult.error
      });
    } catch (error: any) {
      console.error('Failed to send admin order email:', error);
      res.status(500).json({ error: error.message || 'Failed to dispatch email' });
    }
  });

  // Endpoint to send a test email to admin email ID
  app.post('/api/admin/test-email', requireAdminAuth, async (req, res) => {
    try {
      const { targetEmail } = req.body || {};
      const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const result = await sendAdminTestEmail(targetEmail, currentSettings);
      
      logAuditEvent(
        'ADMIN_TEST_EMAIL_DISPATCHED',
        `Test verification email triggered to ${result.targetEmails.join(', ')} [${result.mode}]`
      );

      res.json(result);
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      res.status(500).json({ error: error.message || 'Failed to send test email' });
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
      setImmediate(() => {
        handleBusinessEvent(
          'ORDER_STATUS_CHANGED',
          { orderId: id, newStatus: status },
          `ORDER_STATUS_CHANGED:${id}:${status}:${Date.now()}`
        ).catch(() => {});
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      res.status(500).json({ error: error.message || 'Failed to update order status' });
    }
  });

  app.put('/api/orders/:id', requireAdminAuth, async (req, res) => {
    try {
      const order: Order = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ error: 'Valid order object is required' });
      }
      const updated = await updateOrderInDb(order);
      logAuditEvent('ADMIN_ORDER_UPDATED', `Full order ${order.id} updated (Total: ₹${order.totalAmount})`);
      setImmediate(() => {
        handleBusinessEvent(
          'ORDER_STATUS_CHANGED',
          { orderId: order.id, newStatus: order.status || 'Updated' },
          `ORDER_UPDATED:${order.id}:${order.status}:${Date.now()}`
        ).catch(() => {});
      });
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update full order in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to update order' });
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

  app.delete('/api/orders', requireAdminAuth, async (req, res) => {
    try {
      const deleted = await deleteAllOrdersInDb();
      logAuditEvent('ADMIN_ALL_ORDERS_DELETED', 'All orders cleared from database by Administrator');
      res.json({ success: true, deleted, message: 'All orders deleted from database successfully.' });
    } catch (error: any) {
      console.error('Failed to clear orders in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to clear all orders' });
    }
  });

  // --- USER SYNCHRONIZATION (Firebase Auth -> Cloud SQL) ---
  app.post('/api/users/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { uid, email } = req.body || {};
      const targetUid = req.user?.uid || uid;
      const targetEmail = (req.user?.email || email || 'customer@hhmineralwater.com').trim();
      if (!targetUid) {
        return res.status(400).json({ error: 'User UID is required' });
      }
      const authorizedAdmins = ['mdhussain170707@gmail.com', 'mdc37332@gmail.com'];
      const verifiedEmail = req.user?.email?.toLowerCase();
      const verifiedRole =
        verifiedEmail && authorizedAdmins.includes(verifiedEmail) ? 'admin' : 'customer';
      const syncedUser = await getOrCreateUser(targetUid, targetEmail, verifiedRole);
      res.json({ success: true, user: syncedUser });
    } catch (error: any) {
      console.error('Failed to sync user to Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'User sync failed' });
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
          const seqMatch = (targetOrder.invoiceNumber || '').match(/(\d+)$/);
          const nextCount = seqMatch ? parseInt(seqMatch[1], 10) : await getNextInvoiceCount();
          const orderForInvoice = {
            ...targetOrder,
            invoiceNumber: targetOrder.invoiceNumber || undefined,
          };
          const newInvoice = generateGstInvoice(orderForInvoice, currentSettings, nextCount);
          if (targetOrder.invoiceNumber) {
            newInvoice.invoiceNumber = targetOrder.invoiceNumber;
            newInvoice.id = targetOrder.invoiceNumber;
          }
          const saved = await createInvoiceInDb(newInvoice);
          invoice = saved || newInvoice;
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

  app.post('/api/invoices', async (req, res) => {
    try {
      const invoice: Invoice = req.body;
      if (!invoice || !invoice.orderId) {
        return res.status(400).json({ error: 'Invalid invoice payload: Order ID is required' });
      }
      const existing = await getInvoiceByOrderId(invoice.orderId);
      if (existing) {
        return res.json(existing);
      }
      const saved = await createInvoiceInDb(invoice);
      res.status(201).json(saved || invoice);
    } catch (error: any) {
      console.error('Failed to save invoice directly:', error);
      res.status(500).json({ error: error.message || 'Failed to save invoice' });
    }
  });

  app.post('/api/invoices/generate', async (req, res) => {
    try {
      const { order, sequenceNumber } = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ error: 'Invalid order structure: Order ID is required' });
      }

      // Check if invoice already exists to prevent duplication
      const existing = await getInvoiceByOrderId(order.id);
      if (existing) {
        return res.json(existing);
      }

      const currentSettings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const seqMatch = (order.invoiceNumber || '').match(/(\d+)$/);
      const nextCount = sequenceNumber || (seqMatch ? parseInt(seqMatch[1], 10) : await getNextInvoiceCount());
      const orderForInvoice = {
        ...order,
        invoiceNumber: order.invoiceNumber || undefined,
      };
      const newInvoice = generateGstInvoice(orderForInvoice, currentSettings, nextCount);
      if (order.invoiceNumber) {
        newInvoice.invoiceNumber = order.invoiceNumber;
        newInvoice.id = order.invoiceNumber;
      }
      const saved = await createInvoiceInDb(newInvoice);
      logAuditEvent('GST_INVOICE_GENERATED', `GST Invoice ${saved?.invoiceNumber || newInvoice.invoiceNumber} created for ${order.id}`);
      res.status(201).json(saved || newInvoice);
    } catch (error: any) {
      console.error('Failed to generate invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to generate invoice' });
    }
  });

  app.delete('/api/invoices/:id', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteInvoiceById(id);
      logAuditEvent('ADMIN_INVOICE_DELETED', `GST Tax Invoice deleted: ${id}`);
      res.json({ success: true, deleted, message: `Invoice ${id} deleted successfully.` });
    } catch (error: any) {
      console.error('Failed to delete invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to delete invoice' });
    }
  });

  app.delete('/api/invoices', requireAdminAuth, async (req, res) => {
    try {
      await deleteAllInvoices();
      logAuditEvent('ADMIN_ALL_INVOICES_DELETED', `All GST Tax Invoices deleted from register.`);
      res.json({ success: true, message: 'All invoices deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete all invoices:', error);
      res.status(500).json({ error: error.message || 'Failed to delete all invoices' });
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

  // --- META WHATSAPP CLOUD API AUTOMATION ENDPOINTS ---
  app.get('/api/notifications/whatsapp/status', async (req, res) => {
    try {
      const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const settingsToken = (settings.whatsappCloudApiToken || '').trim();
      const envToken = (process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();
      const token = settingsToken || envToken;
      const phoneNumberId =
        (settings.whatsappPhoneNumberId || '').trim() ||
        (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
      const rawAdminPhone =
        process.env.ADMIN_WHATSAPP_NUMBER ||
        settings.adminWhatsAppNumber ||
        settings.ownerWhatsApp ||
        '8017341130';
      const targetPhone = normalizeWhatsAppDestination(rawAdminPhone);
      const blockedCheck = isTokenBlocked(token);

      res.json({
        configured: Boolean(token && phoneNumberId && !blockedCheck.blocked),
        hasToken: Boolean(token),
        hasPhoneNumberId: Boolean(phoneNumberId),
        tokenMasked: token ? `${token.slice(0, 6)}...${token.slice(-4)}` : null,
        phoneNumberId: phoneNumberId ? `${phoneNumberId.slice(0, 4)}...${phoneNumberId.slice(-4)}` : null,
        targetPhone: `+${targetPhone}`,
        autoEnabled: (settings.whatsappCloudApiEnabled ?? false) && !blockedCheck.blocked,
        isBlocked: blockedCheck.blocked,
        blockedReason: blockedCheck.reason || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get WhatsApp Cloud API status' });
    }
  });

  app.post('/api/notifications/whatsapp/test', requireAdminAuth, async (req, res) => {
    try {
      const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const { phoneNumberId, token, targetPhone } = req.body;

      const effectiveToken = (token || '').trim() || (settings.whatsappCloudApiToken || '').trim() || (process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();
      const effectivePhoneId = (phoneNumberId || '').trim() || (settings.whatsappPhoneNumberId || '').trim() || (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
      const effectiveTargetPhone = targetPhone || process.env.ADMIN_WHATSAPP_NUMBER || settings.adminWhatsAppNumber || settings.ownerWhatsApp || '8017341130';

      const cleanAdminPhone = (effectiveTargetPhone || '8017341130').replace(/\D/g, '');
      const directWhatsAppUrl = `https://wa.me/91${cleanAdminPhone}?text=${encodeURIComponent(
        `🔔 *HH MINERAL WATER - ADMIN ALERT TEST*\n\n✅ Target Admin WhatsApp: +91 8017341130\n⚡ Order Alert System: Online\n\n📌 *Automated Background Delivery:* Save your Meta Phone Number ID & Token in Admin Settings for background server dispatch without opening WhatsApp.\n💬 Direct 1-Click WhatsApp alerts are ready and operational!`
      )}`;

      if (!effectiveToken || !effectivePhoneId) {
        return res.json({
          success: false,
          mode: 'CONFIG_REQUIRED',
          directWhatsAppUrl,
          targetPhone: cleanAdminPhone,
          error: 'Meta Cloud API credentials not yet configured. Provide Phone Number ID & Access Token for background delivery, or use the 1-Click Test Link below to test receiving messages on +91 8017341130 right now.',
        });
      }

      const result = await sendTestWhatsAppAlert(effectivePhoneId, effectiveToken, effectiveTargetPhone);
      if (result.success) {
        logAuditEvent('WHATSAPP_TEST_ALERT_SENT', `Test WhatsApp alert successfully sent to +${normalizeWhatsAppDestination(effectiveTargetPhone)}`);
        res.json({
          ...result,
          directWhatsAppUrl,
        });
      } else {
        res.json({
          ...result,
          directWhatsAppUrl,
        });
      }
    } catch (error: any) {
      console.warn('Test WhatsApp alert notice:', error);
      res.status(200).json({ success: false, error: error.message || 'Failed to send test WhatsApp message' });
    }
  });

  app.post('/api/notifications/whatsapp/send', requireAdminAuth, async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      const order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const result = await dispatchOrderToAdminWhatsApp(order, settings, process.env.APP_URL);
      if (result.success) {
        order.whatsAppNotification = {
          ...(order.whatsAppNotification || {
            targetPhone: result.targetPhone,
            messageFormatted: '',
            retryCount: 0,
          }),
          status: 'SENT',
          sentAt: result.dispatchedAt,
          lastAttempt: result.dispatchedAt,
          targetPhone: result.targetPhone,
          adminNotification: {
            status: 'SENT',
            targetPhone: result.targetPhone,
            retryCount: 0,
            lastAttempt: result.dispatchedAt,
            messageId: result.messageId,
            sentAt: result.dispatchedAt,
          },
        };
        await updateOrderInDb(order);
        logAuditEvent('WHATSAPP_CLOUD_API_DISPATCHED', `Manual WhatsApp re-dispatch of order #${order.id} sent to +${result.targetPhone}`);
      }
      const rawAdminPhone = process.env.ADMIN_WHATSAPP_NUMBER || settings?.adminWhatsAppNumber || settings?.ownerWhatsApp || '8017341130';
      const cleanAdminPhone = (rawAdminPhone || '8017341130').replace(/\D/g, '');
      const directWhatsAppUrl = `https://wa.me/91${cleanAdminPhone}?text=${encodeURIComponent(
        formatOrderCloudApiMessage(order, process.env.APP_URL)
      )}`;
      res.json({
        ...result,
        directWhatsAppUrl,
      });
    } catch (error: any) {
      console.warn('WhatsApp send notice:', error);
      res.status(200).json({ success: false, error: error.message || 'Failed to dispatch WhatsApp message' });
    }
  });

  // --- AUTOMATED LOW-STOCK MONITORING & RAW MATERIALS INVENTORY ---
  let storedRawMaterials: RawMaterialStockItem[] = [...DEFAULT_RAW_MATERIALS_INVENTORY];

  app.get('/api/inventory/raw-materials', async (req, res) => {
    try {
      res.json(storedRawMaterials);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch raw materials' });
    }
  });

  app.post('/api/inventory/raw-materials', requireAdminAuth, async (req, res) => {
    try {
      const { items } = req.body;
      if (Array.isArray(items)) {
        storedRawMaterials = items;
        logAuditEvent('RAW_MATERIALS_UPDATED', `Raw materials inventory updated (${items.length} items registered)`);
      }
      res.json({ success: true, count: storedRawMaterials.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save raw materials' });
    }
  });

  app.post('/api/inventory/send-low-stock-alert', requireAdminAuth, async (req, res) => {
    try {
      const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const allProducts = await getAllProducts();

      // Use provided summary or compute directly from current database state
      let summary: LowStockAuditSummary = req.body?.summary;
      if (!summary || !Array.isArray(summary.criticalItems)) {
        summary = auditInventoryStockLevels(allProducts, storedRawMaterials, settings);
      }

      const rawAdminPhone =
        process.env.ADMIN_WHATSAPP_NUMBER ||
        settings.adminWhatsAppNumber ||
        settings.ownerWhatsApp ||
        '8017341130';
      const targetPhone = normalizeWhatsAppDestination(rawAdminPhone);
      const appUrl = process.env.APP_URL || 'https://hhmineralwater.com';
      const messageText = formatLowStockWhatsAppMessage(summary, settings, appUrl);
      const directWhatsAppUrl = getLowStockWhatsAppDirectUrl(summary, settings, appUrl);

      // Check Meta WhatsApp Cloud API credentials
      const settingsToken = (settings.whatsappCloudApiToken || '').trim();
      const envToken = (process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();
      const token = settingsToken || envToken;
      const phoneNumberId =
        (settings.whatsappPhoneNumberId || '').trim() ||
        (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();

      const blockedCheck = isTokenBlocked(token);
      let dispatchResult: any = {
        success: false,
        mode: 'DIRECT_WHATSAPP_LINK',
        directWhatsAppUrl,
        targetPhone: `+${targetPhone}`,
        message: messageText,
        summary,
      };

      if (token && phoneNumberId && !blockedCheck.blocked && settings.whatsappCloudApiEnabled !== false) {
        console.log(`[Inventory Alert] Sending automated WhatsApp low-stock alert to +${targetPhone}...`);
        const metaRes = await sendMetaWhatsAppMessage({
          phoneNumberId,
          token,
          recipientPhone: targetPhone,
          messageText,
        });

        if (metaRes.success) {
          dispatchResult = {
            success: true,
            mode: 'META_CLOUD_API',
            messageId: metaRes.messageId,
            directWhatsAppUrl,
            targetPhone: `+${targetPhone}`,
            message: messageText,
            summary,
          };
          logAuditEvent(
            'LOW_STOCK_WHATSAPP_ALERT_SENT',
            `Automated Low-Stock Alert dispatched via Meta Cloud API to +${targetPhone}. ${summary.criticalCount} critical items flagged. Message ID: ${metaRes.messageId}`
          );
        } else {
          dispatchResult = {
            success: false,
            mode: 'CONFIG_REQUIRED',
            error: metaRes.error,
            directWhatsAppUrl,
            targetPhone: `+${targetPhone}`,
            message: messageText,
            summary,
          };
          logAuditEvent(
            'LOW_STOCK_WHATSAPP_ALERT_PREPARED',
            `Direct WhatsApp Low-Stock alert link generated for +${targetPhone} (${summary.criticalCount} critical items)`
          );
        }
      } else {
        logAuditEvent(
          'LOW_STOCK_WHATSAPP_ALERT_PREPARED',
          `Direct WhatsApp Low-Stock alert link prepared for Admin (+${targetPhone}). ${summary.criticalCount} critical items detected.`
        );
      }

      res.json(dispatchResult);
    } catch (err: any) {
      console.warn('Low-stock alert error:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch low-stock alert' });
    }
  });



  // ==========================================================================
  // HH MINERAL WATER — LEVEL 3 AUTONOMOUS AI COMMAND CENTER & SUPPORT APIS
  // ==========================================================================

  app.get('/api/ai/command-center/state', requireAdminAuth, async (req, res) => {
    try {
      await ensureAiSystemBootstrapped();
      const [
        masterConfig,
        agents,
        tasks,
        approvals,
        memory,
        schedules,
        events,
        crossAgentMessages,
        tokenUsage,
        settings,
        firestoreStatus,
      ] = await Promise.all([
        getMasterAiConfig(),
        getAllAiAgents(),
        getAiTasks(80),
        getAllAiApprovals(60),
        getAllAiMemory(),
        getAllAiSchedules(),
        getRecentAiSystemEvents(60),
        getCrossAgentMessages(80),
        getDailyTokenUsageSummary(),
        getStoreSettings(),
        getFirestoreBridgeHealth(),
      ]);

      const waToken = (settings?.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();
      const waPhoneId = (settings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
      const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
      const geminiStatus = getGeminiIntegrationStatus();

      res.json({
        masterConfig,
        agents,
        tasks,
        approvals,
        memory,
        schedules,
        events,
        crossAgentMessages,
        usage: {
          ...tokenUsage,
          dailyBudget: masterConfig.dailyTokenBudget || 500000,
          estimatedUsdToday: Number(((tokenUsage.tokensToday / 1000000) * 0.35).toFixed(4)),
        },
        integrations: {
          gemini: geminiStatus,
          postgresql: { status: 'CONNECTED', database: 'Cloud SQL PostgreSQL' },
          firestore: firestoreStatus,
          whatsappCloudApi: {
            status: waToken && waPhoneId && !isTokenBlocked(waToken).blocked ? 'CONNECTED' : 'CONFIG_REQUIRED',
            detail: waToken && waPhoneId ? 'Credentials present' : 'Set Token & Phone Number ID in Settings or Env',
          },
          smtpEmail: {
            status: smtpConfigured ? 'CONNECTED' : 'CONFIG_REQUIRED',
            detail: smtpConfigured ? 'SMTP active' : 'Set SMTP_USER & SMTP_PASS in Env to send real emails',
          },
        },
      });
    } catch (err: any) {
      console.error('Failed to load AI Command Center state:', err);
      res.status(500).json({ error: err.message || 'Failed to load AI Command Center state' });
    }
  });

  app.get('/api/ai/cross-agent/messages', requireAdminAuth, async (req, res) => {
    try {
      const correlationId = req.query.correlationId ? String(req.query.correlationId) : null;
      const messages = correlationId
        ? await getCrossAgentMessagesByCorrelation(correlationId)
        : await getCrossAgentMessages(80);
      res.json({ success: true, messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load cross-agent messages' });
    }
  });

  app.post('/api/ai/cross-agent/messages/:id/acknowledge', requireAdminAuth, async (req, res) => {
    try {
      const status = String(req.body?.status || 'ACKNOWLEDGED').toUpperCase() === 'RESOLVED' ? 'RESOLVED' : 'ACKNOWLEDGED';
      const updated = await acknowledgeCrossAgentMessage(req.params.id, status);
      if (!updated) return res.status(404).json({ error: 'Cross-agent message not found.' });
      res.json({ success: true, message: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to acknowledge message' });
    }
  });

  app.post('/api/ai/events/dispatch', requireAdminAuth, async (req, res) => {
    try {
      const eventType = String(req.body?.eventType || '').toUpperCase() as BusinessEventType;
      const allowedEvents: BusinessEventType[] = [
        'ORDER_PLACED',
        'ORDER_STATUS_CHANGED',
        'CUSTOM_DESIGN_SUBMITTED',
        'LOW_STOCK_DETECTED',
        'SECURITY_ALERT',
        'API_FAILURE',
        'DAILY_EXECUTIVE_BRIEFING',
      ];
      if (!allowedEvents.includes(eventType)) {
        return res.status(400).json({ error: `Unsupported eventType. Use one of: ${allowedEvents.join(', ')}` });
      }
      const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
      const task = await handleBusinessEvent(
        eventType,
        payload,
        `MANUAL_EVENT:${eventType}:${Date.now()}`
      );
      const recentMessages = await getCrossAgentMessages(25);
      res.json({
        success: task.status !== 'FAILED',
        eventType,
        task,
        crossAgentMessages: recentMessages,
      });
    } catch (err: any) {
      console.error('Dispatch AI event error:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch business event' });
    }
  });

  app.post('/api/ai/master/control', requireAdminAuth, async (req, res) => {
    try {
      const action = String(req.body?.action || '').toUpperCase();
      const adminEmail = (req as any).adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      const statusMap: Record<string, 'RUNNING' | 'PAUSED' | 'STOPPED'> = {
        START: 'RUNNING',
        RESUME: 'RUNNING',
        PAUSE: 'PAUSED',
        STOP: 'STOPPED',
      };
      const nextStatus = statusMap[action];
      if (!nextStatus) {
        return res.status(400).json({ error: 'Invalid master control action. Use START, PAUSE, RESUME, or STOP.' });
      }
      const updated = await setMasterAiStatus(nextStatus, adminEmail, req.body?.reason);
      await recordAiSystemEvent({
        eventType: 'MASTER_AI_CONTROL',
        severity: nextStatus === 'STOPPED' ? 'WARNING' : 'INFO',
        source: adminEmail,
        summary: `Owner ${adminEmail} set Master AI state -> ${nextStatus}.`,
        resolved: true,
        tokensUsed: 0,
      });
      logAuditEvent('AI_MASTER_CONTROL', `Master AI status changed to ${nextStatus} by ${adminEmail}`);
      res.json({ success: true, masterConfig: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update Master AI control' });
    }
  });

  app.post('/api/ai/agents/:id/control', requireAdminAuth, async (req, res) => {
    try {
      await ensureAgentsSeeded();
      const agentId = req.params.id as AgentId;
      const action = String(req.body?.action || '').toUpperCase();
      const adminEmail = (req as any).adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;

      if (action === 'RUN_NOW') {
        const promptByAgent: Record<string, string> = {
          AGENT_01_CEO: 'Show me what needs my attention',
          AGENT_02_ORDER: 'Find all pending orders',
          AGENT_04_INVENTORY: 'Check my complete stock',
          AGENT_05_FINANCE: 'Check all generated invoices',
          AGENT_06_WHATSAPP: 'Check failed WhatsApp messages',
          AGENT_07_MARKETING: 'Create ad copy for wedding custom bottles',
          AGENT_08_SECURITY: 'Run security audit scan on admin logins',
          AGENT_09_RECOVERY: 'Check if any errors happened today',
          AGENT_10_REPORTING: "Prepare today's sales report",
        };
        const cmd = promptByAgent[agentId] || 'Show me what needs my attention';
        const outcome = await processOwnerNaturalLanguageCommand(cmd, adminEmail);
        return res.json({ success: true, mode: 'RUN_NOW', outcome });
      }

      const statusMap: Record<string, AgentStatus> = {
        START: 'ACTIVE',
        ACTIVE: 'ACTIVE',
        RESUME: 'ACTIVE',
        PAUSE: 'PAUSED',
        PAUSED: 'PAUSED',
        STOP: 'STOPPED',
        STOPPED: 'STOPPED',
      };
      const nextStatus = statusMap[action];
      if (!nextStatus) {
        return res.status(400).json({ error: 'Invalid agent action. Use START, PAUSE, STOP, or RUN_NOW.' });
      }
      const updated = await updateAiAgentStatus(agentId, nextStatus);
      if (!updated) {
        return res.status(404).json({ error: `Agent ${agentId} not found.` });
      }
      logAuditEvent('AI_AGENT_STATUS_CHANGED', `Agent ${agentId} set to ${nextStatus} by ${adminEmail}`);
      res.json({ success: true, agent: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update agent control' });
    }
  });

  app.post('/api/ai/orchestrator/command', requireAdminAuth, async (req, res) => {
    try {
      const command = String(req.body?.command || '').trim();
      if (!command) {
        return res.status(400).json({ error: 'Command text is required.' });
      }
      const adminEmail = (req as any).adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      const result = await processOwnerNaturalLanguageCommand(command, adminEmail);
      res.json(result);
    } catch (err: any) {
      console.error('Orchestrator command failed:', err);
      res.status(500).json({ error: err.message || 'Orchestrator failed to process command' });
    }
  });

  app.post('/api/ai/tasks/:id/retry', requireAdminAuth, async (req, res) => {
    try {
      const task = await getAiTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'AI task not found.' });
      }
      const adminEmail = (req as any).adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      const rerun = await processOwnerNaturalLanguageCommand(
        task.taskDescription.replace(/^Owner Command:\s*"?|"?$/g, '') || 'Check system health',
        adminEmail
      );
      await updateAiTask(task.id, {
        status: 'COMPLETED',
        retryCount: task.retryCount + 1,
        completedAt: new Date().toISOString(),
        verificationStatus: 'VERIFIED',
        errorInfo: null,
        executionResult: { manuallyRetriedIntoTaskId: rerun.task.id, summary: rerun.answer },
      });
      res.json({ success: true, originalTaskId: task.id, rerunTask: rerun.task });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retry task' });
    }
  });

  app.post('/api/ai/approvals/:id/decide', requireAdminAuth, async (req, res) => {
    try {
      const approval = await getAiApprovalById(req.params.id);
      if (!approval) {
        return res.status(404).json({ error: 'Approval request not found.' });
      }
      if (approval.status !== 'PENDING') {
        return res.status(400).json({ error: `Approval ${approval.id} already decided (${approval.status}).` });
      }
      const decision = String(req.body?.decision || '').toUpperCase();
      if (decision !== 'APPROVED' && decision !== 'REJECTED') {
        return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED.' });
      }
      const adminEmail = (req as any).adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      const decisionNote = sanitizeUntrustedText(String(req.body?.decisionNote || ''), 300);

      if (decision === 'REJECTED') {
        const rejected = await updateAiApproval(approval.id, {
          status: 'REJECTED',
          ownerEmail: adminEmail,
          decisionNote: decisionNote || 'Rejected by Owner Admin.',
          decidedAt: new Date().toISOString(),
        });
        if (approval.taskId) {
          await updateAiTask(approval.taskId, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            verificationStatus: 'VERIFIED',
            executionResult: { decision: 'REJECTED', note: decisionNote || 'Rejected by Owner' },
          }).catch(() => {});
        }
        return res.json({ success: true, approval: rejected });
      }

      // APPROVED -> Execute backend action cleanly & record verified proof
      const execOutcome = await executeApprovedAction(approval, adminEmail);
      const updated = await updateAiApproval(approval.id, {
        status: execOutcome.success ? 'EXECUTED' : 'APPROVED',
        ownerEmail: adminEmail,
        decisionNote: decisionNote || 'Approved & executed by Owner Admin.',
        decidedAt: new Date().toISOString(),
        executedAt: new Date().toISOString(),
        executionResult: execOutcome,
      });

      if (approval.taskId) {
        await updateAiTask(approval.taskId, {
          status: execOutcome.success ? 'COMPLETED' : 'FAILED',
          completedAt: new Date().toISOString(),
          verificationStatus: execOutcome.success ? 'VERIFIED' : 'FAILED',
          executionResult: execOutcome,
        }).catch(() => {});
      }

      res.json({ success: true, approval: updated, executionOutcome: execOutcome });
    } catch (err: any) {
      console.error('Approval decision error:', err);
      res.status(500).json({ error: err.message || 'Failed to process approval decision' });
    }
  });

  app.post('/api/ai/memory', requireAdminAuth, async (req, res) => {
    try {
      await ensureBusinessMemorySeeded();
      const adminEmail = (req as any).adminSession?.adminEmail || AUTHORIZED_ADMIN_EMAIL;
      const { id, memoryKey, category, sourceType, title, content, confidence } = req.body || {};
      if (!memoryKey || !title) {
        return res.status(400).json({ error: 'memoryKey and title are required.' });
      }
      const saved = await upsertAiMemoryByOwner({
        id: id || `mem-${Date.now()}`,
        memoryKey: sanitizeUntrustedText(String(memoryKey), 80).replace(/\s+/g, '_').toLowerCase(),
        category: category || 'BUSINESS_RULE',
        sourceType: sourceType || 'OWNER_RULE',
        title: sanitizeUntrustedText(String(title), 160),
        content: content ?? {},
        editableByOwner: true,
        confidence: Math.min(100, Math.max(0, Number(confidence ?? 100))),
        updatedBy: adminEmail,
      });
      res.json({ success: true, memory: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save memory record' });
    }
  });

  app.delete('/api/ai/memory/:id', requireAdminAuth, async (req, res) => {
    try {
      const deleted = await deleteAiMemoryById(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Memory entry not found.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete memory record' });
    }
  });

  app.post('/api/ai/schedules/:id/toggle', requireAdminAuth, async (req, res) => {
    try {
      const enabled = Boolean(req.body?.enabled);
      const updated = await updateAiSchedule(req.params.id, { enabled });
      if (!updated) return res.status(404).json({ error: 'Schedule not found.' });
      res.json({ success: true, schedule: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle schedule' });
    }
  });

  app.post('/api/ai/schedules/:id/run', requireAdminAuth, async (req, res) => {
    try {
      const updated = await runScheduleById(req.params.id, true);
      if (!updated) return res.status(404).json({ error: 'Schedule not found.' });
      res.json({ success: true, schedule: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger schedule' });
    }
  });

  app.post('/api/ai/recovery/sweep', requireAdminAuth, async (req, res) => {
    try {
      const workerResult = await processRetryQueueAndSchedules();
      const toolResult = await executeRegisteredTool(
        'run_error_recovery_sweep',
        {},
        { agentId: 'AGENT_09_RECOVERY', agentName: 'AI System Recovery Manager' }
      );
      res.json({ success: true, workerResult, recoveryToolResult: toolResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute recovery sweep' });
    }
  });

  app.post('/api/ai/client-error', async (req, res) => {
    try {
      const message = sanitizeUntrustedText(String(req.body?.message || 'Client runtime notice'), 400);
      await recordAiSystemEvent({
        eventType: 'FRONTEND_RUNTIME_ERROR',
        severity: 'WARNING',
        source: String(req.body?.source || 'browser-client'),
        summary: message,
        details: req.body?.details || null,
        resolved: false,
        tokensUsed: 0,
      });
      res.json({ recorded: true });
    } catch {
      res.json({ recorded: false });
    }
  });

  app.post('/api/ai/customer-support', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { message, orderId, phone } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Please enter a support question.' });
      }
      const outcome = await handleCustomerSupportQuery({
        message,
        userUid: req.user?.uid || null,
        orderId: orderId ? String(orderId) : null,
        phone: phone ? String(phone) : null,
      });
      res.json({ success: true, ...outcome });
    } catch (err: any) {
      console.error('Customer support AI error:', err);
      res.status(500).json({ error: err.message || 'Customer support temporarily unavailable.' });
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

