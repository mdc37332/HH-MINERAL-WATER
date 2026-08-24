export interface MineralAnalysis {
  calcium: string;
  magnesium: string;
  potassium: string;
  sodium: string;
  bicarbonate: string;
  silica: string;
  tds: string;
  ph: string;
}

export interface Product {
  id: string;
  name: string;
  size: '250ml' | '500ml' | '1L' | '2L' | string;
  price: number;
  mrp: number;
  image: string;
  description: string;
  shortDesc: string;
  inStock: boolean;
  minOrderQty: number;
  category: 'Standard' | 'Premium' | 'Custom';
  badge?: string;
  features: string[];
  mineralInfo: MineralAnalysis;
  casePackSize: number; // e.g. 24 bottles per case for 250ml
}

export interface CustomDesignDetails {
  eventType: 'Wedding' | 'Corporate' | 'Hotel & Restaurant' | 'Birthday & Party' | 'Personal Branding' | 'Other';
  businessName: string;
  tagline?: string;
  customText?: string;
  dateOrVenue?: string;
  specialInstructions?: string;
  labelThemeColor: string;
  labelTextColor: string;
  finishType: 'Matte Luxury' | 'Glossy Crystal' | 'Gold Foil Accent' | 'Silver Metallic';
  bottleCapColor: string;
  uploadedImages: {
    id: string;
    url: string; // Base64 or cloud URL
    name: string;
    sizeKb?: number;
    type?: string;
    labelPosition?: 'front' | 'back' | 'wrap';
  }[];
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  isCustomDesign: boolean;
  customDesignDetails?: CustomDesignDetails;
  addedAt: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  landmark?: string;
  city: string;
  pincode: string;
}

export type OrderStatus =
  | 'New'
  | 'Confirmed'
  | 'Processing'
  | 'Ready'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Failed';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface WhatsAppNotificationState {
  status: 'SENT' | 'PENDING' | 'FAILED' | 'ACKNOWLEDGED';
  sentAt?: string;
  targetPhone: string; // "8017341130"
  messageFormatted: string;
  retryCount: number;
  lastAttempt?: string;
}

export interface Order {
  id: string; // e.g. HH-ORD-74921
  createdAt: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card';
  paymentStatus: 'Pending' | 'Paid' | 'Cash Due on Delivery';
  orderNotes?: string;
  isCustomOrder: boolean;
  hasOriginalImage: boolean;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
  whatsAppNotification: WhatsAppNotificationState;
}

export interface AdminSettings {
  ownerWhatsApp: string; // "8017341130"
  helplinePhone: string;
  contactEmail: string;
  address: string;
  freeDeliveryMinAmount: number;
  defaultDeliveryCharge: number;
  adminPin: string;
  acceptingOrders: boolean;
}
