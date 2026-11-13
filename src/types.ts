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
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  gateNote?: string;
  googleMapsUrl?: string;
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
  images?: string[]; // Multiple product gallery images (unlimited)
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
  videoUrl?: string; // Product showcase or 360 spin video (MP4, WebM or URL)
  videoTitle?: string;
  customDesignPrice?: number; // Custom design price per bottle (admin-editable, defaults to 2x normal price)
  gstRate?: number; // e.g. 18 (%)
  hsnCode?: string; // "2201"
  discountPercent?: number; // e.g. 10%
  stockCount?: number; // Numerical inventory count
  stockStatus?: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lowStockThreshold?: number; // Numerical critical alert threshold (defaults to 50)
  reorderLevel?: number; // Numerical warning reorder level (defaults to 100)
  showSellingPrice?: boolean; // Admin toggle: when true (default), discounted selling price is active; when false, sells at standard MRP
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

export interface CustomFeatureItem {
  id: string;
  name: string;
  description?: string;
  pricePerBottle: number; // e.g. 0.50, 1.00, or 0
  flatPrice?: number; // e.g. 500 flat
  enabled: boolean;
  category: 'cap' | 'label' | 'packaging' | 'water' | 'custom';
}

export interface CustomDesignDetails {
  eventType: 'Wedding' | 'Corporate' | 'Hotel & Restaurant' | 'Birthday & Party' | 'Personal Branding' | 'Other';
  businessName: string;
  tagline?: string;
  customText?: string;
  dateOrVenue?: string;
  eventDate?: string; // e.g. YYYY-MM-DD or formatted date, must be booked at least 1 week before event
  eventVenue?: string; // Event venue, city, or banquet location
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
    mediaType?: 'image' | 'video';
    durationSec?: number;
    thumbnailUrl?: string;
  }[];
  uploadedVideos?: {
    id: string;
    url: string; // Base64, blob or cloud URL
    name: string;
    sizeKb: number;
    durationSec?: number;
    type: string;
    thumbnailUrl?: string;
  }[];
  // Custom features & add-ons
  customFeatures?: CustomFeatureItem[];
  qrCodeUrl?: string;
  qrCodeType?: 'website' | 'gallery' | 'location' | 'menu' | 'custom';
  packagingType?: string;
  waterType?: string;
  // Admin custom design, price & photo extensions:
  adminProofImage?: string; // High-res approved proof/mockup image provided by admin
  proofStatus?: 'Pending Review' | 'Proof Ready' | 'Customer Approved' | 'In Printing' | 'Bottled' | 'Dispatched';
  adminNotes?: string; // Internal production notes
  plateSetupCharge?: number; // Optional custom tooling / cylinder fee
  discountAmount?: number; // Admin negotiated discount
  customPricePerBottle?: number; // Custom unit price override
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

export interface DeliveryCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  addressText?: string;
  googleMapsUrl?: string;
  navigationUrl?: string;
  gateNote?: string; // e.g. "Tower B entrance, near security guard booth"
  capturedAt?: string;
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
  state?: string;
  stateCode?: string;
  companyName?: string;
  isOfflineCustomer?: boolean;
  deliveryCoordinates?: DeliveryCoordinates;
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

export type WhatsAppDeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'ACKNOWLEDGED';

export interface SingleWhatsAppNotificationRecord {
  status: WhatsAppDeliveryStatus;
  targetPhone: string;
  recipientName?: string;
  messageFormatted?: string;
  sentAt?: string;
  deliveredAt?: string;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
  messageId?: string;
}

export interface AdminEmailNotificationState {
  status: 'SENT' | 'PENDING' | 'FAILED' | 'CONFIG_REQUIRED';
  sentAt?: string;
  targetEmails: string[];
  retryCount?: number;
  lastAttempt?: string;
  error?: string;
  mode?: 'smtp' | 'log_fallback';
  messageId?: string;
}

export interface WhatsAppNotificationState {
  status: 'SENT' | 'PENDING' | 'FAILED' | 'ACKNOWLEDGED';
  sentAt?: string;
  targetPhone: string; // "8017341130"
  messageFormatted: string;
  retryCount: number;
  lastAttempt?: string;
  // Separate status records for Customer & Admin
  customerNotification?: SingleWhatsAppNotificationRecord;
  adminNotification?: SingleWhatsAppNotificationRecord;
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
  hasUploadedVideo?: boolean;
  customDesignDetails?: CustomDesignDetails;
  customLabelDetails?: CustomLabelDetails;
  status: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
  whatsAppNotification: WhatsAppNotificationState;
  adminEmailNotification?: AdminEmailNotificationState;
  invoiceNumber?: string; // e.g. "HH/2026/000001"
  invoiceId?: string;
  // Delivery & Pickup Specifications
  deliveryType?: 'doorstep' | 'self_pickup';
  deliveryDistanceKm?: number;
  pickupSlot?: string;
  pickupLocation?: string;
  deliveryCoordinates?: DeliveryCoordinates;
  isOfflineSale?: boolean;
  orderSource?: 'online' | 'offline_counter' | 'direct_sales';
}

export interface CustomLabelDetails {
  brandName?: string;
  eventType?: string;
  finishType?: string;
  bottleCapColor?: string;
  plateCharge?: number;
  specialInstructions?: string;
}

export interface AdminSettings {
  ownerWhatsApp: string; // "8017341130"
  helplinePhone: string;
  contactEmail: string;
  address: string;
  freeDeliveryMinAmount: number;
  defaultDeliveryCharge: number;
  adminPin: string;
  factoryStaffPin?: string; // 4-digit PIN for Factory Counter Staff (default: "1234")
  acceptingOrders: boolean;
  autoProgressOrders?: boolean; // Automatic order status progression workflow
  autoProgressIntervalMinutes?: number; // Minutes per status transition stage (e.g. 2 min)
  heroBannerImage?: string;
  heroBannerVideo?: string; // Uploaded video file (MP4/WebM Data URL) or public video URL for Hero
  heroMediaType?: 'image' | 'video'; // Active media view on Hero showcase
  brandLogoImage?: string;

  // Meta WhatsApp Cloud API (Automated Server-to-WhatsApp Delivery without opening WhatsApp)
  whatsappCloudApiEnabled?: boolean;
  whatsappPhoneNumberId?: string;
  whatsappCloudApiToken?: string;
  whatsappBusinessAccountId?: string;
  adminWhatsAppNumber?: string; // default "8017341130"
  // Email Notifications to Admin
  adminNotificationEmail?: string; // default "mdc37332@gmail.com, mdhussain170707@gmail.com"
  adminEmailNotificationEnabled?: boolean; // default true
  // Audio & Notification Alerts (Option 2: Live sound chime & desktop alerts)
  adminSoundAlertEnabled?: boolean; // default true
  adminBrowserPushEnabled?: boolean; // default true

  // Factory Location & Logistics Delivery Constraints (Under 7 Km)
  factoryLocationName?: string; // "HH Mineral Water Bottling Plant"
  factoryAddress?: string; // "Plot 12, Sector V, Salt Lake, Kolkata, West Bengal - 700091"
  factoryLatitude?: number; // 22.5726
  factoryLongitude?: number; // 88.4331
  maxDeliveryRadiusKm?: number; // 7 (Delivery strictly under 7 Km only)
  selfPickupEnabled?: boolean; // true (Add self pickup option)
  selfPickupAddress?: string; // "Factory Counter 1, HH Bottling Plant, Plot 12, Sector V, Salt Lake, Kolkata"
  selfPickupTimings?: string; // "Mon - Sun: 9:00 AM - 8:00 PM"
  selfPickupContact?: string; // "+91 8017341130"
  factoryPincodes?: string[]; // Allowed delivery pincodes within ~7km

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
  pan?: string;
  cinNumber?: string;
  bankAccountName?: string;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  accountNumber?: string;
  bankIfsc?: string;
  ifscCode?: string;
  bankUpiId?: string;
  upiId?: string;
  invoiceTerms?: string;

  // Pricing & Selling Price Controls (Admin-Only)
  showAllProducts?: boolean; // Admin-only master switch: when true (default), all products are shown on storefront; when false, products are hidden from customers/staff
  showSellingPrice?: boolean; // Global master switch: when true (default), discounted selling prices are enabled store-wide; when false, all products sell at MRP
  showDiscountPercentage?: boolean; // Global switch: show/hide discount percentage badge (e.g. 40% OFF) across products
  disabledSellingPriceProductIds?: string[]; // List of specific product IDs where selling price is turned OFF

  // Double-Entry Accounting & CA Audit Controls
  accountingZeroBaseMode?: boolean; // When true, all accounts start at 0 and all figures are dynamically collected from live product sales revenue and raw material purchases

  // Automated Low-Stock Monitoring & WhatsApp Alerts (+91 8017341130)
  lowStockAlertsEnabled?: boolean; // When true, automated low-stock checks run & trigger alerts
  defaultBottleCriticalThreshold?: number; // Critical stock threshold for finished bottles (default: 50)
  defaultBottleReorderLevel?: number; // Reorder warning level for finished bottles (default: 100)
  autoSendWhatsAppOnCriticalStock?: boolean; // Automated dispatch to admin WhatsApp on critical stock detection
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
  financialYear?: string; // e.g. "2026-27"
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
  isOfflineInvoice?: boolean;
  orderSource?: string;
  isCustomOrder?: boolean;
  customLabelDetails?: CustomLabelDetails;
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

export type PurchaseExpenseCategory =
  | 'PET Preforms & Caps'
  | 'Electricity & Water Treatment'
  | 'Corrugated Boxes & Shrink Pack'
  | 'Fleet Fuel & Vehicle Service'
  | 'RO Membrane & Filter Consumables'
  | 'Plant Labor & Staff Wages'
  | 'Water Treatment Chemicals & Minerals'
  | 'Bottle Caps & Closures'
  | 'Plant Machinery Spares'
  | 'Other Operational';

// ----------------------------------------------------
// Raw Materials Inventory & Low-Stock Monitoring
// ----------------------------------------------------

export interface RawMaterialStockItem {
  id: string;
  name: string;
  category: PurchaseExpenseCategory;
  hsnCode: string; // e.g. "3923" for preforms/caps, "4819" for cartons, "2833" for minerals
  currentStock: number;
  unit: 'pcs' | 'cartons' | 'kg' | 'rolls' | 'litres' | 'filters' | 'bottles' | string;
  criticalThreshold: number; // Red Alert triggered when stock <= criticalThreshold
  reorderLevel: number; // Warning yellow triggered when stock <= reorderLevel
  costPerUnit?: number; // Estimated unit cost (₹)
  standardVendorName: string;
  standardVendorPhone: string;
  lastRestockedDate?: string;
  lastRestockedQty?: number;
  notes?: string;
}

export interface LowStockAlertItem {
  id: string;
  type: 'bottle' | 'raw_material';
  name: string;
  currentStock: number;
  unit: string;
  criticalThreshold: number;
  reorderLevel: number;
  severity: 'CRITICAL' | 'WARNING';
  vendorName?: string;
  vendorPhone?: string;
  hsnCode?: string;
  size?: string;
  category?: string;
}

export interface LowStockAuditSummary {
  checkedAt: string;
  totalItemsChecked: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  criticalItems: LowStockAlertItem[];
  warningItems: LowStockAlertItem[];
  hasCriticalStock: boolean;
  hasLowStock: boolean;
}

export interface PlantExpense {
  id: string;
  date: string;
  category: PurchaseExpenseCategory;
  title: string;
  amount: number;
  taxableAmount?: number;
  gstRate?: number; // e.g. 18 (%)
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  hsnCode?: string; // e.g. "3923" for preforms/caps, "4819" for cartons
  vendorGstin?: string;
  vendorName?: string;
  invoiceOrBillRef?: string;
  paymentMode: 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque' | 'Credit / Sundry Creditor';
  paymentStatus?: 'Paid' | 'Pending / Credit Due';
  itcEligible?: boolean; // Input Tax Credit
  quantity?: number;
  unit?: string;
  notes?: string;
  createdAt: string;
}

// ----------------------------------------------------
// Accounting & CA Audit Structures (Double-Entry Bookkeeping)
// ----------------------------------------------------

export type AccountCategory =
  | 'Asset'
  | 'Liability'
  | 'Equity'
  | 'Revenue'
  | 'Direct Expense'
  | 'Indirect Expense';

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  debit: number; // Dr. in ₹
  credit: number; // Cr. in ₹
  notes?: string;
}

export interface JournalEntry {
  id: string; // e.g. "JV-2026-0001" or "SALES-HH-2026-000001"
  voucherNumber: string;
  voucherType: 'Sales' | 'Purchase / Expense' | 'Payment / Receipt' | 'Contra' | 'Journal Adjustment';
  date: string; // YYYY-MM-DD
  referenceId: string; // e.g. Invoice Number or Expense ID
  sourceType: 'invoice' | 'expense' | 'manual_jv';
  narration: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  customerName?: string;
  vendorName?: string;
  gstin?: string;
  hsnCode?: string;
}

export interface LedgerPostingItem {
  id: string;
  date: string;
  voucherNumber: string;
  voucherType: string;
  referenceId: string;
  particulars: string; // Contra account(s)
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface LedgerAccount {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  description?: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingType: 'Dr' | 'Cr';
  postings: LedgerPostingItem[];
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceStatement {
  asOfDate: string;
  financialYear: string;
  items: TrialBalanceItem[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}

export interface ProfitAndLossStatement {
  periodFrom: string;
  periodTo: string;
  financialYear: string;
  // Revenue
  grossSales: number;
  discountsAllowed: number;
  netSales: number;
  // Direct Expenses / Cost of Goods Sold
  openingStock: number;
  petPreformsAndCaps: number;
  corrugatedBoxesAndPackaging: number;
  waterTreatmentAndPlantPower: number;
  plantBottlingWages: number;
  totalDirectCosts: number;
  closingStock: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
  // Indirect / Operating Incomes
  deliveryFreightRecovered: number;
  customSetupFeeIncome: number;
  totalIndirectIncome: number;
  waterTreatmentMinerals?: number;
  plantMachinerySpares?: number;
  // Indirect / Operating Expenses
  fleetFuelAndVehicleRunning: number;
  roMembraneAndFilterConsumables: number;
  administrativeAndGeneralExpenses: number;
  depreciation: number;
  totalIndirectExpenses: number;
  // Net Profit
  netProfitBeforeTax: number;
  netProfitMarginPercent: number;
}

export interface BalanceSheetStatement {
  asOfDate: string;
  financialYear: string;
  // Liabilities & Capital
  capitalAccount: {
    openingCapital: number;
    capitalIntroduced: number;
    addNetProfit: number;
    lessDrawings: number;
    closingCapital: number;
  };
  currentLiabilities: {
    outputCgstPayable: number;
    outputSgstPayable: number;
    outputIgstPayable: number;
    totalGstPayable: number;
    sundryCreditors: number;
    outstandingExpenses: number;
    totalCurrentLiabilities: number;
  };
  totalLiabilitiesAndEquity: number;
  // Assets
  fixedAssets: {
    bottlingPlantMachinery: number;
    deliveryFleetVehicles: number;
    lessAccumulatedDepreciation: number;
    netFixedAssets: number;
  };
  currentAssets: {
    finishedGoodsStock: number;
    rawMaterialsStock: number;
    sundryDebtors: number;
    bankBalances: number;
    cashInHand: number;
    inputTaxCredit?: number;
    totalCurrentAssets: number;
  };
  totalAssets: number;
  isBalanced: boolean;
  difference: number;
}

export interface CaAuditSummary {
  financialYear: string;
  assessmentYear: string;
  grossTurnover: number;
  taxableTurnover: number;
  exemptTurnover: number;
  outputGstTotal: number;
  outputCgst: number;
  outputSgst: number;
  outputIgst: number;
  hsnSummary: {
    hsnCode: string;
    description: string;
    uqc: string;
    totalQuantity: number;
    totalValue: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[];
  cashReceiptsOverLimitCount: number; // Section 269ST check (> Rs 2 Lakh single cash transaction)
  methodOfAccounting: 'Mercantile (Accrual System)';
  auditorRemarks: string;
}

export interface ManualJournalVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  narration: string;
  lines: {
    accountCode: string;
    accountName: string;
    category: AccountCategory;
    debit: number;
    credit: number;
  }[];
  createdAt: string;
}

