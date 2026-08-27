export interface CustomerAddress {
  id: string;
  label: 'Home' | 'Office' | 'Event Venue' | 'Warehouse' | 'Other';
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  addresses: CustomerAddress[];
  createdAt: string;
  role?: 'customer' | 'admin';
}

export type AuthModalTab = 'login' | 'signup' | 'forgot_password';

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
  size: '250ml' | '500ml' | '1L' | '2L' | '20L Jar' | string;
  price: number;
  mrp: number;
  image: string;
  description: string;
  shortDesc: string;
  inStock: boolean;
  minOrderQty: number;
  category: 'Standard' | 'Premium' | 'Custom' | 'Bulk & Jars' | string;
  badge?: string;
  features: string[];
  mineralInfo: MineralAnalysis;
  casePackSize: number; // e.g. 24 bottles per case for 250ml
  packOptions?: number[]; // e.g. [12, 24, 36, 48]
  customDesignPrice?: number; // Custom design price per bottle (admin-editable, defaults to 2x normal price)
  gstRate?: number; // e.g. 18 (%)
  hsnCode?: string; // "2201"
  discountPercent?: number; // e.g. 10%
  stockCount?: number; // Numerical inventory count
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock';
  tags?: string[]; // e.g. ["Packaged Water", "Natural Minerals", "Party Favourite"]
  version?: number; // Server-side concurrency & version tracker
  updatedAt?: string; // ISO timestamp of last update
  updatedBy?: string; // Admin email or name who performed edit
  lastModifiedDevice?: string; // e.g. "Mobile (Chrome Android)", "Desktop (macOS)"
}

export interface ProductAuditLog {
  id: string;
  productId: string;
  productName: string;
  changedField: string;
  oldValue: string;
  newValue: string;
  adminEmail: string;
  adminName: string;
  timestamp: string; // ISO date string
  deviceInfo?: string;
  changeType?: 'created' | 'updated' | 'deleted' | string;
  version?: number;
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
  gstin?: string;
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
  userUid?: string;
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
  invoiceNumber?: string; // e.g. "HH/2026/000001"
  invoiceId?: string;
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
  autoProgressOrders?: boolean; // Automatic order status progression workflow
  autoProgressIntervalMinutes?: number; // Minutes per status transition stage (e.g. 2 min)
  heroBannerImage?: string;
  brandLogoImage?: string;

  // Indian GST & Business Details (Fully Configurable)
  legalBusinessName: string; // e.g. "HH MINERAL WATER BOTTLING & PACKAGING"
  tradeName: string; // e.g. "HH MINERAL WATER"
  businessAddress: string;
  gstin: string; // e.g. "19AAAAA0000A1Z5" or custom
  state: string; // "West Bengal"
  stateCode: string; // "19"
  hsnCode: string; // "2201"
  defaultGstRate: number; // 18 (%)
  pricesIncludeGst: boolean; // default true for MRP packaged water
  invoicePrefix: string; // "HH/2026/"
  fssaiNumber?: string; // FSSAI License No.
  panNumber?: string;
  cinNumber?: string;
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankUpiId?: string;
  invoiceTerms?: string;
}

// ----------------------------------------------------
// GST Tax Invoice Structures
// ----------------------------------------------------

export interface InvoiceItem {
  productId: string;
  productName: string;
  size: string;
  hsnCode: string; // "2201"
  quantity: number;
  unitPrice: number; // Unit Rate (₹)
  discount: number;
  taxableAmount: number; // Net Taxable value in ₹
  gstRate: number; // e.g. 18 (%)
  cgstRate: number; // 9 (%)
  cgstAmount: number; // ₹
  sgstRate: number; // 9 (%)
  sgstAmount: number; // ₹
  igstRate: number; // 0 or 18 (%)
  igstAmount: number; // ₹
  totalAmount: number; // Final line total ₹
  isCustomDesign?: boolean;
}

export interface InvoiceCompanyDetails {
  legalBusinessName: string;
  tradeName: string;
  businessAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  pan?: string;
  fssaiNumber?: string;
  cinNumber?: string;
  phone: string;
  email: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  invoiceTerms?: string;
}

export interface InvoiceCustomerDetails {
  name: string;
  phone: string;
  email?: string;
  billingAddress: string;
  deliveryAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin?: string;
}

export interface Invoice {
  id: string; // e.g. "HH/2026/000001"
  invoiceNumber: string;
  orderId: string;
  userUid?: string;
  invoiceDate: string; // ISO String
  supplyDate: string;
  placeOfSupply: string; // e.g. "West Bengal (19)"
  reverseCharge: 'No' | 'Yes';
  companyDetails: InvoiceCompanyDetails;
  customerDetails: InvoiceCustomerDetails;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  grandTotalInWords: string;
  paymentMethod: string;
  paymentStatus: string;
  status: 'GENERATED' | 'PAID' | 'CANCELLED';
  createdAt: string;
}

// ----------------------------------------------------
// Enterprise Operations: Bulk Inquiries, Quality, Fleet, Expenses
// ----------------------------------------------------

export interface BulkInquiry {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  organization?: string;
  eventType: string; // 'Wedding' | 'Corporate' | 'Hotel/Restaurant' | 'Wholesale'
  bottleSize: string; // '250ml' | '500ml' | '1L' | '2L'
  estimatedQuantity: number; // cases or bottles
  deliveryDate: string;
  deliveryLocation: string;
  customBranding: boolean;
  status: 'New' | 'Quoted' | 'Confirmed' | 'Completed' | 'Declined';
  quotedRatePerUnit?: number;
  totalQuotedAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface BatchQualityLog {
  id: string;
  batchNumber: string; // e.g. "HH-BATCH-2026-0826"
  testDate: string;
  sourceTank: string; // "RO Holding Tank 02"
  phLevel: number; // e.g. 7.4 (Acceptable 6.5 - 8.5)
  tdsPpm: number; // e.g. 120 (Acceptable 75 - 250 ppm)
  turbidityNtu: number; // e.g. 0.3 NTU (Max 1.0)
  ozoneLevelMgL: number; // e.g. 0.04 mg/L
  microbiologyPass: boolean; // E.coli / Coliform absent
  labTechnician: string;
  status: 'PASSED' | 'FLAGGED' | 'RE-TEST';
  remarks?: string;
  fssaiCompliant: boolean;
}

export interface FleetVehicle {
  id: string;
  vehicleNumber: string; // e.g. "WB-02-AK-9842"
  vehicleType: 'Mini Truck / Tata Ace' | 'Delivery Van' | 'E-Rickshaw Cargo' | 'Three Wheeler Cargo';
  driverName: string;
  driverPhone: string;
  assignedRoute: string; // e.g. "Central Kolkata & Park Street"
  capacityCases: number; // e.g. 120 cases
  currentLoadCases: number;
  status: 'Available' | 'On Delivery Route' | 'Maintenance' | 'Off Duty';
  todayDeliveriesCount: number;
}

export interface PlantExpense {
  id: string;
  date: string;
  category: 'PET Preforms & Caps' | 'Electricity & Water Treatment' | 'Corrugated Boxes & Shrink Pack' | 'Fleet Fuel & Vehicle Service' | 'RO Membrane & Filter Consumables' | 'Plant Labor & Staff Wages' | 'Other Operational';
  title: string;
  amount: number;
  paymentMode: 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque';
  vendorName?: string;
  invoiceOrBillRef?: string;
  notes?: string;
  createdAt: string;
}

