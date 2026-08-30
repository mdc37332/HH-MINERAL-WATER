import React, { createContext, useContext, useState, useEffect } from 'react';
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
  ProductAuditLog
} from '../types';
import {
  subscribeToProducts,
  subscribeToOrders,
  saveProductToDb,
  deleteProductFromDb,
  deleteAllProductsFromDb,
  saveNewOrderToDb,
  updateOrderStatusInDb,
  deleteOrderFromDb,
  updateOrderWhatsAppStatusInDb,
  getAdminSettings,
  saveAdminSettings,
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
  clearProductAuditLogsInDb
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
  deleteOrderApi,
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
  AuditLogItem
} from '../lib/api';
import { formatOrderWhatsAppMessage, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS } from '../data/initialProducts';
import { generateGstInvoice } from '../lib/invoiceGenerator';
import confetti from 'canvas-confetti';

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
  createOrder: (customer: CustomerInfo, paymentMethod: 'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card', notes?: string) => Promise<Order>;
  recentCreatedOrder: Order | null;
  setRecentCreatedOrder: (o: Order | null) => void;
  trackOrderId: string;
  setTrackOrderId: (id: string) => void;

  // GST Invoices
  invoices: Invoice[];
  fetchInvoices: () => Promise<Invoice[]>;
  activeInvoice: Invoice | null;
  setActiveInvoice: (inv: Invoice | null) => void;
  openInvoiceForOrder: (order: Order) => Promise<Invoice | null>;
  deleteInvoice: (invoiceId: string) => Promise<boolean>;
  deleteAllInvoices: () => Promise<boolean>;

  // Product Audit Logs
  productAuditLogs: ProductAuditLog[];
  fetchProductAuditLogs: () => Promise<ProductAuditLog[]>;
  clearProductAuditLogs: () => Promise<boolean>;

  // Admin & Status Actions
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteAllProducts: () => Promise<void>;
  resetProductsToDefault: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  autoAdvanceOrder: (orderId: string) => Promise<void>;
  autoAdvanceAllEligibleOrders: () => Promise<number>;
  toggleAutoProgressOrders: (enabled?: boolean) => Promise<void>;
  triggerWhatsAppNotification: (order: Order, isManualRetry?: boolean) => Promise<boolean>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('hh_mineral_products_v1') || localStorage.getItem('hh_products_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PRODUCTS;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('hh_cart_v1');
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
      return localStorage.getItem('hh_admin_session_token_v2') || 
             sessionStorage.getItem('hh_admin_session_token') || 
             null;
    } catch {
      return null;
    }
  });
  const [adminEmail, setAdminEmail] = useState<string | null>('mdhussain170707@gmail.com');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      const savedToken = localStorage.getItem('hh_admin_session_token_v2') || 
                         sessionStorage.getItem('hh_admin_session_token');
      return Boolean(savedToken && (savedToken === '170707' || savedToken === '801734' || savedToken.startsWith('hh_adm_')));
    } catch {
      return false;
    }
  });
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [recentCreatedOrder, setRecentCreatedOrder] = useState<Order | null>(null);
  const [trackOrderId, setTrackOrderId] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // GST Invoices State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Product Audit Logs State
  const [productAuditLogs, setProductAuditLogs] = useState<ProductAuditLog[]>([]);

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
        if (adminToken !== '170707' && adminToken !== '801734' && !adminToken.startsWith('hh_adm_')) {
          try {
            localStorage.removeItem('hh_admin_session_token_v2');
            sessionStorage.removeItem('hh_admin_session_token');
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
        localStorage.setItem('hh_admin_session_token_v2', res.token);
        sessionStorage.setItem('hh_admin_session_token', res.token);
      } catch (e) {
        console.warn('Could not set session storage:', e);
      }
      return { success: true, token: res.token };
    }
    return { success: false, error: res.error || 'Verification failed.' };
  };

  const adminDirectUnlock = async (masterCode?: string) => {
    const code = (masterCode || '170707').trim();
    const token = `hh_adm_${code}_master_session`;
    setAdminToken(token);
    setAdminEmail('mdhussain170707@gmail.com');
    setIsAdminUnlocked(true);
    try {
      localStorage.setItem('hh_admin_session_token_v2', token);
      sessionStorage.setItem('hh_admin_session_token', token);
    } catch {}
    showToast('Admin Panel Unlocked', 'Master owner access verified.', 'success');
    return { success: true, token };
  };

  const adminLogout = async () => {
    if (adminToken) {
      await adminLogoutApi(adminToken);
    }
    try {
      localStorage.removeItem('hh_admin_session_token_v2');
      sessionStorage.removeItem('hh_admin_session_token');
    } catch {}
    setAdminToken(null);
    setIsAdminUnlocked(false);
    showToast('Admin Session Ended', 'You have been safely logged out from the Admin Panel.', 'info');
  };

  const adminLogoutAll = async () => {
    if (adminToken) {
      await adminLogoutAllApi(adminToken);
    }
    try {
      localStorage.removeItem('hh_admin_session_token_v2');
      sessionStorage.removeItem('hh_admin_session_token');
    } catch {}
    setAdminToken(null);
    setIsAdminUnlocked(false);
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
      localStorage.setItem('hh_cart_v1', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [cart]);

  // Sync settings
  useEffect(() => {
    getAdminSettings().then(s => setAdminSettings(s));
  }, []);

  // Fetch and subscribe to products (both Cloud SQL and Firestore)
  useEffect(() => {
    // Initial fetch from backend PostgreSQL API
    fetchProductsApi().then(apiProds => {
      if (apiProds && apiProds.length > 0) {
        setProducts(apiProds);
        try {
          localStorage.setItem('hh_mineral_products_v1', JSON.stringify(apiProds));
        } catch {}
      }
    }).catch(err => {
      console.warn('Initial products API fetch notice:', err);
    });

    const unsub = subscribeToProducts(latestProducts => {
      if (!latestProducts) return;
      setProducts(latestProducts);

      // Auto synchronize cart items with real-time product price & stock updates
      setCart(currentCart => {
        let changed = false;
        const updatedCart = currentCart.map(item => {
          const matchingProduct = latestProducts.find(p => p.id === item.productId);
          if (matchingProduct) {
            const expectedUnitPrice = item.isCustomDesign
              ? (matchingProduct.customDesignPrice || matchingProduct.price * 2)
              : matchingProduct.price;
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

  // Subscribe to real-time orders
  useEffect(() => {
    const unsub = subscribeToOrders(latestOrders => {
      setOrders(latestOrders);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time product audit logs
  useEffect(() => {
    const unsub = subscribeToProductAuditLogs(latestLogs => {
      setProductAuditLogs(latestLogs);
    });
    return () => unsub();
  }, []);

  const fetchProductAuditLogs = async (): Promise<ProductAuditLog[]> => {
    try {
      const logs = await fetchProductAuditLogsApi(adminToken || '170707');
      if (logs && logs.length > 0) {
        setProductAuditLogs(logs);
        localStorage.setItem('hh_mineral_prod_audit_v1', JSON.stringify(logs));
        return logs;
      }
      // If SQL api returned empty, try reading local cache
      const cached = localStorage.getItem('hh_mineral_prod_audit_v1');
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
      localStorage.setItem('hh_mineral_prod_audit_v1', JSON.stringify([]));
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

  // Toast Helper
  const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
    // For custom design orders: minimum 600 pieces and unit price is double normal bottle price (or admin-configured customDesignPrice)
    const effectiveQty = isCustom ? Math.max(600, quantity) : quantity;
    const unitPrice = isCustom ? (product.customDesignPrice || product.price * 2) : product.price;

    const cartItemId = isCustom
      ? `custom-${product.id}-${Date.now()}`
      : `std-${product.id}`;

    setCart(prev => {
      // If standard product already exists in cart, update quantity
      if (!isCustom) {
        const existingIdx = prev.findIndex(item => item.cartItemId === cartItemId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity += effectiveQty;
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

  // Trigger WhatsApp notification for an order
  const triggerWhatsAppNotification = async (order: Order, isManualRetry = false): Promise<boolean> => {
    const messageFormatted = formatOrderWhatsAppMessage(order);
    try {
      // In web app, we generate direct WhatsApp action and update Firestore status to SENT
      await updateOrderWhatsAppStatusInDb(order.id, 'SENT', isManualRetry ? 1 : 0);
      showToast(
        'WhatsApp Alert Dispatched',
        `Order confirmation formatted and dispatched to HH Owner (${OWNER_WHATSAPP_NUMBER}).`,
        'success'
      );
      return true;
    } catch (e) {
      console.warn('Failed to update WhatsApp notification state:', e);
      await updateOrderWhatsAppStatusInDb(order.id, 'FAILED', isManualRetry ? 1 : 0);
      showToast(
        'WhatsApp Status Notice',
        `Direct WhatsApp link ready for manual dispatch to ${OWNER_WHATSAPP_NUMBER}.`,
        'warning'
      );
      return false;
    }
  };

  // Create Order
  const createOrder = async (
    customer: CustomerInfo,
    paymentMethod: 'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card',
    notes?: string
  ): Promise<Order> => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderId = `HH-ORD-${randomSuffix}`;
    const now = new Date().toISOString();

    const isCustomOrder = cart.some(item => item.isCustomDesign);
    const hasOriginalImage = cart.some(
      item => item.customDesignDetails?.uploadedImages && item.customDesignDetails.uploadedImages.length > 0
    );

    const newOrder: Order = {
      id: orderId,
      userUid: currentUser?.uid,
      createdAt: now,
      customer,
      items: [...cart],
      subtotal: cartSubtotal,
      deliveryCharge: deliveryFee,
      discount: 0,
      totalAmount: cartTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'Cash on Delivery (COD)' ? 'Cash Due on Delivery' : 'Paid',
      orderNotes: notes,
      isCustomOrder,
      hasOriginalImage,
      status: 'New',
      statusHistory: [
        {
          status: 'New',
          timestamp: now,
          note: 'Order placed successfully by customer'
        }
      ],
      whatsAppNotification: {
        status: 'PENDING',
        targetPhone: OWNER_WHATSAPP_NUMBER,
        messageFormatted: '',
        retryCount: 0
      }
    };

    // Generate GST Tax Invoice immediately for the order
    const nextSeq = (invoices.length || 0) + 1;
    const generatedInvoice = generateGstInvoice(newOrder, adminSettings, nextSeq);
    newOrder.invoiceNumber = generatedInvoice.invoiceNumber;

    // Format WhatsApp message with generated invoice number
    const formattedMessage = formatOrderWhatsAppMessage(newOrder);
    newOrder.whatsAppNotification.messageFormatted = formattedMessage;

    // 1. Save to Database (Firestore & Cloud SQL) and generate Invoice
    await Promise.allSettled([
      saveNewOrderToDb(newOrder),
      createOrderApi(newOrder),
      generateInvoiceApi(newOrder, nextSeq),
    ]);

    // Update local invoices collection
    setInvoices(prev => [generatedInvoice, ...prev.filter(inv => inv.orderId !== newOrder.id)]);

    // 2. Trigger WhatsApp status & dispatch
    await triggerWhatsAppNotification(newOrder, false);

    // 3. Clear cart & set recent order
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

  // GST Invoice helpers
  const fetchInvoices = async (): Promise<Invoice[]> => {
    const list = await fetchInvoicesApi();
    if (list && list.length > 0) {
      setInvoices(list);
    }
    return list;
  };

  const openInvoiceForOrder = async (order: Order): Promise<Invoice | null> => {
    // Check if we already have it in local state
    let target = invoices.find(inv => inv.orderId === order.id);
    if (!target) {
      target = await fetchInvoiceByOrderIdApi(order.id);
    }
    if (!target) {
      // Generate client-side if not found
      target = generateGstInvoice(order, adminSettings, (invoices.length || 0) + 1);
      generateInvoiceApi(order).catch(e => console.warn('Background invoice sync error:', e));
    }
    setActiveInvoice(target);
    return target;
  };

  const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
    const target = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId || inv.orderId === invoiceId);
    const invNumber = target?.invoiceNumber || invoiceId;

    // 1. Optimistically remove from state
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId && inv.invoiceNumber !== invoiceId && inv.orderId !== invoiceId));
    
    // Close active invoice modal if currently viewed
    if (activeInvoice && (activeInvoice.id === invoiceId || activeInvoice.invoiceNumber === invoiceId || activeInvoice.orderId === invoiceId)) {
      setActiveInvoice(null);
    }

    // 2. Persist to Firestore & Cloud SQL backend
    try {
      await Promise.allSettled([
        deleteInvoiceFromDb(invoiceId, target?.invoiceNumber),
        deleteInvoiceApi(invoiceId, adminToken || '170707'),
      ]);
    } catch (err) {
      console.warn('Background invoice delete error:', err);
    }

    showToast('GST Invoice Deleted', `Tax Invoice #${invNumber} has been permanently deleted.`, 'info');
    return true;
  };

  const deleteAllInvoices = async (): Promise<boolean> => {
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

  // Update Product from Admin
  const updateProduct = async (product: Product) => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';
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
        localStorage.setItem('hh_mineral_products_v1', JSON.stringify(nextList));
      } catch {}
      return nextList;
    });

    // 2. Persist to Firestore (real-time sync across all devices) and Cloud SQL backend in parallel
    try {
      await Promise.allSettled([
        saveProductToDb(product, adminIdentity, 'Authorized Admin').catch(e => console.warn('Firestore product sync warning:', e)),
        saveProductApi(product, adminToken || '170707').then(saved => {
          if (saved) {
            setProducts(prev => {
              const idx = prev.findIndex(p => p.id === saved.id);
              let nextList: Product[];
              if (idx >= 0) {
                nextList = [...prev];
                nextList[idx] = saved;
              } else {
                nextList = [saved, ...prev];
              }
              try {
                localStorage.setItem('hh_mineral_products_v1', JSON.stringify(nextList));
              } catch {}
              return nextList;
            });
          }
        }).catch(e => console.warn('Backend API save warning:', e))
      ]);
    } catch (err) {
      console.warn('Backend sync error for product:', err);
    }
    showToast('Catalog Updated', `${product.name} (${product.size}) saved and synced across all devices.`, 'success');
  };

  // Delete Product from Admin
  const deleteProduct = async (productId: string) => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';
    const targetProduct = products.find(p => p.id === productId);
    setProducts(prev => {
      const filtered = prev.filter(p => p.id !== productId);
      try {
        localStorage.setItem('hh_mineral_products_v1', JSON.stringify(filtered));
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
    showToast('Product Removed', 'Product has been removed from the catalog across all devices.', 'info');
  };

  // Delete All Products from Catalog
  const deleteAllProducts = async () => {
    const adminIdentity = adminEmail || 'mdhussain170707@gmail.com';
    setProducts([]);
    try {
      localStorage.setItem('hh_mineral_products_v1', JSON.stringify([]));
      localStorage.removeItem('hh_mineral_products_v1');
      localStorage.removeItem('hh_products_v1');
      await Promise.allSettled([
        deleteAllProductsFromDb(adminIdentity),
        deleteAllProductsApi(adminToken || '170707'),
      ]);
    } catch (err) {
      console.warn('Backend delete all products error:', err);
    }
    showToast('Catalog Cleared', 'All products have been deleted from the catalog.', 'info');
  };

  // Reset Products to factory defaults
  const resetProductsToDefault = async () => {
    setProducts(INITIAL_PRODUCTS);
    try {
      localStorage.setItem('hh_mineral_products_v1', JSON.stringify(INITIAL_PRODUCTS));
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
    setAdminSettings(newSettings);
    saveAdminSettings(newSettings);
    await saveSettingsApi(newSettings, adminToken).catch(err => console.warn('Cloud SQL settings sync error:', err));
    showToast('Settings Saved', 'Store configuration and delivery rules updated.', 'success');
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
        recentCreatedOrder,
        setRecentCreatedOrder,
        trackOrderId,
        setTrackOrderId,

        // GST Invoices
        invoices,
        fetchInvoices,
        activeInvoice,
        setActiveInvoice,
        openInvoiceForOrder,
        deleteInvoice,
        deleteAllInvoices,

        // Product Audit Logs
        productAuditLogs,
        fetchProductAuditLogs,
        clearProductAuditLogs,

        updateProduct,
        deleteProduct,
        deleteAllProducts,
        resetProductsToDefault,
        updateOrderStatus,
        cancelOrder,
        deleteOrder,
        autoAdvanceOrder,
        autoAdvanceAllEligibleOrders,
        toggleAutoProgressOrders,
        triggerWhatsAppNotification,
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

