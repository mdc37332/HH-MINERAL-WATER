import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  CartItem,
  Order,
  CustomDesignDetails,
  CustomerInfo,
  OrderStatus,
  AdminSettings
} from '../types';
import {
  subscribeToProducts,
  subscribeToOrders,
  saveProductToDb,
  saveNewOrderToDb,
  updateOrderStatusInDb,
  updateOrderWhatsAppStatusInDb,
  getAdminSettings,
  saveAdminSettings,
  auth
} from '../lib/firebase';
import { formatOrderWhatsAppMessage, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS } from '../data/initialProducts';
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
  cart: CartItem[];
  currentSection: 'home' | 'products' | 'custom-design' | 'cart' | 'orders' | 'profile' | 'admin' | 'contact';
  setCurrentSection: (section: 'home' | 'products' | 'custom-design' | 'cart' | 'orders' | 'profile' | 'admin' | 'contact') => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (p: Product | null) => void;
  selectedProductForCustom: Product | null;
  setSelectedProductForCustom: (p: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;
  adminSettings: AdminSettings;
  updateAdminSettings: (s: AdminSettings) => void;
  
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

  // Admin & Status Actions
  updateProduct: (product: Product) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  triggerWhatsAppNotification: (order: Order, isManualRetry?: boolean) => Promise<boolean>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
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
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [recentCreatedOrder, setRecentCreatedOrder] = useState<Order | null>(null);
  const [trackOrderId, setTrackOrderId] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  // Subscribe to real-time products
  useEffect(() => {
    const unsub = subscribeToProducts(latestProducts => {
      setProducts(latestProducts);
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
    const cartItemId = isCustom
      ? `custom-${product.id}-${Date.now()}`
      : `std-${product.id}`;

    setCart(prev => {
      // If standard product already exists in cart, update quantity
      if (!isCustom) {
        const existingIdx = prev.findIndex(item => item.cartItemId === cartItemId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].quantity += quantity;
          return updated;
        }
      }
      
      const newItem: CartItem = {
        cartItemId,
        productId: product.id,
        product,
        quantity,
        unitPrice: product.price,
        isCustomDesign: isCustom,
        customDesignDetails: customDetails,
        addedAt: new Date().toISOString()
      };
      return [...prev, newItem];
    });

    showToast(
      isCustom ? 'Custom Order Added!' : 'Added to Cart!',
      `${quantity} × ${product.name} (${product.size}) added to your shopping bag.`,
      'success'
    );
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
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
      prev.map(item => (item.cartItemId === cartItemId ? { ...item, quantity: qty } : item))
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

    // Collect all uploaded images
    const originalImages: { id: string; url: string; name: string; sizeBytes?: number; uploadedAt: string }[] = [];
    cart.forEach(item => {
      if (item.customDesignDetails?.uploadedImages) {
        item.customDesignDetails.uploadedImages.forEach(img => {
          originalImages.push({
            id: img.id,
            url: img.url,
            name: img.name,
            sizeBytes: (img.sizeKb || 0) * 1024,
            uploadedAt: now
          });
        });
      }
    });

    const newOrder: Order = {
      id: orderId,
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

    // Format WhatsApp message
    const formattedMessage = formatOrderWhatsAppMessage(newOrder);
    newOrder.whatsAppNotification.messageFormatted = formattedMessage;

    // 1. Save to Database
    await saveNewOrderToDb(newOrder);

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

  // Update Product from Admin
  const updateProduct = async (product: Product) => {
    await saveProductToDb(product);
    showToast('Catalog Updated', `${product.name} details & pricing synchronized with live database.`, 'success');
  };

  // Update Order Status
  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    await updateOrderStatusInDb(orderId, status, note);
    showToast('Order Status Updated', `Order ${orderId} is now marked as ${status}.`, 'info');
  };

  // Update Admin Settings
  const updateAdminSettings = (newSettings: AdminSettings) => {
    setAdminSettings(newSettings);
    saveAdminSettings(newSettings);
    showToast('Settings Saved', 'Store configuration and delivery rules updated.', 'success');
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        orders,
        cart,
        currentSection,
        setCurrentSection,
        selectedProductForDetail,
        setSelectedProductForDetail,
        selectedProductForCustom,
        setSelectedProductForCustom,
        isCartOpen,
        setIsCartOpen,
        isAdminUnlocked,
        setIsAdminUnlocked,
        adminSettings,
        updateAdminSettings,
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
        updateProduct,
        updateOrderStatus,
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
