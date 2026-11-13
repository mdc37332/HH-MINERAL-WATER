import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  CartItem,
  Order,
  CustomDesignDetails,
  CustomerInfo,
  OrderStatus,
  AdminSettings,
  CustomerProfile,
  CustomerAddress,
  AuthModalTab,
  Invoice,
  ProductAuditLog,
  DeliveryCoordinates,
  RawMaterialStockItem,
  LowStockAuditSummary
} from '../types';
import {
  subscribeToProducts,
  subscribeToOrders,
  saveProductToDb,
  deleteProductFromDb,
  deleteAllProductsFromDb,
  saveNewOrderToDb,
  updateOrderStatusInDb,
  updateFullOrderInDb,
  deleteOrderFromDb,
  updateOrderWhatsAppStatusInDb,
  getAdminSettings,
  saveAdminSettings,
  subscribeToAdminSettings,
  deleteInvoiceFromDb,
  deleteAllInvoicesFromDb,
  auth,
  ensureCustomerProfileDoc,
  subscribeToCustomerProfile,
  updateCustomerProfileInDb,
  saveCustomerAddressInDb,
  deleteCustomerAddressInDb,
  logoutCustomer,
  subscribeToProductAuditLogs,
  clearProductAuditLogsInDb,
  saveInvoiceToDb,
  subscribeToInvoices
} from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  fetchProductsApi,
  saveProductApi,
  deleteProductApi,
  deleteAllProductsApi,
  fetchOrdersApi,
  createOrderApi,
  updateOrderStatusApi,
  updateOrderApi,
  deleteOrderApi,
  deleteAllOrdersApi,
  syncUserApi,
  fetchSettingsApi,
  saveSettingsApi,
  adminLoginStep1Api,
  adminResendOtpApi,
  adminVerifyOtpApi,
  adminVerifySessionApi,
  adminLogoutApi,
  adminLogoutAllApi,
  fetchAdminAuditLogsApi,
  fetchProductAuditLogsApi,
  clearProductAuditLogsApi,
  fetchInvoicesApi,
  fetchInvoiceByOrderIdApi,
  generateInvoiceApi,
  deleteInvoiceApi,
  deleteAllInvoicesApi,
  notifyAdminOrderEmailApi,
  sendAdminTestEmailApi,
  sendLowStockWhatsAppAlertApi,
  fetchRawMaterialsApi,
  saveRawMaterialsApi,
  AuditLogItem
} from '../lib/api';
import {
  formatOrderWhatsAppMessage,
  formatCustomerOrderConfirmationWhatsAppMessage,
  normalizePhoneNumber,
  OWNER_WHATSAPP_NUMBER
} from '../lib/whatsapp';
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS, DEFAULT_RAW_MATERIALS_INVENTORY } from '../data/initialProducts';
import { DEFAULT_BOTTLE_IMAGE, isDeadOrDoctorImage } from '../data/bottlePresets';
import { generateGstInvoice } from '../lib/invoiceGenerator';
import { auditInventoryStockLevels, formatLowStockWhatsAppMessage, getLowStockWhatsAppDirectUrl } from '../lib/inventoryMonitor';
import confetti from 'canvas-confetti';
import { safeStorage, cleanStorageBloat } from '../lib/storage';
import { soundAlert } from '../lib/soundAlert';

// Pricing & Discount calculation utilities (Selling Price ON/OFF and % OFF)
export const isProductSellingPriceActive = (product: Product, settings?: AdminSettings): boolean => {
  if (!product) return true;
  if (settings?.showSellingPrice === false) return false;
  if (product.showSellingPrice === false) return false;
  if (Array.isArray(product.tags) && product.tags.includes('selling_price_off')) return false;
  if (Array.isArray(settings?.disabledSellingPriceProductIds) && settings.disabledSellingPriceProductIds.includes(product.id)) return false;
  return true;
};

export const getProductEffectivePrice = (product: Product, settings?: AdminSettings): number => {
  if (!product) return 0;
  const active = isProductSellingPriceActive(product, settings);
  return active ? (product.price || 0) : (product.mrp || product.price || 0);
};

export const getProductDiscountPercent = (product: Product, settings?: AdminSettings): number => {
  if (!product) return 0;
  const active = isProductSellingPriceActive(product, settings);
  if (!active) return 0;
  const effectivePrice = product.price || 0;
  const mrp = product.mrp || effectivePrice;
  if (mrp <= effectivePrice) return 0;
  return Math.round(((mrp - effectivePrice) / mrp) * 100);
};

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface StoreContextType {
  products: Product[];
  orders: Order[];
  myOrders: Order[];
  cart: CartItem[];
  currentSection: 'home' | 'products' | 'custom-design' | 'cart' | 'orders' | 'profile' | 'admin' | 'contact';
  setCurrentSection: (section: 'home' | 'products' | 'custom-design' | 'cart' | 'orders' | 'profile' | 'admin' | 'contact') => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (p: Product | null) => void;
  selectedProductForCustom: Product | null;
  setSelectedProductForCustom: (p: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  
  // 2-Step Verified Admin Session
  isAdminUnlocked: boolean;
  adminToken: string | null;
  adminEmail: string | null;
  adminLoginStep1: (email: string, password: string) => Promise<{ success: boolean; challengeId?: string; maskedEmail?: string; targetPhone?: string; whatsappUrl?: string; liveOtp?: string; masterPin?: string; message?: string; error?: string }>;
  adminResendOtp: (challengeId: string) => Promise<{ success: boolean; whatsappUrl?: string; liveOtp?: string; masterPin?: string; message?: string; error?: string }>;
  adminVerifyOtp: (challengeId: string, otp: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  adminDirectUnlock: (masterCode?: string) => Promise<{ success: boolean; token?: string }>;
  adminLogout: () => Promise<void>;
  adminLogoutAll: () => Promise<boolean>;
  fetchAuditLogs: () => Promise<AuditLogItem[]>;
  adminSettings: AdminSettings;
  updateAdminSettings: (s: AdminSettings) => Promise<void>;

  // Factory Staff Session & Rights (Counter Dispatch & Offline GST Invoicing)
  isFactoryStaffUnlocked: boolean;
  factoryStaffLogin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  factoryStaffLogout: () => void;
  updateFactoryStaffPin: (newPin: string) => Promise<{ success: boolean; error?: string }>;

  // Authentication & Customer Profile
  currentUser: User | null;
  customerProfile: CustomerProfile | null;
  isAuthLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  authActionPrompt: string;
  openAuthModal: (tab?: AuthModalTab, prompt?: string) => void;
  closeAuthModal: () => void;
  updateProfileData: (data: Partial<Pick<CustomerProfile, 'displayName' | 'phone' | 'email'>>) => Promise<void>;
  saveAddress: (address: CustomerAddress) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Cart Actions
  addToCart: (product: Product, quantity: number, customDetails?: CustomDesignDetails) => void;
  updateCartItemQty: (cartItemId: string, delta: number) => void;
  setCartItemQty: (cartItemId: string, qty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  deliveryFee: number;
  cartTotal: number;
  totalCartItemsCount: number;

  // Checkout & Order Actions
  createOrder: (
    customer: CustomerInfo,
    paymentMethod: 'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card',
    notes?: string,
    deliveryOptions?: {
      deliveryType?: 'doorstep' | 'self_pickup';
      deliveryDistanceKm?: number;
      pickupSlot?: string;
      deliveryCoordinates?: DeliveryCoordinates;
    }
  ) => Promise<Order>;
  createOfflineOrderWithInvoice: (params: {
    customer: CustomerInfo;
    items: {
      productId: string;
      productName: string;
      size: string;
      quantity: number;
      unitPrice: number;
      isCustomDesign?: boolean;
    }[];
    paymentMethod: 'Cash' | 'UPI / QR Code' | 'Bank Transfer / NEFT' | 'Credit / Due';
    paymentStatus: 'Paid' | 'Cash Due on Delivery' | 'Pending';
    deliveryType: 'self_pickup' | 'doorstep';
    deliveryCharge?: number;
    discount?: number;
    invoiceDate?: string;
    notes?: string;
    orderStatus?: OrderStatus;
    isCustomOrder?: boolean;
    customLabelDetails?: {
      brandName: string;
      eventType?: string;
      finishType?: string;
      bottleCapColor?: string;
      plateCharge?: number;
      labelDesignFee?: number;
      specialInstructions?: string;
    };
  }) => Promise<{ order: Order; invoice: Invoice }>;
  recentCreatedOrder: Order | null;
  setRecentCreatedOrder: (o: Order | null) => void;
  trackOrderId: string;
  setTrackOrderId: (id: string) => void;

  // GST Invoices
  invoices: Invoice[];
  fetchInvoices: () => Promise<Invoice[]>;
  activeInvoice: Invoice | null;
  setActiveInvoice: (inv: Invoice | null) => void;
  activeInvoiceAutoPrint: boolean;
  setActiveInvoiceAutoPrint: (autoPrint: boolean) => void;
  openInvoiceForOrder: (order: Order, autoPrint?: boolean) => Promise<Invoice | null>;
  openInvoiceById: (invoiceId: string, autoPrint?: boolean) => Promise<Invoice | null>;
  deleteInvoice: (invoiceId: string) => Promise<boolean>;
  deleteAllInvoices: () => Promise<boolean>;

  // Product Audit Logs
  productAuditLogs: ProductAuditLog[];
  fetchProductAuditLogs: () => Promise<ProductAuditLog[]>;
  clearProductAuditLogs: () => Promise<boolean>;

  // Admin & Status Actions
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  toggleAllProductsVisibility: (show: boolean) => Promise<void>;
  toggleAllProductsSellingPrice: (enable: boolean) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteAllProducts: () => Promise<void>;
  resetProductsToDefault: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  updateOrder: (order: Order) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteAllOrders: () => Promise<void>;
  deleteAllCustomOrders: () => Promise<void>;
  autoAdvanceOrder: (orderId: string) => Promise<void>;
  autoAdvanceAllEligibleOrders: () => Promise<number>;
  toggleAutoProgressOrders: (enabled?: boolean) => Promise<void>;
  triggerWhatsAppNotification: (order: Order, isManualRetry?: boolean) => Promise<boolean>;

  // Live Sound Alerts & Desktop Push (Option 2)
  soundAlertEnabled: boolean;
  toggleSoundAlert: () => void;
  testSoundAlert: () => void;
  browserNotificationEnabled: boolean;
  toggleBrowserNotification: () => Promise<void>;
  latestIncomingOrder: Order | null;
  clearIncomingOrderAlert: () => void;

  // Meta WhatsApp Cloud API (Option 4)
  testWhatsAppCloudApi: (phoneNumberId?: string, token?: string, targetPhone?: string) => Promise<{ success: boolean; message?: string; error?: string; mode?: string; directWhatsAppUrl?: string; targetPhone?: string }>;
  sendOrderViaCloudApi: (orderId: string) => Promise<boolean>;

  // Admin Order Email Notifications
  triggerAdminOrderEmail: (orderId: string, customRecipient?: string) => Promise<{ success: boolean; message: string }>;
  sendAdminTestEmail: (targetEmail?: string) => Promise<{ success: boolean; mode?: string; targetEmails?: string[]; error?: string }>;

  // Automated Low-Stock Monitoring & Inventory Management
  rawMaterials: RawMaterialStockItem[];
  lowStockSummary: LowStockAuditSummary;
  runStockAudit: () => LowStockAuditSummary;
  updateRawMaterialStock: (item: RawMaterialStockItem) => Promise<void>;
  addRawMaterialStock: (item: RawMaterialStockItem) => Promise<void>;
  deleteRawMaterialStock: (id: string) => Promise<void>;
  resetRawMaterialsToDefault: () => Promise<void>;
  sendLowStockAlertToWhatsApp: () => Promise<{ success: boolean; mode?: string; directWhatsAppUrl?: string; error?: string; message?: string }>;
  isLowStockBannerDismissed: boolean;
  dismissLowStockBanner: () => void;
  resetLowStockBannerDismissal: () => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const DELETED_PRODUCT_IDS_KEY = 'hh_deleted_product_ids_v1';
const DELETED_ORDER_IDS_KEY = 'hh_deleted_order_ids_v1';
const ORDERS_WIPED_BEFORE_KEY = 'hh_orders_wiped_before_v1';
const DELETED_INVOICE_IDS_KEY = 'hh_deleted_invoice_ids_v1';
const INVOICES_WIPED_BEFORE_KEY = 'hh_invoices_wiped_before_v1';
const DELETED_RAW_MATERIAL_IDS_KEY = 'hh_deleted_raw_material_ids_v1';

function getStoredIdSet(key: string): Set<string> {
  try {
    const raw = safeStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter(Boolean)) : new Set();
  } catch {
    return new Set();
  }
}

function addStoredIds(key: string, ids: (string | undefined | null)[]) {
  try {
    const current = getStoredIdSet(key);
    ids.forEach(id => {
      if (id) current.add(id);
    });
    safeStorage.setItem(key, JSON.stringify(Array.from(current)));
  } catch {}
}

function removeStoredId(key: string, id: string) {
  try {
    const current = getStoredIdSet(key);
    if (current.delete(id)) {
      safeStorage.setItem(key, JSON.stringify(Array.from(current)));
    }
  } catch {}
}

function getStoredTimestamp(key: string): number {
  try {
    const raw = safeStorage.getItem(key);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function setStoredTimestamp(key: string, ts: number) {
  try {
    safeStorage.setItem(key, String(ts));
  } catch {}
}

function isOrderDeleted(o: Order): boolean {
  if (!o) return true;
  const deletedIds = getStoredIdSet(DELETED_ORDER_IDS_KEY);
  if (deletedIds.has(o.id)) return true;
  const wipedBefore = getStoredTimestamp(ORDERS_WIPED_BEFORE_KEY);
  if (wipedBefore > 0) {
    const ms = new Date(o.createdAt || 0).getTime();
    if (ms && ms <= wipedBefore) return true;
  }
  return false;
}

function isInvoiceDeleted(inv: Invoice): boolean {
  if (!inv) return true;
  const deletedIds = getStoredIdSet(DELETED_INVOICE_IDS_KEY);
  if (
    deletedIds.has(inv.id) ||
    (inv.invoiceNumber && deletedIds.has(inv.invoiceNumber)) ||
    (inv.orderId && deletedIds.has(inv.orderId))
  ) {
    return true;
  }
  const wipedBefore = getStoredTimestamp(INVOICES_WIPED_BEFORE_KEY);
  if (wipedBefore > 0) {
    const ms = new Date(inv.createdAt || inv.invoiceDate || 0).getTime();
    if (ms && ms <= wipedBefore) return true;
  }
  return false;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const initStatus = safeStorage.getItem('hh_catalog_initialized_v1');
      if (initStatus === 'cleared') return [];
      const deletedIds = getStoredIdSet(DELETED_PRODUCT_IDS_KEY);
      const saved = safeStorage.getItem('hh_mineral_products_v1') || safeStorage.getItem('hh_products_v1');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Heal any dead/doctor photos from user local cache and keep deleted products excluded
          return parsed
            .filter(p => p && !deletedIds.has(p.id))
            .map(p => {
              const match = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
              const healedImage = isDeadOrDoctorImage(p.image) ? (match?.image || DEFAULT_BOTTLE_IMAGE) : p.image;
              const healedImages = Array.isArray(p.images)
                ? p.images.map(img => (isDeadOrDoctorImage(img) ? (match?.image || DEFAULT_BOTTLE_IMAGE) : img))
                : [healedImage];
              return {
                ...p,
                image: healedImage,
                images: healedImages
              };
            });
        }
      }
      if (initStatus === 'true') return [];
      return INITIAL_PRODUCTS.filter(p => !deletedIds.has(p.id));
    } catch {}
    return INITIAL_PRODUCTS;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  // Option 2: Live Sound Alert & Desktop Push States
  const seenOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialOrderLoadRef = React.useRef(true);
  const [latestIncomingOrder, setLatestIncomingOrder] = useState<Order | null>(null);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(() => soundAlert.isSoundEnabled());
  const [browserNotificationEnabled, setBrowserNotificationEnabled] = useState<boolean>(() => soundAlert.isBrowserNotificationEnabled());
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = safeStorage.getItem('hh_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentSection, setCurrentSection] = useState<'home' | 'products' | 'custom-design' | 'cart' | 'orders' | 'profile' | 'admin' | 'contact'>('home');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Admin Session State (Managed securely with cross-device & reload persistence)
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return safeStorage.getItem('hh_admin_session_token_v2') || 
             (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hh_admin_session_token') : null) || 
             null;
    } catch {
      return null;
    }
  });
  const [adminEmail, setAdminEmail] = useState<string | null>('mdhussain170707@gmail.com');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      const savedToken = safeStorage.getItem('hh_admin_session_token_v2') || 
                         (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hh_admin_session_token') : null);
      return Boolean(savedToken && (savedToken === '170707' || savedToken.startsWith('hh_adm_')));
    } catch {
      return false;
    }
  });
  const [isFactoryStaffUnlocked, setIsFactoryStaffUnlocked] = useState<boolean>(() => {
    try {
      const savedStaff = safeStorage.getItem('hh_factory_staff_session_v1');
      return savedStaff === 'true' || savedStaff === 'unlocked';
    } catch {
      return false;
    }
  });
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    try {
      const cached = safeStorage.getItem('hh_mineral_admin_settings_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          if (isDeadOrDoctorImage(parsed.heroBannerImage)) {
            parsed.heroBannerImage = DEFAULT_ADMIN_SETTINGS.heroBannerImage;
          }
          if (parsed.heroBannerVideo && parsed.heroBannerVideo.includes('coverr.co')) {
            parsed.heroBannerVideo = DEFAULT_ADMIN_SETTINGS.heroBannerVideo;
          }
          return { ...DEFAULT_ADMIN_SETTINGS, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_ADMIN_SETTINGS;
  });
  const [recentCreatedOrder, setRecentCreatedOrder] = useState<Order | null>(null);
  const [trackOrderId, setTrackOrderId] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helpers - defined early and memoized
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  // GST Invoices State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [activeInvoiceAutoPrint, setActiveInvoiceAutoPrint] = useState<boolean>(false);

  // Product Audit Logs State
  const [productAuditLogs, setProductAuditLogs] = useState<ProductAuditLog[]>([]);

  // Raw Material Inventory & Automated Low-Stock Monitoring State
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStockItem[]>(() => {
    try {
      const deletedIds = getStoredIdSet(DELETED_RAW_MATERIAL_IDS_KEY);
      const saved = safeStorage.getItem('hh_raw_materials_inventory');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(item => item && !deletedIds.has(item.id));
      }
      return DEFAULT_RAW_MATERIALS_INVENTORY.filter(item => !deletedIds.has(item.id));
    } catch {}
    return DEFAULT_RAW_MATERIALS_INVENTORY;
  });

  const [isLowStockBannerDismissed, setIsLowStockBannerDismissed] = useState<boolean>(false);

  // Synchronize raw materials with backend on mount
  useEffect(() => {
    fetchRawMaterialsApi()
      .then((items) => {
        if (Array.isArray(items)) {
          const deletedIds = getStoredIdSet(DELETED_RAW_MATERIAL_IDS_KEY);
          const filtered = items.filter(item => item && !deletedIds.has(item.id));
          const hasSaved = safeStorage.getItem('hh_raw_materials_inventory') !== null;
          if (filtered.length > 0 || hasSaved) {
            setRawMaterials(filtered);
            safeStorage.setItem('hh_raw_materials_inventory', JSON.stringify(filtered));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Compute live low-stock status across finished bottles and raw materials
  const lowStockSummary = React.useMemo<LowStockAuditSummary>(() => {
    return auditInventoryStockLevels(products, rawMaterials, adminSettings);
  }, [products, rawMaterials, adminSettings]);

  const runStockAudit = useCallback((): LowStockAuditSummary => {
    const summary = auditInventoryStockLevels(products, rawMaterials, adminSettings);
    if (summary.hasCriticalStock) {
      showToast(
        'Critical Stock Detected!',
        `${summary.criticalCount} item(s) are at or below critical thresholds. Reorder immediately!`,
        'error'
      );
    } else if (summary.hasLowStock) {
      showToast(
        'Low Stock Warning',
        `${summary.warningCount} item(s) have reached reorder level.`,
        'warning'
      );
    } else {
      showToast('Inventory Optimal', 'All bottle and raw material inventories are above reorder thresholds.', 'success');
    }
    return summary;
  }, [products, rawMaterials, adminSettings, showToast]);

  const updateRawMaterialStock = useCallback(async (updatedItem: RawMaterialStockItem) => {
    setRawMaterials((prev) => {
      const next = prev.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      safeStorage.setItem('hh_raw_materials_inventory', JSON.stringify(next));
      saveRawMaterialsApi(next, adminToken).catch(() => {});
      return next;
    });
    showToast('Inventory Updated', `Stock updated for ${updatedItem.name}.`, 'success');
  }, [adminToken, showToast]);

  const addRawMaterialStock = useCallback(async (newItem: RawMaterialStockItem) => {
    removeStoredId(DELETED_RAW_MATERIAL_IDS_KEY, newItem.id);
    setRawMaterials((prev) => {
      const next = [newItem, ...prev];
      safeStorage.setItem('hh_raw_materials_inventory', JSON.stringify(next));
      saveRawMaterialsApi(next, adminToken).catch(() => {});
      return next;
    });
    showToast('Raw Material Added', `${newItem.name} registered into inventory.`, 'success');
  }, [adminToken, showToast]);

  const deleteRawMaterialStock = useCallback(async (id: string) => {
    addStoredIds(DELETED_RAW_MATERIAL_IDS_KEY, [id]);
    setRawMaterials((prev) => {
      const next = prev.filter((item) => item.id !== id);
      safeStorage.setItem('hh_raw_materials_inventory', JSON.stringify(next));
      saveRawMaterialsApi(next, adminToken).catch(() => {});
      return next;
    });
    showToast('Item Removed', 'Raw material permanently removed from inventory.', 'info');
  }, [adminToken, showToast]);

  const resetRawMaterialsToDefault = useCallback(async () => {
    try {
      safeStorage.removeItem(DELETED_RAW_MATERIAL_IDS_KEY);
    } catch {}
    setRawMaterials(DEFAULT_RAW_MATERIALS_INVENTORY);
    safeStorage.setItem('hh_raw_materials_inventory', JSON.stringify(DEFAULT_RAW_MATERIALS_INVENTORY));
    saveRawMaterialsApi(DEFAULT_RAW_MATERIALS_INVENTORY, adminToken).catch(() => {});
    showToast('Inventory Reset', 'Raw materials inventory restored to factory defaults.', 'info');
  }, [adminToken, showToast]);

  const dismissLowStockBanner = useCallback(() => {
    setIsLowStockBannerDismissed(true);
  }, []);

  const resetLowStockBannerDismissal = useCallback(() => {
    setIsLowStockBannerDismissed(false);
  }, []);

  const sendLowStockAlertToWhatsApp = useCallback(async () => {
    try {
      const summary = auditInventoryStockLevels(products, rawMaterials, adminSettings);
      const res = await sendLowStockWhatsAppAlertApi(summary, adminToken);
      if (res.success && res.mode === 'META_CLOUD_API') {
        showToast(
          'WhatsApp Alert Dispatched!',
          `Critical stock alert successfully sent to Admin (+${res.targetPhone || '91 8017341130'}) via Meta Cloud API.`,
          'success'
        );
      } else {
        showToast(
          'WhatsApp Alert Ready',
          `Direct alert link created for Admin WhatsApp (+${res.targetPhone || '91 8017341130'}).`,
          'info'
        );
      }
      return res;
    } catch (err: any) {
      showToast('Alert Failed', err.message || 'Failed to dispatch low-stock WhatsApp alert', 'error');
      return { success: false, error: err.message };
    }
  }, [products, rawMaterials, adminSettings, adminToken, showToast]);

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('login');
  const [authActionPrompt, setAuthActionPrompt] = useState<string>('');

  // Validate admin token on mount
  useEffect(() => {
    async function verifyExistingAdminSession() {
      if (!adminToken) {
        setIsAdminUnlocked(false);
        return;
      }
      const isValid = await adminVerifySessionApi(adminToken);
      if (isValid) {
        setIsAdminUnlocked(true);
      } else {
        // Only clear if definitively invalid and not master token
        if (adminToken !== '170707' && !adminToken.startsWith('hh_adm_')) {
          try {
            safeStorage.removeItem('hh_admin_session_token_v2');
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('hh_admin_session_token');
          } catch {}
          setAdminToken(null);
          setIsAdminUnlocked(false);
        } else {
          setIsAdminUnlocked(true);
        }
      }
    }
    verifyExistingAdminSession();
  }, [adminToken]);

  // Admin Auth Actions
  const adminLoginStep1 = async (email: string, password: string) => {
    return await adminLoginStep1Api(email, password);
  };

  const adminResendOtp = async (challengeId: string) => {
    return await adminResendOtpApi(challengeId);
  };

  const adminVerifyOtp = async (challengeId: string, otp: string) => {
    const res = await adminVerifyOtpApi(challengeId, otp);
    if (res.success && res.token) {
      setAdminToken(res.token);
      setAdminEmail(res.adminEmail || 'mdhussain170707@gmail.com');
      setIsAdminUnlocked(true);
      try {
        safeStorage.setItem('hh_admin_session_token_v2', res.token);
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('hh_admin_session_token', res.token);
      } catch (e) {
        console.warn('Could not set session storage:', e);
      }
      return { success: true, token: res.token };
    }
    return { success: false, error: res.error || 'Verification failed.' };
  };

  const adminDirectUnlock = async (masterCode?: string) => {
    const code = (masterCode || '170707').trim();
    const validCodes = ['170707'];
    if (adminSettings?.adminPin) validCodes.push(adminSettings.adminPin.trim());
    if (!validCodes.includes(code)) {
      showToast('Authentication Failed', 'Invalid Master PIN. Access denied.', 'error');
      return { success: false, error: 'Invalid Master PIN. Access denied.' };
    }
    const token = `hh_adm_${code}_master_session`;
    setAdminToken(token);
    setAdminEmail('mdhussain170707@gmail.com');
    setIsAdminUnlocked(true);
    try {
      safeStorage.setItem('hh_admin_session_token_v2', token);
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('hh_admin_session_token', token);
    } catch {}
    showToast('Admin Panel Unlocked', 'Master owner access verified.', 'success');
    return { success: true, token };
  };

  const adminLogout = async () => {
    if (adminToken) {
      await adminLogoutApi(adminToken);
    }
    try {
      safeStorage.removeItem('hh_admin_session_token_v2');
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('hh_admin_session_token');
      safeStorage.removeItem('hh_factory_staff_session_v1');
    } catch {}
    setAdminToken(null);
    setIsAdminUnlocked(false);
    setIsFactoryStaffUnlocked(false);
    showToast('Admin Session Ended', 'You have been safely logged out from the Admin Panel.', 'info');
  };

  const factoryStaffLogin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const entered = (pin || '').trim();
    const configuredStaffPin = (adminSettings?.factoryStaffPin || '1234').trim() || '1234';
    if (entered && entered === configuredStaffPin) {
      setIsFactoryStaffUnlocked(true);
      try {
        safeStorage.setItem('hh_factory_staff_session_v1', 'true');
      } catch {}
      showToast('Factory Staff Access', 'Counter dispatch & offline GST invoicing unlocked.', 'success');
      return { success: true };
    }
    showToast('Invalid Staff PIN', 'Incorrect 4-digit Factory Staff PIN. Access denied.', 'error');
    return { success: false, error: 'Incorrect 4-digit Factory Staff PIN.' };
  };

  const factoryStaffLogout = () => {
    try {
      safeStorage.removeItem('hh_factory_staff_session_v1');
    } catch {}
    setIsFactoryStaffUnlocked(false);
    showToast('Staff Logged Out', 'Factory staff session ended.', 'info');
  };

  const updateFactoryStaffPin = async (newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminUnlocked) {
      showToast('Admin Only', 'Only Owner Admin can change the Factory Staff Login PIN.', 'error');
      return { success: false, error: 'Only Owner Admin can change the Factory Staff Login PIN.' };
    }
    const cleanPin = (newPin || '').replace(/\D/g, '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      showToast('Invalid Staff PIN', 'Factory Staff Login PIN must be exactly 4 numeric digits.', 'error');
      return { success: false, error: 'Factory Staff Login PIN must be exactly 4 numeric digits.' };
    }

    const updatedSettings: AdminSettings = {
      ...adminSettings,
      factoryStaffPin: cleanPin,
    };
    setAdminSettings(updatedSettings);
    try {
      safeStorage.setItem('hh_mineral_admin_settings_v1', JSON.stringify(updatedSettings));
    } catch {}
    saveAdminSettings(updatedSettings);
    await saveSettingsApi(updatedSettings, adminToken).catch(err => console.warn('Cloud SQL settings sync error:', err));
    showToast('Factory Staff PIN Updated', 'New 4-digit Factory Staff Login PIN is now active.', 'success');
    return { success: true };
  };

  const adminLogoutAll = async () => {
    if (adminToken) {
      await adminLogoutAllApi(adminToken);
    }
    try {
      safeStorage.removeItem('hh_admin_session_token_v2');
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('hh_admin_session_token');
      safeStorage.removeItem('hh_factory_staff_session_v1');
    } catch {}
    setAdminToken(null);
    setIsAdminUnlocked(false);
    setIsFactoryStaffUnlocked(false);
    showToast('All Sessions Terminated', 'Logged out from all active administrator devices.', 'warning');
    return true;
  };

  const fetchAuditLogs = async (): Promise<AuditLogItem[]> => {
    if (!adminToken) return [];
    return await fetchAdminAuditLogsApi(adminToken);
  };


  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureCustomerProfileDoc(user);
          setCustomerProfile(profile);
          syncUserApi(user.uid, user.email || 'customer@hhmineralwater.com', profile?.role || 'customer')
            .catch(e => console.warn('Cloud SQL user sync warning:', e));
        } catch (err) {
          console.warn('Error loading customer profile on auth change:', err);
        }
      } else {
        setCustomerProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to real-time Customer Profile changes when logged in
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToCustomerProfile(currentUser.uid, (profile) => {
      if (profile) setCustomerProfile(profile);
    });
    return () => unsub();
  }, [currentUser]);

  // Persist cart
  useEffect(() => {
    try {
      safeStorage.setItem('hh_cart_v1', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [cart]);

  // Real-time synchronization of Admin Settings (Hero Media, Store Configuration, Delivery)
  useEffect(() => {
    cleanStorageBloat();

    const sanitizeSettings = (raw: any): Partial<AdminSettings> => {
      if (!raw || typeof raw !== 'object') return {};
      const copy = { ...raw };
      if (isDeadOrDoctorImage(copy.heroBannerImage)) {
        copy.heroBannerImage = DEFAULT_ADMIN_SETTINGS.heroBannerImage;
      }
      if (copy.heroBannerVideo && copy.heroBannerVideo.includes('coverr.co')) {
        copy.heroBannerVideo = DEFAULT_ADMIN_SETTINGS.heroBannerVideo;
      }
      return copy;
    };

    const loadSettings = async () => {
      // 1. Fetch from PostgreSQL server API (contains full settings including hero video/media)
      try {
        const apiSettings = await fetchSettingsApi();
        if (apiSettings && typeof apiSettings === 'object') {
          const sanitized = sanitizeSettings(apiSettings);
          setAdminSettings(prev => ({ ...prev, ...sanitized }));
          safeStorage.setItem('hh_mineral_admin_settings_v1', JSON.stringify({ ...apiSettings, ...sanitized }));
        }
      } catch (err) {
        console.warn('Backend settings fetch notice:', err);
      }

      // 2. Fetch from Firestore document if online
      try {
        const fsSettings = await getAdminSettings();
        if (fsSettings && typeof fsSettings === 'object') {
          const sanitized = sanitizeSettings(fsSettings);
          setAdminSettings(prev => ({ ...prev, ...sanitized }));
        }
      } catch (err) {
        console.warn('Firestore settings fetch notice:', err);
      }
    };

    loadSettings();

    // 3. Real-time Firestore snapshot listener for instantaneous cross-device sync
    const unsubSettings = subscribeToAdminSettings(freshSettings => {
      if (freshSettings && typeof freshSettings === 'object') {
        const sanitized = sanitizeSettings(freshSettings);
        setAdminSettings(prev => ({ ...prev, ...sanitized }));
        try {
          safeStorage.setItem('hh_mineral_admin_settings_v1', JSON.stringify({ ...freshSettings, ...sanitized }));
        } catch {}
      }
    });

    // 4. Re-check on window focus (e.g., customer switches back to store tab after admin updates)
    const handleFocus = () => {
      loadSettings();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubSettings();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fetch and subscribe to products (both Cloud SQL and Firestore)
  useEffect(() => {
    // Initial fetch from backend PostgreSQL API
    fetchProductsApi().then(apiProds => {
      if (Array.isArray(apiProds)) {
        const deletedIds = getStoredIdSet(DELETED_PRODUCT_IDS_KEY);
        const initStatus = safeStorage.getItem('hh_catalog_initialized_v1');
        const filteredApi = apiProds.filter(p => p && !deletedIds.has(p.id));
        if (filteredApi.length > 0) {
          setProducts(filteredApi.sort((a, b) => (a.price || 0) - (b.price || 0)));
          try {
            safeStorage.setItem('hh_mineral_products_v1', JSON.stringify(filteredApi));
          } catch {}
        } else if (initStatus === 'cleared' || initStatus === 'true') {
          setProducts([]);
          try {
            safeStorage.setItem('hh_mineral_products_v1', JSON.stringify([]));
          } catch {}
        }
      }
    }).catch(err => {
      console.warn('Initial products API fetch notice:', err);
    });

    const unsub = subscribeToProducts(latestProducts => {
      const deletedIds = getStoredIdSet(DELETED_PRODUCT_IDS_KEY);
      const filteredLatest = Array.isArray(latestProducts)
        ? latestProducts.filter(p => p && !deletedIds.has(p.id))
        : [];
      if (filteredLatest.length === 0) {
        const initStatus = safeStorage.getItem('hh_catalog_initialized_v1');
        if (initStatus === 'true' || initStatus === 'cleared') {
          setProducts([]);
        }
        return;
      }
      setProducts(filteredLatest);

      // Auto synchronize cart items with real-time product price & stock updates
      setCart(currentCart => {
        let changed = false;
        const updatedCart = currentCart.map(item => {
          const matchingProduct = filteredLatest.find(p => p.id === item.productId);
          if (matchingProduct) {
            const effectiveStdPrice = getProductEffectivePrice(matchingProduct, adminSettings);
            const expectedUnitPrice = item.isCustomDesign
              ? (matchingProduct.customDesignPrice || effectiveStdPrice * 2)
              : effectiveStdPrice;
            if (item.unitPrice !== expectedUnitPrice || item.product.price !== matchingProduct.price || item.product.inStock !== matchingProduct.inStock) {
              changed = true;
              return {
                ...item,
                product: matchingProduct,
                unitPrice: expectedUnitPrice,
              };
            }
          }
          return item;
        });
        return changed ? updatedCart : currentCart;
      });
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time orders (both Cloud SQL and Firestore)
  useEffect(() => {
    fetchOrdersApi().then(apiOrders => {
      if (Array.isArray(apiOrders)) {
        const valid = apiOrders.filter(o => !isOrderDeleted(o));
        if (valid.length > 0) {
          setOrders(valid);
        }
      }
    }).catch(err => {
      console.warn('Initial orders API fetch notice:', err);
    });

    const unsub = subscribeToOrders(latestOrders => {
      if (Array.isArray(latestOrders)) {
        setOrders(latestOrders.filter(o => !isOrderDeleted(o)));
      }
    });
    return () => unsub();
  }, []);

  // Option 2: Live Sound Alert & Desktop Push Notification on incoming orders
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    if (isInitialOrderLoadRef.current) {
      // Seed existing order IDs on initial boot
      orders.forEach(o => {
        if (o.id) seenOrderIdsRef.current.add(o.id);
      });
      isInitialOrderLoadRef.current = false;
      return;
    }

    const newOrders = orders.filter(o => o.id && !seenOrderIdsRef.current.has(o.id));
    if (newOrders.length > 0) {
      newOrders.forEach(o => seenOrderIdsRef.current.add(o.id));
      const arrival = newOrders[0];
      setLatestIncomingOrder(arrival);

      // Play synthesized order chime sound
      soundAlert.playOrderChime();

      // Fire desktop push notification if enabled
      soundAlert.showDesktopNotification({
        id: arrival.id,
        totalAmount: arrival.totalAmount,
        customerName: arrival.customer?.name,
        customerPhone: arrival.customer?.phone,
        paymentMethod: arrival.paymentMethod,
        itemsCount: arrival.items?.length,
      });

      showToast(
        '🔔 New Order Received!',
        `Order #${arrival.id} placed by ${arrival.customer?.name || 'Customer'} (₹${arrival.totalAmount}).`,
        'success'
      );
    }
  }, [orders]);

  // Background polling every 10 seconds for real-time order vigilance in Admin
  useEffect(() => {
    if (!isAdminUnlocked) return;
    const interval = setInterval(() => {
      fetchOrdersApi().then(apiOrders => {
        if (Array.isArray(apiOrders) && apiOrders.length > 0) {
          const validApiOrders = apiOrders.filter(o => !isOrderDeleted(o));
          if (validApiOrders.length === 0) return;
          setOrders(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const hasAnyNew = validApiOrders.some(o => !existingIds.has(o.id));
            if (!hasAnyNew) return prev;
            const map = new Map<string, Order>();
            validApiOrders.forEach(o => map.set(o.id, o));
            prev.forEach(o => {
              if (!isOrderDeleted(o) && !map.has(o.id)) map.set(o.id, o);
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        }
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [isAdminUnlocked]);


  // Subscribe to real-time product audit logs
  useEffect(() => {
    const unsub = subscribeToProductAuditLogs(latestLogs => {
      setProductAuditLogs(latestLogs);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time invoices (both Cloud SQL and Firestore)
  useEffect(() => {
    fetchInvoicesApi().then(apiInvoices => {
      if (Array.isArray(apiInvoices) && apiInvoices.length > 0) {
        const validInvoices = apiInvoices.filter(inv => !isInvoiceDeleted(inv));
        if (validInvoices.length > 0) {
          setInvoices(prev => {
            const map = new Map<string, Invoice>();
            validInvoices.forEach(inv => {
              const key = inv.orderId || inv.id || inv.invoiceNumber;
              if (key) map.set(key, inv);
            });
            prev.forEach(inv => {
              if (!isInvoiceDeleted(inv)) {
                const key = inv.orderId || inv.id || inv.invoiceNumber;
                if (key && !map.has(key)) map.set(key, inv);
              }
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          });
        }
      }
    }).catch(err => {
      console.warn('Initial invoices API fetch notice:', err);
    });

    const unsub = subscribeToInvoices(latestInvoices => {
      if (Array.isArray(latestInvoices)) {
        // Enforce deduplication: 1 Order = 1 Invoice, and exclude permanently deleted invoices
        const seen = new Set<string>();
        const deduped: Invoice[] = [];
        for (const inv of latestInvoices) {
          if (isInvoiceDeleted(inv)) continue;
          const key = inv.orderId || inv.id || inv.invoiceNumber;
          if (key && !seen.has(key)) {
            seen.add(key);
            deduped.push(inv);
          }
        }
        setInvoices(deduped);
      }
    });
    return () => unsub();
  }, []);

  const fetchProductAuditLogs = async (): Promise<ProductAuditLog[]> => {
    try {
      const logs = await fetchProductAuditLogsApi(adminToken || '170707');
      if (logs && logs.length > 0) {
        setProductAuditLogs(logs);
        safeStorage.setItem('hh_mineral_prod_audit_v1', JSON.stringify(logs));
        return logs;
      }
      // If SQL api returned empty, try reading local cache
      const cached = safeStorage.getItem('hh_mineral_prod_audit_v1');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProductAuditLogs(parsed);
            return parsed;
          }
        } catch {}
      }
      return productAuditLogs;
    } catch {
      return productAuditLogs;
    }
  };

  const clearProductAuditLogs = async (): Promise<boolean> => {
    setProductAuditLogs([]);
    try {
      safeStorage.setItem('hh_mineral_prod_audit_v1', JSON.stringify([]));
      await Promise.allSettled([
        clearProductAuditLogsInDb(),
        clearProductAuditLogsApi(adminToken || '170707'),
      ]);
    } catch (e) {
      console.warn('clearProductAuditLogs error:', e);
    }
    showToast('Audit Log Cleared', 'Product change audit history has been cleared.', 'info');
    return true;
  };

  // Auth modal open/close helpers
  const openAuthModal = (tab: AuthModalTab = 'login', prompt: string = '') => {
    setAuthModalTab(tab);
    setAuthActionPrompt(prompt);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthActionPrompt('');
  };

  const updateProfileData = async (data: Partial<Pick<CustomerProfile, 'displayName' | 'phone' | 'email'>>) => {
    if (!currentUser) throw new Error('Not logged in');
    await updateCustomerProfileInDb(currentUser.uid, data);
    showToast('Profile Updated', 'Your profile details have been saved.', 'success');
  };

  const saveAddress = async (address: CustomerAddress) => {
    if (!currentUser) throw new Error('Not logged in');
    const updated = await saveCustomerAddressInDb(currentUser.uid, customerProfile?.addresses || [], address);
    setCustomerProfile(prev => prev ? { ...prev, addresses: updated } : prev);
    showToast('Address Saved', `${address.label} address successfully updated.`, 'success');
  };

  const deleteAddress = async (addressId: string) => {
    if (!currentUser) throw new Error('Not logged in');
    const updated = await deleteCustomerAddressInDb(currentUser.uid, customerProfile?.addresses || [], addressId);
    setCustomerProfile(prev => prev ? { ...prev, addresses: updated } : prev);
    showToast('Address Removed', 'Saved delivery address was deleted.', 'info');
  };

  const logout = async () => {
    await logoutCustomer();
    setCurrentUser(null);
    setCustomerProfile(null);
    if (currentSection === 'profile') {
      setCurrentSection('home');
    }
    showToast('Logged Out', 'You have been securely signed out.', 'info');
  };

  // Computed: My Orders for logged in user
  const myOrders = React.useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(o => {
      if (o.userUid && o.userUid === currentUser.uid) return true;
      if (currentUser.email && o.customer?.email?.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (customerProfile?.phone && o.customer?.phone === customerProfile.phone) return true;
      return false;
    });
  }, [orders, currentUser, customerProfile]);

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const deliveryFee =
    cartSubtotal === 0 || cartSubtotal >= adminSettings.freeDeliveryMinAmount
      ? 0
      : adminSettings.defaultDeliveryCharge;
  const cartTotal = cartSubtotal + deliveryFee;
  const totalCartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Add to cart
  const addToCart = (product: Product, quantity: number, customDetails?: CustomDesignDetails) => {
    const isCustom = !!customDetails;
    // For custom design orders: minimum 600 pieces and unit price is base custom rate (or admin custom price override) + enabled features
    const effectiveQty = isCustom ? Math.max(600, quantity) : quantity;
    const baseCustomPrice = customDetails?.customPricePerBottle || product.customDesignPrice || (product.price * 2);
    const featuresExtra = isCustom && customDetails?.customFeatures
      ? customDetails.customFeatures.filter(f => f.enabled).reduce((sum, f) => sum + (f.pricePerBottle || 0), 0)
      : 0;
    const effectiveStdPrice = getProductEffectivePrice(product, adminSettings);
    const unitPrice = isCustom ? (baseCustomPrice + featuresExtra) : effectiveStdPrice;

    const cartItemId = isCustom
      ? `custom-${product.id}-${Date.now()}`
      : `std-${product.id}`;

    setCart(prev => {
      // If standard product already exists in cart, update quantity
      if (!isCustom) {
        const existingIdx = prev.findIndex(item => item.cartItemId === cartItemId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + effectiveQty
          };
          return updated;
        }
      }
      
      const newItem: CartItem = {
        cartItemId,
        productId: product.id,
        product,
        quantity: effectiveQty,
        unitPrice,
        isCustomDesign: isCustom,
        customDesignDetails: customDetails,
        addedAt: new Date().toISOString()
      };
      return [...prev, newItem];
    });

    showToast(
      isCustom ? 'Custom Design Order Added!' : 'Added to Cart!',
      isCustom
        ? `${effectiveQty} × ${product.name} (${product.size}) @ ₹${unitPrice}/bottle (Min 600 pcs batch) added to your shopping bag.`
        : `${quantity} × ${product.name} (${product.size}) added to your shopping bag.`,
      'success'
    );
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            if (item.isCustomDesign) {
              const next = item.quantity + delta;
              if (next < 600) {
                if (delta < 0 && item.quantity <= 600) {
                  showToast('Minimum Order 600 Pcs', 'Custom design orders require a minimum batch of 600 pieces. Click the delete icon to remove.', 'info');
                  return item;
                }
                return { ...item, quantity: 600 };
              }
              return { ...item, quantity: next };
            }
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setCartItemQty = (cartItemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const finalQty = item.isCustomDesign ? Math.max(600, qty) : qty;
          return { ...item, quantity: finalQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    showToast('Item Removed', 'Product was removed from your bag.', 'info');
  };

  const clearCart = () => {
    setCart([]);
  };

  // Trigger WhatsApp notification for an order (Attempts Meta Cloud API first, falls back to direct link)
  const triggerWhatsAppNotification = async (order: Order, isManualRetry = false): Promise<boolean> => {
    try {
      let cloudDispatched = false;
      try {
        const response = await fetch('/api/notifications/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
          },
          body: JSON.stringify({ orderId: order.id }),
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            cloudDispatched = true;
          }
        }
      } catch (cloudErr) {
        console.warn('Meta WhatsApp Cloud API call notice:', cloudErr);
      }

      await updateOrderWhatsAppStatusInDb(order.id, cloudDispatched ? 'SENT' : 'PENDING', isManualRetry ? 1 : 0);

      if (cloudDispatched) {
        showToast(
          'WhatsApp Dispatched',
          `Order confirmation automatically delivered to Admin WhatsApp (+91 ${adminSettings.ownerWhatsApp || OWNER_WHATSAPP_NUMBER}).`,
          'success'
        );
      } else {
        showToast(
          'WhatsApp Prepared',
          `Direct WhatsApp link ready for dispatch to HH Admin (${adminSettings.ownerWhatsApp || OWNER_WHATSAPP_NUMBER}).`,
          'info'
        );
      }
      return true;
    } catch (e) {
      console.warn('Failed to update WhatsApp notification state:', e);
      return false;
    }
  };

  const toggleSoundAlert = () => {
    const next = !soundAlertEnabled;
    soundAlert.setSoundEnabled(next);
    setSoundAlertEnabled(next);
    showToast(
      next ? 'Sound Alerts Active' : 'Sound Alerts Muted',
      next ? 'You will hear a bell chime whenever a new order arrives.' : 'Order sound chime is now muted.',
      'info'
    );
  };

  const testSoundAlert = () => {
    soundAlert.testChime();
    showToast('Sound Test', 'Melodic order alert chime played successfully.', 'success');
  };

  const toggleBrowserNotification = async () => {
    if (!browserNotificationEnabled) {
      const perm = await soundAlert.requestNotificationPermission();
      soundAlert.setBrowserNotificationEnabled(true);
      setBrowserNotificationEnabled(true);
      if (perm === 'granted') {
        showToast('Desktop Alerts Active', 'System popups and order alerts enabled.', 'success');
      } else {
        showToast('Live Alert System Active', 'Order notifications active! Live chime sound & high-visibility banner will alert you.', 'info');
      }
    } else {
      soundAlert.setBrowserNotificationEnabled(false);
      setBrowserNotificationEnabled(false);
      showToast('Desktop Alerts Disabled', 'Browser push notifications turned off.', 'info');
    }
  };

  const clearIncomingOrderAlert = () => {
    setLatestIncomingOrder(null);
  };

  const testWhatsAppCloudApi = async (phoneNumberId?: string, token?: string, targetPhone?: string) => {
    try {
      const response = await fetch('/api/notifications/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || '170707'}`,
        },
        body: JSON.stringify({
          phoneNumberId,
          token,
          targetPhone: targetPhone || adminSettings.adminWhatsAppNumber || adminSettings.ownerWhatsApp || '8017341130',
        }),
      });
      const data = await response.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to communicate with test endpoint' };
    }
  };

  const sendOrderViaCloudApi = async (orderId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || '170707'}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (data.success) {
        showToast('WhatsApp Sent', `Order #${orderId} delivered to Admin WhatsApp (+${data.targetPhone}).`, 'success');
        return true;
      } else {
        showToast('Delivery Notice', data.error || 'Meta Cloud API credentials need to be configured.', 'warning');
        return false;
      }
    } catch (e: any) {
      showToast('Dispatch Error', e.message || 'Failed to dispatch via Meta Cloud API', 'error');
      return false;
    }
  };

  // Trigger automated background order email to Admin email ID (mdc37332@gmail.com, mdhussain170707@gmail.com)
  const triggerAdminOrderEmail = async (orderId: string, customRecipient?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await notifyAdminOrderEmailApi(orderId, customRecipient);
      if (res.success) {
        showToast(
          'Email Notification Sent',
          `Order #${orderId} details dispatched to Admin (${(res.targetEmails || ['mdc37332@gmail.com']).join(', ')}).`,
          'success'
        );
        return { success: true, message: `Dispatched to ${(res.targetEmails || []).join(', ')}` };
      } else {
        if (res.mode === 'CONFIG_REQUIRED') {
          showToast(
            'Admin Email Alert Prepared',
            `Order details logged and ready. Configure SMTP_USER and SMTP_PASS in Settings to deliver directly to your inbox.`,
            'info'
          );
        } else {
          showToast(
            'Email Delivery Notice',
            res.error || 'Could not dispatch email.',
            'warning'
          );
        }
        return { success: false, message: res.error || 'Failed' };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to dispatch email' };
    }
  };

  const sendAdminTestEmail = async (targetEmail?: string) => {
    try {
      const res = await sendAdminTestEmailApi(targetEmail, adminToken);
      if (res.success) {
        showToast(
          'Test Email Dispatched',
          `Verification alert dispatched to ${(res.targetEmails || []).join(', ')}.`,
          'success'
        );
      } else {
        showToast(
          'Email Notice',
          res.error || 'Check SMTP configuration in settings.',
          'warning'
        );
      }
      return res;
    } catch (e: any) {
      showToast('Test Email Error', e.message || 'Failed to send test email', 'error');
      return { success: false, error: e.message };
    }
  };


  // Create Order
  const createOrder = async (
    customer: CustomerInfo,
    paymentMethod: 'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card',
    notes?: string,
    deliveryOptions?: {
      deliveryType?: 'doorstep' | 'self_pickup';
      deliveryDistanceKm?: number;
      pickupSlot?: string;
      deliveryCoordinates?: DeliveryCoordinates;
    }
  ): Promise<Order> => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderId = `HH-ORD-${randomSuffix}`;
    const now = new Date().toISOString();

    const isCustomOrder = cart.some(item => item.isCustomDesign);
    const hasOriginalImage = cart.some(
      item => item.customDesignDetails?.uploadedImages && item.customDesignDetails.uploadedImages.some(img => img.mediaType !== 'video' && !img.type?.startsWith('video/'))
    );
    const hasUploadedVideo = cart.some(
      item =>
        (item.customDesignDetails?.uploadedVideos && item.customDesignDetails.uploadedVideos.length > 0) ||
        (item.customDesignDetails?.uploadedImages && item.customDesignDetails.uploadedImages.some(img => img.mediaType === 'video' || img.type?.startsWith('video/')))
    );

    // Normalize customer phone for WhatsApp delivery
    const phoneNorm = normalizePhoneNumber(customer.phone);
    const normalizedCustomerPhone = phoneNorm.isValid ? phoneNorm.normalized : customer.phone;

    // Delivery vs Self-Pickup calculation
    const isSelfPickup = deliveryOptions?.deliveryType === 'self_pickup';
    const effectiveDeliveryFee = isSelfPickup ? 0 : deliveryFee;
    const effectiveTotalAmount = cartSubtotal + effectiveDeliveryFee;

    const newOrder: Order = {
      id: orderId,
      userUid: currentUser?.uid,
      createdAt: now,
      customer: {
        ...customer,
        phone: phoneNorm.isValid ? phoneNorm.display : customer.phone,
      },
      items: [...cart],
      subtotal: cartSubtotal,
      deliveryCharge: effectiveDeliveryFee,
      discount: 0,
      totalAmount: effectiveTotalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'Cash on Delivery (COD)' ? 'Cash Due on Delivery' : 'Paid',
      orderNotes: notes,
      isCustomOrder,
      hasOriginalImage,
      hasUploadedVideo,
      deliveryType: isSelfPickup ? 'self_pickup' : 'doorstep',
      deliveryDistanceKm: deliveryOptions?.deliveryDistanceKm,
      pickupSlot: deliveryOptions?.pickupSlot || (isSelfPickup ? (adminSettings.selfPickupTimings || 'Mon - Sun: 8:30 AM - 8:30 PM') : undefined),
      pickupLocation: isSelfPickup ? (adminSettings.selfPickupAddress || 'Factory Dispatch Counter #1, Plot 12, Sector V, Salt Lake, Kolkata, West Bengal - 700091') : undefined,
      deliveryCoordinates: deliveryOptions?.deliveryCoordinates || customer.deliveryCoordinates,
      status: 'New',
      statusHistory: [
        {
          status: 'New',
          timestamp: now,
          note: isSelfPickup
            ? 'Order placed for Self Pickup at Factory Counter'
            : 'Order placed successfully by customer (Doorstep Delivery)'
        }
      ],
      whatsAppNotification: {
        status: 'PENDING',
        targetPhone: OWNER_WHATSAPP_NUMBER,
        messageFormatted: '',
        retryCount: 0,
        customerNotification: {
          status: 'PENDING',
          targetPhone: normalizedCustomerPhone,
          recipientName: customer.name,
          messageFormatted: '',
          retryCount: 0,
          lastAttempt: now,
        },
        adminNotification: {
          status: 'PENDING',
          targetPhone: OWNER_WHATSAPP_NUMBER,
          recipientName: 'HH Admin (Hussain)',
          messageFormatted: '',
          retryCount: 0,
          lastAttempt: now,
        }
      }
    };

    // Generate GST Tax Invoice immediately for the order
    const maxExistingSeq = invoices.reduce((max, inv) => {
      const match = (inv.invoiceNumber || '').match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, 0);
    const nextSeq = maxExistingSeq + 1;
    const generatedInvoice = generateGstInvoice(newOrder, adminSettings, nextSeq);
    newOrder.invoiceNumber = generatedInvoice.invoiceNumber;

    // Format WhatsApp messages
    const formattedAdminMessage = formatOrderWhatsAppMessage(newOrder);
    const formattedCustomerMessage = formatCustomerOrderConfirmationWhatsAppMessage(newOrder);
    newOrder.whatsAppNotification.messageFormatted = formattedAdminMessage;
    if (newOrder.whatsAppNotification.adminNotification) {
      newOrder.whatsAppNotification.adminNotification.messageFormatted = formattedAdminMessage;
    }
    if (newOrder.whatsAppNotification.customerNotification) {
      newOrder.whatsAppNotification.customerNotification.messageFormatted = formattedCustomerMessage;
    }

    // 1. Save to Database (Firestore & Cloud SQL) and generate Invoice
    const [dbSaveRes, invSaveRes, apiOrderRes] = await Promise.allSettled([
      saveNewOrderToDb(newOrder),
      saveInvoiceToDb(generatedInvoice),
      createOrderApi(newOrder),
    ]);

    // If Cloud SQL API returned an authoritative invoiceNumber, sync it locally & with Firestore
    if (apiOrderRes.status === 'fulfilled' && (apiOrderRes.value as any)?.invoiceNumber) {
      const authNumber = (apiOrderRes.value as any).invoiceNumber;
      if (authNumber && authNumber !== generatedInvoice.invoiceNumber) {
        const oldInvoiceId = generatedInvoice.id;
        const oldInvoiceNumber = generatedInvoice.invoiceNumber;
        // Clean up outdated duplicate invoice document immediately
        deleteInvoiceFromDb(oldInvoiceId, oldInvoiceNumber).catch(() => {});

        newOrder.invoiceNumber = authNumber;
        generatedInvoice.invoiceNumber = authNumber;
        generatedInvoice.id = authNumber;
        saveInvoiceToDb(generatedInvoice).catch(() => {});
      }
    }

    await triggerWhatsAppNotification(newOrder, false);

    // Automated dispatch of complete order details to Admin Email (mdc37332@gmail.com, mdhussain170707@gmail.com)
    triggerAdminOrderEmail(newOrder.id).catch(err => {
      console.warn('Background admin email notification notice:', err);
    });

    // Update local state collections
    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    setInvoices(prev => [generatedInvoice, ...prev.filter(inv => inv.orderId !== newOrder.id)]);

    // 2. Clear cart & set recent order
    clearCart();
    setRecentCreatedOrder(newOrder);
    setTrackOrderId(orderId);

    // Celebrate with confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    return newOrder;
  };

  // Create Offline Customer Order & Generate Compliant GST Tax Invoice
  const createOfflineOrderWithInvoice = async (params: {
    customer: CustomerInfo;
    items: {
      productId: string;
      productName: string;
      size: string;
      quantity: number;
      unitPrice: number;
      isCustomDesign?: boolean;
    }[];
    paymentMethod: 'Cash' | 'UPI / QR Code' | 'Bank Transfer / NEFT' | 'Credit / Due';
    paymentStatus: 'Paid' | 'Cash Due on Delivery' | 'Pending';
    deliveryType: 'self_pickup' | 'doorstep';
    deliveryCharge?: number;
    discount?: number;
    invoiceDate?: string;
    notes?: string;
    orderStatus?: OrderStatus;
    isCustomOrder?: boolean;
    customLabelDetails?: {
      brandName: string;
      eventType?: string;
      finishType?: string;
      bottleCapColor?: string;
      plateCharge?: number;
      labelDesignFee?: number;
      specialInstructions?: string;
    };
  }): Promise<{ order: Order; invoice: Invoice }> => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderId = `HH-OFF-${randomSuffix}`;
    const now = params.invoiceDate ? new Date(params.invoiceDate).toISOString() : new Date().toISOString();

    const isCustom = Boolean(params.isCustomOrder || (params.customLabelDetails?.brandName && params.customLabelDetails.brandName.trim()));
    const customDesignDetails: CustomDesignDetails | undefined = isCustom ? {
      eventType: (params.customLabelDetails?.eventType as any) || 'Corporate',
      businessName: params.customLabelDetails?.brandName || params.customer.name,
      finishType: (params.customLabelDetails?.finishType as any) || 'Matte Luxury',
      bottleCapColor: params.customLabelDetails?.bottleCapColor || 'Royal Gold',
      labelThemeColor: '#C5A059',
      labelTextColor: '#FFFFFF',
      specialInstructions: params.customLabelDetails?.specialInstructions || 'Custom labeled bottle billing',
      uploadedImages: []
    } : undefined;

    const subtotal = params.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const effectiveDeliveryFee = params.deliveryType === 'self_pickup' ? 0 : (params.deliveryCharge || 0);
    const discount = params.discount || 0;
    const effectiveTotalAmount = Math.max(0, subtotal + effectiveDeliveryFee - discount);

    const phoneNorm = normalizePhoneNumber(params.customer.phone);
    const normalizedCustomerPhone = phoneNorm.isValid ? phoneNorm.normalized : params.customer.phone;

    const cartItems: CartItem[] = params.items.map((it, idx) => {
      const match = products.find(p => p.id === it.productId);
      const isItemCustom = isCustom || Boolean(it.isCustomDesign);
      const productObj: Product = match
        ? { ...match, name: it.productName || match.name, price: it.unitPrice, size: it.size }
        : {
            id: it.productId,
            name: it.productName,
            size: it.size,
            price: it.unitPrice,
            mrp: it.unitPrice,
            image: '',
            description: `${it.size} packaged water`,
            shortDesc: `${it.size} packaged water`,
            inStock: true,
            minOrderQty: 1,
            category: 'Standard',
            features: ['IS 14543 Certified', '18% GST Compliant'],
            mineralInfo: {
              calcium: '20 mg/L',
              magnesium: '10 mg/L',
              potassium: '3 mg/L',
              sodium: '15 mg/L',
              bicarbonate: '60 mg/L',
              silica: '12 mg/L',
              tds: '120 mg/L',
              ph: '7.2'
            },
            casePackSize: 1
          };

      return {
        cartItemId: `offline-item-${Date.now()}-${idx}`,
        productId: it.productId,
        product: productObj,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        isCustomDesign: isItemCustom,
        customDesignDetails: isItemCustom ? customDesignDetails : undefined,
        addedAt: now
      };
    });

    const status: OrderStatus = params.orderStatus || 'Delivered';
    const statusNote = params.deliveryType === 'self_pickup'
      ? (isCustom ? 'Custom Label Offline Counter Sale - Handed over at plant' : 'Offline Counter Direct Sale - Handed over at plant')
      : (isCustom ? 'Custom Label Offline Order - Direct Dispatch' : 'Offline Customer Order - Direct Dispatch');

    const defaultNotes = isCustom
      ? `[Custom Label Branded Sale] Brand: "${params.customLabelDetails?.brandName || params.customer.name}" • Finish: ${params.customLabelDetails?.finishType || 'Matte Luxury'} • Cap: ${params.customLabelDetails?.bottleCapColor || 'Royal Gold'}`
      : '[Offline Customer Walk-in / Direct Sale]';

    const orderNotes = params.notes
      ? (isCustom ? `[Custom Label: "${params.customLabelDetails?.brandName || params.customer.name}"] ${params.notes}` : `[Offline Sale] ${params.notes}`)
      : defaultNotes;

    const newOrder: Order = {
      id: orderId,
      createdAt: now,
      customer: {
        ...params.customer,
        phone: phoneNorm.isValid ? phoneNorm.display : params.customer.phone,
        isOfflineCustomer: true
      },
      items: cartItems,
      subtotal,
      deliveryCharge: effectiveDeliveryFee,
      discount,
      totalAmount: effectiveTotalAmount,
      paymentMethod: params.paymentMethod === 'Cash' ? 'Cash on Delivery (COD)' : (params.paymentMethod as any),
      paymentStatus: params.paymentStatus === 'Paid' ? 'Paid' : 'Cash Due on Delivery',
      orderNotes,
      isCustomOrder: isCustom,
      customLabelDetails: isCustom ? params.customLabelDetails : undefined,
      hasOriginalImage: false,
      hasUploadedVideo: false,
      status,
      deliveryType: params.deliveryType || 'self_pickup',
      pickupLocation: params.deliveryType === 'self_pickup' ? (adminSettings.selfPickupAddress || 'Factory Dispatch Counter, Plot 12, Sector V, Salt Lake, Kolkata') : undefined,
      isOfflineSale: true,
      orderSource: 'offline_counter',
      statusHistory: [
        {
          status,
          timestamp: now,
          note: statusNote,
          updatedBy: 'Admin (Counter Sales)'
        }
      ],
      whatsAppNotification: {
        status: 'PENDING',
        targetPhone: OWNER_WHATSAPP_NUMBER,
        messageFormatted: '',
        retryCount: 0,
        customerNotification: {
          status: 'PENDING',
          targetPhone: normalizedCustomerPhone,
          recipientName: params.customer.name,
          messageFormatted: '',
          retryCount: 0,
          lastAttempt: now,
        },
        adminNotification: {
          status: 'PENDING',
          targetPhone: OWNER_WHATSAPP_NUMBER,
          recipientName: 'HH Admin (Hussain)',
          messageFormatted: '',
          retryCount: 0,
          lastAttempt: now,
        }
      }
    };

    // Calculate sequential invoice number and generate GST Tax Invoice
    const maxExistingSeq = invoices.reduce((max, inv) => {
      const match = (inv.invoiceNumber || '').match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, 0);
    const nextSeq = maxExistingSeq + 1;
    const generatedInvoice = generateGstInvoice(newOrder, adminSettings, nextSeq);
    generatedInvoice.isOfflineInvoice = true;
    generatedInvoice.orderSource = 'offline_counter';
    newOrder.invoiceNumber = generatedInvoice.invoiceNumber;
    newOrder.invoiceId = generatedInvoice.id;

    // Save to Firestore and Cloud SQL API
    const [dbSaveRes, invSaveRes, apiOrderRes] = await Promise.allSettled([
      saveNewOrderToDb(newOrder),
      saveInvoiceToDb(generatedInvoice),
      createOrderApi(newOrder),
    ]);

    const authNumber =
      apiOrderRes.status === 'fulfilled' && (apiOrderRes.value as any)?.invoiceNumber
        ? (apiOrderRes.value as any).invoiceNumber
        : null;

    if (authNumber && authNumber !== generatedInvoice.invoiceNumber) {
      const oldInvoiceId = generatedInvoice.id;
      const oldInvoiceNumber = generatedInvoice.invoiceNumber;
      deleteInvoiceFromDb(oldInvoiceId, oldInvoiceNumber).catch(() => {});

      newOrder.invoiceNumber = authNumber;
      generatedInvoice.invoiceNumber = authNumber;
      generatedInvoice.id = authNumber;
      saveInvoiceToDb(generatedInvoice).catch(() => {});
    }

    // Update local state collections
    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    setInvoices(prev => [generatedInvoice, ...prev.filter(inv => inv.orderId !== newOrder.id)]);

    // Automated dispatch of complete order details to Admin Email
    triggerAdminOrderEmail(newOrder.id).catch(() => {});

    // Open active invoice in modal for 1-click printing / PDF download
    setActiveInvoice(generatedInvoice);
    setActiveInvoiceAutoPrint(false);

    showToast(
      'GST Invoice Generated',
      `Invoice ${generatedInvoice.invoiceNumber} created for ${newOrder.customer.name}. Revenue updated by ₹${(newOrder.totalAmount - newOrder.deliveryCharge).toFixed(2)}.`,
      'success'
    );

    return { order: newOrder, invoice: generatedInvoice };
  };

  // GST Invoice helpers
  const fetchInvoices = async (): Promise<Invoice[]> => {
    const list = await fetchInvoicesApi();
    if (Array.isArray(list)) {
      const seen = new Set<string>();
      const deduped: Invoice[] = [];
      for (const inv of list) {
        if (isInvoiceDeleted(inv)) continue;
        const key = inv.orderId || inv.id || inv.invoiceNumber;
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(inv);
        }
      }
      setInvoices(deduped);
      return deduped;
    }
    return [];
  };

  const openInvoiceForOrder = async (order: Order, autoPrint = false): Promise<Invoice | null> => {
    // Check if we already have it in local state (by orderId or invoiceNumber)
    let target = invoices.find(inv => 
      inv.orderId === order.id || 
      (Boolean(order.invoiceNumber) && inv.invoiceNumber === order.invoiceNumber)
    );
    if (!target) {
      // Immediately generate invoice preserving existing order sequence
      const seqMatch = (order.invoiceNumber || '').match(/(\d+)$/);
      const seq = seqMatch ? parseInt(seqMatch[1], 10) : (invoices.length || 0) + 1;
      target = generateGstInvoice(order, adminSettings, seq);
      if (order.invoiceNumber) {
        target.invoiceNumber = order.invoiceNumber;
        target.id = order.invoiceNumber;
      }
      // Synchronize in background non-blockingly
      fetchInvoiceByOrderIdApi(order.id).then(serverInv => {
        if (serverInv) {
          setInvoices(prev => prev.map(inv => inv.orderId === order.id ? serverInv : inv));
          setActiveInvoice(current => current?.orderId === order.id ? serverInv : current);
        } else {
          saveInvoiceToDb(target!).catch(e => console.warn('Firestore invoice sync error:', e));
          generateInvoiceApi(order).catch(e => console.warn('Background invoice sync error:', e));
        }
      }).catch(() => {
        saveInvoiceToDb(target!).catch(e => console.warn('Firestore invoice sync error:', e));
        generateInvoiceApi(order).catch(e => console.warn('Background invoice sync error:', e));
      });
    }
    if (target) {
      setInvoices(prev => {
        if (!prev.some(inv => inv.id === target!.id || inv.orderId === target!.orderId)) {
          return [target!, ...prev];
        }
        return prev;
      });
    }
    setActiveInvoiceAutoPrint(autoPrint);
    setActiveInvoice(target);
    return target;
  };

  const openInvoiceById = async (invoiceId: string, autoPrint = false): Promise<Invoice | null> => {
    let target = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId || inv.orderId === invoiceId) || null;
    if (!target) {
      target = await fetchInvoiceByOrderIdApi(invoiceId);
    }
    if (!target) {
      const list = await fetchInvoicesApi();
      target = list.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId || inv.orderId === invoiceId) || null;
    }
    if (!target) {
      // Check if invoiceId matches an existing order id
      const matchingOrder = orders.find(o => o.id === invoiceId || o.invoiceNumber === invoiceId);
      if (matchingOrder) {
        return openInvoiceForOrder(matchingOrder, autoPrint);
      }
    }
    if (target) {
      setInvoices(prev => {
        if (!prev.some(inv => inv.id === target!.id || inv.orderId === target!.orderId)) {
          return [target!, ...prev];
        }
        return prev;
      });
      setActiveInvoiceAutoPrint(autoPrint);
      setActiveInvoice(target);
    }
    return target;
  };

  const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
    const target = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId || inv.orderId === invoiceId);
    const invNumber = target?.invoiceNumber || invoiceId;

    // Record permanent deletion tombstone so background sync never restores it
    addStoredIds(DELETED_INVOICE_IDS_KEY, [invoiceId, target?.id, target?.invoiceNumber, target?.orderId]);

    // 1. Optimistically remove from state
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId && inv.invoiceNumber !== invoiceId && inv.orderId !== invoiceId));
    
    // Close active invoice modal if currently viewed
    if (activeInvoice && (activeInvoice.id === invoiceId || activeInvoice.invoiceNumber === invoiceId || activeInvoice.orderId === invoiceId)) {
      setActiveInvoice(null);
    }

    // 2. Persist to Firestore & Cloud SQL backend
    try {
      await Promise.allSettled([
        deleteInvoiceFromDb(target?.id || invoiceId, target?.invoiceNumber),
        deleteInvoiceApi(target?.id || invoiceId, adminToken || '170707'),
        ...(target?.invoiceNumber && target.invoiceNumber !== target.id
          ? [deleteInvoiceApi(target.invoiceNumber, adminToken || '170707')]
          : []),
      ]);
    } catch (err) {
      console.warn('Background invoice delete error:', err);
    }

    showToast('GST Invoice Deleted', `Tax Invoice #${invNumber} has been permanently deleted.`, 'info');
    return true;
  };

  const deleteAllInvoices = async (): Promise<boolean> => {
    const prevInvoices = [...invoices];
    addStoredIds(
      DELETED_INVOICE_IDS_KEY,
      prevInvoices.flatMap(inv => [inv.id, inv.invoiceNumber, inv.orderId])
    );
    setStoredTimestamp(INVOICES_WIPED_BEFORE_KEY, Date.now());
    setInvoices([]);
    if (activeInvoice) setActiveInvoice(null);

    try {
      await Promise.allSettled([
        deleteAllInvoicesFromDb(),
        deleteAllInvoicesApi(adminToken || '170707'),
      ]);
    } catch (e) {
      console.warn('Delete all invoices error:', e);
    }

    showToast('All Invoices Deleted', 'GST tax invoice register has been cleared.', 'info');
    return true;
  };

  // Fetch initial invoices
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Add or Update Product from Admin
  const addProduct = async (product: Product) => {
    return await updateProduct(product);
  };

  // Update Product from Admin
  const updateProduct = async (product: Product) => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';
    // Un-tombstone if admin explicitly recreates/updates a product ID
    removeStoredId(DELETED_PRODUCT_IDS_KEY, product.id);
    // 1. Optimistic immediate local state update
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === product.id);
      let nextList: Product[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = product;
      } else {
        nextList = [product, ...prev];
      }
      try {
        safeStorage.setItem('hh_mineral_products_v1', JSON.stringify(nextList));
        safeStorage.setItem('hh_catalog_initialized_v1', 'true');
      } catch {}
      return nextList;
    });

    // 2. Persist to Firestore (real-time sync across all devices) and Cloud SQL backend in parallel
    try {
      const syncPromise = Promise.allSettled([
        saveProductToDb(product, adminIdentity, 'Authorized Admin').catch(e => console.warn('Firestore product sync warning:', e)),
        saveProductApi(product, adminToken || '170707').then(saved => {
          if (saved) {
            setProducts(prev => {
              const idx = prev.findIndex(p => p.id === saved.id);
              let nextList: Product[];
              const mergedProduct = { ...product, ...saved, videoUrl: product.videoUrl || saved.videoUrl };
              if (idx >= 0) {
                nextList = [...prev];
                nextList[idx] = mergedProduct;
              } else {
                nextList = [mergedProduct, ...prev];
              }
              try {
                safeStorage.setItem('hh_mineral_products_v1', JSON.stringify(nextList));
              } catch {}
              return nextList;
            });
          }
        }).catch(e => console.warn('Backend API save warning:', e))
      ]);
      // Give sync up to 2.5s before concluding so UI remains snappy
      await Promise.race([syncPromise, new Promise(resolve => setTimeout(resolve, 2500))]);
    } catch (err) {
      console.warn('Backend sync error for product:', err);
    }
    showToast('Catalog Updated', `${product.name} (${product.size}) saved and synced across all devices.`, 'success');
  };

  // Delete Product from Admin
  const deleteProduct = async (productId: string) => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';
    const targetProduct = products.find(p => p.id === productId);
    addStoredIds(DELETED_PRODUCT_IDS_KEY, [productId]);
    setProducts(prev => {
      const filtered = prev.filter(p => p.id !== productId);
      try {
        safeStorage.setItem('hh_mineral_products_v1', JSON.stringify(filtered));
        if (filtered.length === 0) {
          safeStorage.setItem('hh_catalog_initialized_v1', 'cleared');
        }
      } catch {}
      return filtered;
    });

    // Also remove from cart if customer or admin has added it
    setCart(prev => {
      const filtered = prev.filter(item => item.productId !== productId);
      try {
        safeStorage.setItem('hh_cart_v1', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });

    try {
      await Promise.allSettled([
        deleteProductFromDb(productId, adminIdentity, targetProduct?.name || 'Bottle Product'),
        deleteProductApi(productId, adminToken || '170707'),
      ]);
    } catch (err) {
      console.warn('Backend delete error for product:', err);
    }
    showToast('Product Removed', 'Product has been permanently deleted from the catalog across all devices.', 'info');
  };

  // Delete All Products from Catalog
  const deleteAllProducts = async () => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';
    addStoredIds(DELETED_PRODUCT_IDS_KEY, products.map(p => p.id));
    setProducts([]);
    try {
      safeStorage.setItem('hh_catalog_initialized_v1', 'cleared');
      safeStorage.setItem('hh_mineral_products_v1', JSON.stringify([]));
      await Promise.allSettled([
        deleteAllProductsFromDb(adminIdentity),
        deleteAllProductsApi(adminToken || '170707'),
      ]);
    } catch (err) {
      console.warn('Backend delete all products error:', err);
    }
    showToast('Catalog Cleared', 'All products have been permanently deleted from the catalog.', 'info');
  };

  // Reset Products to factory defaults
  const resetProductsToDefault = async () => {
    try {
      safeStorage.removeItem(DELETED_PRODUCT_IDS_KEY);
      safeStorage.setItem('hh_catalog_initialized_v1', 'true');
      safeStorage.setItem('hh_mineral_products_v1', JSON.stringify(INITIAL_PRODUCTS));
    } catch {}
    setProducts(INITIAL_PRODUCTS);
    try {
      for (const p of INITIAL_PRODUCTS) {
        await saveProductToDb(p);
        await saveProductApi(p, adminToken || '170707');
      }
    } catch {}
    showToast('Catalog Reset', 'Products restored to factory defaults.', 'success');
  };

  // Update Order Status
  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    const timestamp = new Date().toISOString();
    const historyItem = {
      status,
      timestamp,
      note: note || `Status transitioned to ${status}`,
      updatedBy: 'Owner Admin'
    };

    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      status,
      statusHistory: [...(o.statusHistory || []), historyItem]
    } : o));

    await Promise.allSettled([
      updateOrderStatusInDb(orderId, status, note),
      updateOrderStatusApi(orderId, status, [historyItem], adminToken),
    ]);
    showToast('Order Status Updated', `Order ${orderId} is now marked as ${status}.`, 'info');
  };

  // Update Full Order (e.g. Custom Design Studio adjustments, price, photos, items)
  const updateOrder = async (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    try {
      await Promise.allSettled([
        updateFullOrderInDb(updatedOrder),
        updateOrderApi(updatedOrder, adminToken || '170707'),
      ]);
    } catch (err) {
      console.warn('Failed to update full order:', err);
    }
    showToast('Custom Order Updated', `Order ${updatedOrder.id} successfully updated with new pricing, photos & specs.`, 'success');
  };

  // Helper for sequential status pipeline
  const getNextProgressionStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'New':
        return 'Confirmed';
      case 'Confirmed':
        return 'Processing';
      case 'Processing':
        return 'Ready';
      case 'Ready':
        return 'Out for Delivery';
      case 'Out for Delivery':
        return 'Delivered';
      default:
        return null;
    }
  };

  // Cancel Order (Admin Only)
  const cancelOrder = async (orderId: string, reason?: string) => {
    const timestamp = new Date().toISOString();
    const cancellationNote = reason?.trim() ? `Cancellation reason: ${reason.trim()}` : 'Order cancelled by Administrator.';
    const historyItem = {
      status: 'Cancelled' as OrderStatus,
      timestamp,
      note: cancellationNote,
      updatedBy: 'Owner Admin'
    };

    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      status: 'Cancelled' as OrderStatus,
      statusHistory: [...(o.statusHistory || []), historyItem]
    } : o));

    await Promise.allSettled([
      updateOrderStatusInDb(orderId, 'Cancelled', cancellationNote, 'Owner Admin'),
      updateOrderStatusApi(orderId, 'Cancelled', [historyItem], adminToken),
    ]);

    showToast('Order Cancelled', `Order ${orderId} has been marked as Cancelled.`, 'warning');
  };

  // Delete Order Permanently (Admin Only)
  const deleteOrder = async (orderId: string) => {
    addStoredIds(DELETED_ORDER_IDS_KEY, [orderId]);
    // Optimistically remove from state immediately
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if (recentCreatedOrder?.id === orderId) {
      setRecentCreatedOrder(null);
    }
    if (trackOrderId === orderId) {
      setTrackOrderId('');
    }

    try {
      await Promise.allSettled([
        deleteOrderFromDb(orderId),
        deleteOrderApi(orderId, adminToken || '170707'),
      ]);
    } catch (err) {
      console.warn('Backend order delete error:', err);
    }

    showToast('Order Deleted', `Order ${orderId} has been permanently deleted from records.`, 'info');
  };

  // Delete All Orders Permanently (Admin Only)
  const deleteAllOrders = async () => {
    const previousOrders = [...orders];
    addStoredIds(DELETED_ORDER_IDS_KEY, previousOrders.map(o => o.id));
    setStoredTimestamp(ORDERS_WIPED_BEFORE_KEY, Date.now());
    setOrders([]);
    setRecentCreatedOrder(null);
    setTrackOrderId('');
    try {
      safeStorage.removeItem('hh_orders');
      await Promise.allSettled([
        deleteAllOrdersApi(adminToken || '170707'),
        ...previousOrders.map(o => deleteOrderFromDb(o.id)),
      ]);
    } catch (err) {
      console.warn('Backend clear all orders error:', err);
    }
    showToast('All Orders Deleted', `Successfully removed all ${previousOrders.length} order records.`, 'info');
  };

  // Delete All Custom Design Orders (Admin Only)
  const deleteAllCustomOrders = async () => {
    const customOrders = orders.filter(o => o.isCustomOrder);
    if (customOrders.length === 0) {
      showToast('No Custom Orders', 'There are no custom design orders to delete.', 'info');
      return;
    }
    addStoredIds(DELETED_ORDER_IDS_KEY, customOrders.map(o => o.id));
    setOrders(prev => prev.filter(o => !o.isCustomOrder));
    try {
      await Promise.allSettled(
        customOrders.map(o => Promise.allSettled([
          deleteOrderFromDb(o.id),
          deleteOrderApi(o.id, adminToken || '170707')
        ]))
      );
    } catch (err) {
      console.warn('Backend delete custom orders error:', err);
    }
    showToast('Custom Orders Cleared', `Successfully deleted all ${customOrders.length} custom design orders.`, 'info');
  };

  // Auto-Advance single order to next stage
  const autoAdvanceOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const next = getNextProgressionStatus(order.status);
    if (!next) {
      showToast('Order Complete', `Order ${orderId} is already in a final state (${order.status}).`, 'info');
      return;
    }
    await updateOrderStatus(orderId, next, `Auto-progressed to ${next} via plant automated workflow`);
  };

  // Auto-Advance all eligible non-final orders
  const autoAdvanceAllEligibleOrders = async (): Promise<number> => {
    const eligible = orders.filter(o => getNextProgressionStatus(o.status) !== null);
    let count = 0;
    for (const ord of eligible) {
      const next = getNextProgressionStatus(ord.status);
      if (next) {
        await updateOrderStatus(ord.id, next, `Batch automated progression to ${next}`);
        count++;
      }
    }
    if (count > 0) {
      showToast('Batch Auto-Progression', `Successfully updated ${count} active order(s) to their next stage.`, 'success');
    } else {
      showToast('No Active Orders', 'All current orders are already delivered or completed.', 'info');
    }
    return count;
  };

  // Toggle Auto-Progress in Admin Settings
  const toggleAutoProgressOrders = async (enabled?: boolean) => {
    const nextVal = enabled !== undefined ? enabled : !(adminSettings.autoProgressOrders ?? true);
    const updated = { ...adminSettings, autoProgressOrders: nextVal };
    await updateAdminSettings(updated);
    showToast(
      nextVal ? 'Auto-Progression Enabled' : 'Auto-Progression Paused',
      nextVal
        ? `Orders will automatically transition every ${adminSettings.autoProgressIntervalMinutes || 2} minute(s).`
        : 'Automated status transitions are now paused.',
      nextVal ? 'success' : 'info'
    );
  };

  // Background Automatic Status Progression Runner
  useEffect(() => {
    if (!adminSettings.autoProgressOrders) return;

    const intervalMinutes = adminSettings.autoProgressIntervalMinutes || 2;
    const intervalMs = Math.max(intervalMinutes * 60 * 1000, 30000); // minimum 30s

    const timer = setInterval(() => {
      const now = Date.now();
      orders.forEach(order => {
        const nextStatus = getNextProgressionStatus(order.status);
        if (!nextStatus) return;

        let lastTime = new Date(order.createdAt).getTime();
        if (order.statusHistory && order.statusHistory.length > 0) {
          const lastHistory = order.statusHistory[order.statusHistory.length - 1];
          if (lastHistory?.timestamp) {
            lastTime = new Date(lastHistory.timestamp).getTime();
          }
        }

        const elapsedMs = now - lastTime;
        if (elapsedMs >= intervalMs) {
          const timestamp = new Date().toISOString();
          const historyItem = {
            status: nextStatus,
            timestamp,
            note: `Auto-transitioned to ${nextStatus} by automated plant fulfillment schedule`,
            updatedBy: 'Automated Plant System'
          };
          updateOrderStatusInDb(order.id, nextStatus, historyItem.note, 'Automated Plant System');
          updateOrderStatusApi(order.id, nextStatus, [historyItem], adminToken);
        }
      });
    }, 15000);

    return () => clearInterval(timer);
  }, [adminSettings.autoProgressOrders, adminSettings.autoProgressIntervalMinutes, orders, adminToken]);

  // Update Admin Settings
  const updateAdminSettings = async (newSettings: AdminSettings) => {
    if (!isAdminUnlocked) {
      showToast('Admin Only', 'Only Owner Admin can modify store settings.', 'error');
      return;
    }
    const cleanStaffPin = (newSettings.factoryStaffPin || '').replace(/\D/g, '').trim();
    const normalizedSettings: AdminSettings = {
      ...newSettings,
      factoryStaffPin: /^\d{4}$/.test(cleanStaffPin) ? cleanStaffPin : (adminSettings.factoryStaffPin || '1234'),
      showAllProducts: newSettings.showAllProducts !== false,
    };
    setAdminSettings(normalizedSettings);
    try {
      safeStorage.setItem('hh_mineral_admin_settings_v1', JSON.stringify(normalizedSettings));
    } catch {}
    saveAdminSettings(normalizedSettings);
    await saveSettingsApi(normalizedSettings, adminToken).catch(err => console.warn('Cloud SQL settings sync error:', err));
    showToast('Settings Saved', 'Store configuration and delivery rules updated.', 'success');
  };

  // Toggle All Products Storefront Visibility SHOW / NOT SHOW (Admin Only)
  const toggleAllProductsVisibility = async (show: boolean) => {
    if (!isAdminUnlocked) {
      showToast('Admin Only', 'Only Owner Admin can change All Products Show / Not Show visibility.', 'error');
      return;
    }
    const newSettings: AdminSettings = {
      ...adminSettings,
      showAllProducts: show,
    };
    setAdminSettings(newSettings);
    try {
      safeStorage.setItem('hh_mineral_admin_settings_v1', JSON.stringify(newSettings));
    } catch {}
    saveAdminSettings(newSettings);
    await saveSettingsApi(newSettings, adminToken).catch(err => console.warn('Cloud SQL settings sync error:', err));

    showToast(
      show ? 'All Products: SHOW' : 'All Products: NOT SHOW (Hidden)',
      show
        ? 'All catalog products are now visible across the storefront.'
        : 'All catalog products are now hidden from customers and factory staff.',
      show ? 'success' : 'info'
    );
  };

  // Toggle Selling Price ON or OFF across ALL Products (Admin Only)
  const toggleAllProductsSellingPrice = async (enable: boolean) => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';

    // 1. Update settings with master switch and disabled list
    const newSettings: AdminSettings = {
      ...adminSettings,
      showSellingPrice: enable,
      disabledSellingPriceProductIds: enable ? [] : products.map(p => p.id),
    };
    setAdminSettings(newSettings);
    saveAdminSettings(newSettings);
    saveSettingsApi(newSettings, adminToken).catch(err => console.warn('Cloud SQL settings sync error:', err));

    // 2. Optimistically update all products in state
    const updatedProducts = products.map(p => {
      const existingTags = Array.isArray(p.tags) ? [...p.tags] : [];
      let nextTags: string[];
      if (enable) {
        nextTags = existingTags.filter(t => t !== 'selling_price_off');
      } else {
        nextTags = existingTags.includes('selling_price_off') ? existingTags : [...existingTags, 'selling_price_off'];
      }
      return {
        ...p,
        showSellingPrice: enable,
        tags: nextTags,
      };
    });

    setProducts(updatedProducts);
    try {
      safeStorage.setItem('hh_mineral_products_v1', JSON.stringify(updatedProducts));
    } catch {}

    // 3. Persist product changes in background to Firestore and Cloud SQL
    Promise.allSettled(
      updatedProducts.map(p =>
        Promise.allSettled([
          saveProductToDb(p, adminIdentity, 'Authorized Admin'),
          saveProductApi(p, adminToken || '170707'),
        ])
      )
    ).catch(e => console.warn('Background all products sync notice:', e));

    showToast(
      enable ? 'Selling Price ON (All Products)' : 'Selling Price OFF — MRP Only (All Products)',
      enable
        ? 'All products are now selling at discounted selling prices with % OFF badges active.'
        : 'All products are now selling strictly at standard MRP. Discount prices and strikethroughs are hidden across the store.',
      enable ? 'success' : 'info'
    );
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        orders,
        myOrders,
        cart,
        currentSection,
        setCurrentSection,
        selectedProductForDetail,
        setSelectedProductForDetail,
        selectedProductForCustom,
        setSelectedProductForCustom,
        isCartOpen,
        setIsCartOpen,
        
        // Admin Auth
        isAdminUnlocked,
        adminToken,
        adminEmail,
        adminLoginStep1,
        adminResendOtp,
        adminVerifyOtp,
        adminDirectUnlock,
        adminLogout,
        adminLogoutAll,
        fetchAuditLogs,
        adminSettings,
        updateAdminSettings,

        // Factory Staff
        isFactoryStaffUnlocked,
        factoryStaffLogin,
        factoryStaffLogout,
        updateFactoryStaffPin,

        // Auth
        currentUser,
        customerProfile,
        isAuthLoading,
        isAuthModalOpen,
        authModalTab,
        authActionPrompt,
        openAuthModal,
        closeAuthModal,
        updateProfileData,
        saveAddress,
        deleteAddress,
        logout,

        addToCart,
        updateCartItemQty,
        setCartItemQty,
        removeFromCart,
        clearCart,
        cartSubtotal,
        deliveryFee,
        cartTotal,
        totalCartItemsCount,
        createOrder,
        createOfflineOrderWithInvoice,
        recentCreatedOrder,
        setRecentCreatedOrder,
        trackOrderId,
        setTrackOrderId,

        // GST Invoices
        invoices,
        fetchInvoices,
        activeInvoice,
        setActiveInvoice,
        activeInvoiceAutoPrint,
        setActiveInvoiceAutoPrint,
        openInvoiceForOrder,
        openInvoiceById,
        deleteInvoice,
        deleteAllInvoices,

        // Product Audit Logs
        productAuditLogs,
        fetchProductAuditLogs,
        clearProductAuditLogs,

        addProduct,
        updateProduct,
        toggleAllProductsVisibility,
        toggleAllProductsSellingPrice,
        deleteProduct,
        deleteAllProducts,
        resetProductsToDefault,
        updateOrderStatus,
        updateOrder,
        cancelOrder,
        deleteOrder,
        deleteAllOrders,
        deleteAllCustomOrders,
        autoAdvanceOrder,
        autoAdvanceAllEligibleOrders,
        toggleAutoProgressOrders,
        triggerWhatsAppNotification,

        // Live Sound Alerts & Desktop Push (Option 2)
        soundAlertEnabled,
        toggleSoundAlert,
        testSoundAlert,
        browserNotificationEnabled,
        toggleBrowserNotification,
        latestIncomingOrder,
        clearIncomingOrderAlert,

        // Meta WhatsApp Cloud API (Option 4)
        testWhatsAppCloudApi,
        sendOrderViaCloudApi,

        // Admin Order Email Notifications
        triggerAdminOrderEmail,
        sendAdminTestEmail,

        // Automated Low-Stock Monitoring & Inventory Management
        rawMaterials,
        lowStockSummary,
        runStockAudit,
        updateRawMaterialStock,
        addRawMaterialStock,
        deleteRawMaterialStock,
        resetRawMaterialsToDefault,
        sendLowStockAlertToWhatsApp,
        isLowStockBannerDismissed,
        dismissLowStockBanner,
        resetLowStockBannerDismissal,

        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

