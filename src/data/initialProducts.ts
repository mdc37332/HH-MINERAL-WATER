import { Product, AdminSettings, RawMaterialStockItem } from '../types';

export const AVAILABLE_PACK_SIZES = [12, 24, 36, 48] as const;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-250ml',
    name: 'HH Mineral Water — 250ml Pocket Edition',
    size: '250ml',
    price: 6,
    mrp: 10,
    discountPercent: 40,
    customDesignPrice: 12,
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85',
    images: [
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?auto=format&fit=crop&w=1000&q=85'
    ],
    shortDesc: 'Compact, event-ready 250ml pure mineral bottle.',
    description: 'Ultra-pure 7-stage processed mineral water in convenient 250ml pocket bottles. Perfectly balanced with vital electrolytes. Ideal for luxury weddings, corporate banquets, boardroom meetings, and hospitality guests.',
    inStock: true,
    stockCount: 1200,
    stockStatus: 'In Stock',
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Popular for Events',
    casePackSize: 24,
    packOptions: [12, 24, 36, 48],
    gstRate: 18,
    hsnCode: '2201',
    tags: ['Events', 'Banquet Favorite', 'Pocket Bottle', 'Mineral Rich'],
    features: ['7-Stage UV & Ozonation', 'BPA-Free Recyclable PET', 'Touchless Automatic Bottling', 'Sealed Tamper-Evident Cap'],
    mineralInfo: {
      calcium: '20 mg/L',
      magnesium: '10 mg/L',
      potassium: '4 mg/L',
      sodium: '7 mg/L',
      bicarbonate: '60 mg/L',
      silica: '14 mg/L',
      tds: '125 ppm',
      ph: '7.4'
    },
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default'
  },
  {
    id: 'prod-500ml',
    name: 'HH Mineral Water — 500ml Everyday Active',
    size: '500ml',
    price: 10,
    mrp: 20,
    discountPercent: 50,
    customDesignPrice: 20,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=1000&q=85'
    ],
    shortDesc: 'Crisp & refreshing 500ml on-the-go hydration.',
    description: 'Natural mineral hydration in an ergonomic 500ml bottle designed for active lifestyles, workouts, road trips, dining tables, and conference desks.',
    inStock: true,
    stockCount: 950,
    stockStatus: 'In Stock',
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Best Seller',
    casePackSize: 24,
    packOptions: [12, 24, 36, 48],
    gstRate: 18,
    hsnCode: '2201',
    tags: ['Daily Hydration', 'Best Seller', 'Fitness', 'Desk Essential'],
    features: ['Balanced Mineral Formulation', 'Food-Grade Virgin PET', 'Hermetically Shielded Cap', 'Microbiologically Tested'],
    mineralInfo: {
      calcium: '22 mg/L',
      magnesium: '11 mg/L',
      potassium: '4.5 mg/L',
      sodium: '7.5 mg/L',
      bicarbonate: '65 mg/L',
      silica: '15 mg/L',
      tds: '130 ppm',
      ph: '7.4'
    },
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default'
  },
  {
    id: 'prod-1L',
    name: 'HH Mineral Water — 1 Litre Premium Table Edition',
    size: '1L',
    price: 15,
    mrp: 30,
    discountPercent: 50,
    customDesignPrice: 30,
    image: 'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?auto=format&fit=crop&w=1000&q=85',
    images: [
      'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85'
    ],
    shortDesc: 'Full 1-litre table bottle with premium mineral balance.',
    description: 'High-clarity 1 Litre mineral water bottle engineered for family dining, restaurants, corporate boardrooms, long journeys, and hotel guest suites. 7-stage UV & ozonation purified with essential electrolytes.',
    inStock: true,
    stockCount: 650,
    stockStatus: 'In Stock',
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Restaurant Choice',
    casePackSize: 12,
    packOptions: [12, 24, 36, 48],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    videoTitle: '1 Litre Premium Table Showcase Reel',
    gstRate: 18,
    hsnCode: '2201',
    tags: ['1 Litre', '1L', 'Table Water', 'Hotel Suite', 'Dining', 'Mineral Water', '1000ml'],
    features: ['Multi-Barrier Ultra Filtration', 'Optimized TDS 120-140 ppm', 'Heavy Duty Ergonomic Grip Bottle', 'Zero Microplastics', '100% Recyclable Food-Grade PET'],
    mineralInfo: {
      calcium: '24 mg/L',
      magnesium: '12 mg/L',
      potassium: '5 mg/L',
      sodium: '8 mg/L',
      bicarbonate: '70 mg/L',
      silica: '16 mg/L',
      tds: '135 ppm',
      ph: '7.5'
    },
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default'
  },
  {
    id: 'prod-2L',
    name: 'HH Mineral Water — 2 Litre Family Jumbo Reserve',
    size: '2L',
    price: 25,
    mrp: 50,
    discountPercent: 50,
    customDesignPrice: 50,
    image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=1000&q=85',
    images: [
      'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85'
    ],
    shortDesc: 'Extra-large 2L bottle for home, office & travel supply.',
    description: 'Maximum volume 2-Litre heavy-duty bottle for home kitchens, work pantries, picnics, catering setups, and extended road travel.',
    inStock: true,
    stockCount: 400,
    stockStatus: 'In Stock',
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Value Pack',
    casePackSize: 12,
    packOptions: [12, 24, 36, 48],
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    videoTitle: '2 Litre Jumbo Reserve Showcase Video',
    gstRate: 18,
    hsnCode: '2201',
    tags: ['Family Pack', 'Jumbo 2L', 'Pantry Essential', 'High Value'],
    features: ['High-Strength Rigid Bottle', 'Pour-Friendly Ergonomic Grip', 'Laboratory Certified Purity', 'Extended Freshness Lock'],
    mineralInfo: {
      calcium: '25 mg/L',
      magnesium: '12 mg/L',
      potassium: '5 mg/L',
      sodium: '8 mg/L',
      bicarbonate: '72 mg/L',
      silica: '16 mg/L',
      tds: '138 ppm',
      ph: '7.5'
    },
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Default'
  }
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  ownerWhatsApp: '8017341130',
  helplinePhone: '+91 8017341130',
  contactEmail: 'orders@hhmineralwater.com',
  address: 'HH Mineral Water Plant, Industrial Water Hub, Kolkata, West Bengal - 700001',
  freeDeliveryMinAmount: 99,
  defaultDeliveryCharge: 20,
  adminPin: '170707',
  factoryStaffPin: '1234',
  acceptingOrders: true,
  autoProgressOrders: true, // Automated status progression enabled by default
  autoProgressIntervalMinutes: 2, // 2-minute realistic interval per fulfillment stage
  heroBannerImage: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
  heroBannerVideo: 'https://vjs.zencdn.net/v/oceans.mp4',
  heroMediaType: 'image',
  brandLogoImage: '',

  // Meta WhatsApp Cloud API Defaults
  whatsappCloudApiEnabled: false,
  whatsappPhoneNumberId: '',
  whatsappCloudApiToken: '',
  whatsappBusinessAccountId: '',
  adminWhatsAppNumber: '8017341130',
  adminNotificationEmail: 'mdc37332@gmail.com, mdhussain170707@gmail.com',
  adminEmailNotificationEnabled: true,
  adminSoundAlertEnabled: true,
  adminBrowserPushEnabled: true,

  // Factory Location & Logistics Delivery Constraints (Under 7 Km)
  factoryLocationName: 'HH Mineral Water Bottling Facility',
  factoryAddress: 'Plot 12, Block EP & GP, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
  factoryLatitude: 22.5726,
  factoryLongitude: 88.4331,
  maxDeliveryRadiusKm: 7.0, // Strictly under 7 Km
  selfPickupEnabled: true,
  selfPickupAddress: 'Factory Dispatch Counter #1, Plot 12, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
  selfPickupTimings: 'Monday – Sunday: 8:30 AM – 8:30 PM (Fresh Batch Ready in 30 Mins)',
  selfPickupContact: '+91 8017341130',
  factoryPincodes: ['700091', '700098', '700106', '700064', '700156', '700157', '700097', '700085', '700054', '700010', '700102', '700067', '700048', '700057', '700059', '700107', '700135'],

  // Indian GST & Business Invoicing Defaults (Editable by Admin)
  legalBusinessName: 'HH MINERAL WATER BOTTLING & BEVERAGES',
  tradeName: 'HH MINERAL WATER',
  businessAddress: 'HH Mineral Water Plant, Plot No. 12, Industrial Water Zone, Kolkata, West Bengal',
  gstin: '19AAACH1234F1Z8', // Fully editable in Admin Settings
  state: 'West Bengal',
  stateCode: '19',
  hsnCode: '2201', // HSN for Packaged Mineral / Drinking Water
  defaultGstRate: 18, // 18% standard GST on packaged mineral water
  pricesIncludeGst: true, // Retail catalog prices are GST-inclusive
  invoicePrefix: 'HH/2026/',
  fssaiNumber: '12822001000456',
  panNumber: 'AAACH1234F',
  cinNumber: 'U15543WB2026PTC245678',
  bankAccountName: 'HH MINERAL WATER BOTTLING & BEVERAGES',
  bankName: 'State Bank of India',
  bankAccountNumber: '389201094821',
  bankIfsc: 'SBIN0001234',
  bankUpiId: '8017341130@upi',
  invoiceTerms: '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to Kolkata jurisdiction.\n3. Keep packaged bottles in a dry, clean place away from direct sunlight.',

  // Pricing & Selling Price Controls (Admin-Only)
  showAllProducts: true,
  showSellingPrice: true,
  showDiscountPercentage: true,
  disabledSellingPriceProductIds: [],

  // Double-Entry Accounting: Zero All Accounts & Pure Live Product Revenue
  accountingZeroBaseMode: true,

  // Automated Low-Stock Monitoring & WhatsApp Alerts (+91 8017341130)
  lowStockAlertsEnabled: true,
  defaultBottleCriticalThreshold: 50,
  defaultBottleReorderLevel: 100,
  autoSendWhatsAppOnCriticalStock: true
};

export const INITIAL_BULK_INQUIRIES: import('../types').BulkInquiry[] = [
  {
    id: 'INQ-2026-8801',
    clientName: 'Rajesh Mukherjee',
    phone: '9830124490',
    email: 'rajesh.mukherjee@grandpalace.in',
    organization: 'Grand Palace Banquets & Events',
    eventType: 'Wedding Reception',
    bottleSize: '250ml',
    estimatedQuantity: 2400, // 100 cases
    deliveryDate: '2026-09-15',
    deliveryLocation: 'EM Bypass Banquet Complex, Kolkata - 700107',
    customBranding: true,
    status: 'Quoted',
    quotedRatePerUnit: 5.5,
    totalQuotedAmount: 13200,
    notes: 'Custom bride & groom monogram label requested in gloss gold foil.',
    createdAt: '2026-08-25T11:30:00.000Z'
  },
  {
    id: 'INQ-2026-8802',
    clientName: 'Suman Sen',
    phone: '9831987654',
    email: 'purchasing@parkviewsuites.com',
    organization: 'Park View Suites & Boutique Hotel',
    eventType: 'Hotel/Restaurant',
    bottleSize: '500ml',
    estimatedQuantity: 1200, // 50 cases
    deliveryDate: '2026-09-01',
    deliveryLocation: 'Park Street, Kolkata - 700016',
    customBranding: true,
    status: 'New',
    quotedRatePerUnit: 8.0,
    totalQuotedAmount: 9600,
    notes: 'Monthly recurring supply for guest rooms and restaurant tables.',
    createdAt: '2026-08-26T08:15:00.000Z'
  },
  {
    id: 'INQ-2026-8803',
    clientName: 'Amitava Roy',
    phone: '9748112233',
    organization: 'Roy Caterers & Event Decorators',
    eventType: 'Corporate',
    bottleSize: '1L',
    estimatedQuantity: 600, // 50 cases
    deliveryDate: '2026-09-10',
    deliveryLocation: 'Salt Lake Sector V, Kolkata - 700091',
    customBranding: false,
    status: 'Confirmed',
    quotedRatePerUnit: 14.0,
    totalQuotedAmount: 8400,
    notes: 'Standard HH branding bottles for annual tech conference.',
    createdAt: '2026-08-24T14:40:00.000Z'
  }
];

export const INITIAL_BATCH_QUALITY_LOGS: import('../types').BatchQualityLog[] = [
  {
    id: 'QLOG-2026-0826-A',
    batchNumber: 'HH-LOT-2026-0826',
    testDate: new Date().toISOString().split('T')[0],
    sourceTank: 'RO Buffer Storage Tank #01',
    phLevel: 7.38,
    tdsPpm: 118,
    turbidityNtu: 0.22,
    ozoneLevelMgL: 0.04,
    microbiologyPass: true,
    labTechnician: 'Dr. S. Chatterjee (Chief Microbiologist)',
    status: 'PASSED',
    remarks: 'Ultra-pure mineral equilibrium verified. Meets BIS IS 14543 and FSSAI norms.',
    fssaiCompliant: true
  },
  {
    id: 'QLOG-2026-0825-B',
    batchNumber: 'HH-LOT-2026-0825',
    testDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    sourceTank: 'Mineral Enriched Storage Tank #02',
    phLevel: 7.42,
    tdsPpm: 124,
    turbidityNtu: 0.28,
    ozoneLevelMgL: 0.05,
    microbiologyPass: true,
    labTechnician: 'R. K. Verma (QC Inspector)',
    status: 'PASSED',
    remarks: 'Ozonation and UV multi-stage sterilization 100% active.',
    fssaiCompliant: true
  }
];

export const INITIAL_FLEET_VEHICLES: import('../types').FleetVehicle[] = [
  {
    id: 'FLEET-01',
    vehicleNumber: 'WB-02-AK-9842',
    vehicleType: 'Mini Truck / Tata Ace',
    driverName: 'Ramesh Das',
    driverPhone: '+91 98305 12345',
    assignedRoute: 'Central Kolkata & Park Street Hub',
    capacityCases: 150,
    currentLoadCases: 84,
    status: 'On Delivery Route',
    todayDeliveriesCount: 6
  },
  {
    id: 'FLEET-02',
    vehicleNumber: 'WB-06-ER-4190',
    vehicleType: 'E-Rickshaw Cargo',
    driverName: 'Mohammed Aslam',
    driverPhone: '+91 97482 67890',
    assignedRoute: 'Salt Lake Sector 1-5 & New Town',
    capacityCases: 60,
    currentLoadCases: 0,
    status: 'Available',
    todayDeliveriesCount: 4
  },
  {
    id: 'FLEET-03',
    vehicleNumber: 'WB-12-VN-3301',
    vehicleType: 'Delivery Van',
    driverName: 'Bikash Mondal',
    driverPhone: '+91 80172 99881',
    assignedRoute: 'Howrah, Bally & Hooghly Commercial',
    capacityCases: 100,
    currentLoadCases: 45,
    status: 'On Delivery Route',
    todayDeliveriesCount: 5
  }
];

export const INITIAL_PLANT_EXPENSES: import('../types').PlantExpense[] = [
  {
    id: 'EXP-2026-0801',
    date: '2026-08-25',
    category: 'PET Preforms & Caps',
    title: 'Food-Grade PET Preforms 13.5g (5,000 pcs) + 28mm Blue Caps',
    amount: 14160,
    taxableAmount: 12000,
    gstRate: 18,
    cgstAmount: 1080,
    sgstAmount: 1080,
    hsnCode: '3923',
    vendorGstin: '19AAACP9981K1Z3',
    vendorName: 'Apex Polymers India Ltd.',
    invoiceOrBillRef: 'APEX/INV/2026/891',
    paymentMode: 'Bank Transfer',
    paymentStatus: 'Paid',
    itcEligible: true,
    quantity: 5000,
    unit: 'pcs',
    notes: 'Virgin PET preforms for 250ml pocket & 500ml active water bottles (Input Tax Credit Eligible)',
    createdAt: '2026-08-25T10:00:00.000Z'
  },
  {
    id: 'EXP-2026-0802',
    date: '2026-08-24',
    category: 'Corrugated Boxes & Shrink Pack',
    title: '24-Bottle 5-Ply Printed Master Cartons (200 boxes) + LDPE Shrink Wrap',
    amount: 5900,
    taxableAmount: 5000,
    gstRate: 18,
    cgstAmount: 450,
    sgstAmount: 450,
    hsnCode: '4819',
    vendorGstin: '19AABCK4490M1Z8',
    vendorName: 'Kolkata Packaging & Corrugators',
    invoiceOrBillRef: 'KPC-8891',
    paymentMode: 'UPI',
    paymentStatus: 'Paid',
    itcEligible: true,
    quantity: 200,
    unit: 'cartons',
    notes: 'Heavy duty 5-ply cartons printed with HH Mineral Water logo & barcodes',
    createdAt: '2026-08-24T12:30:00.000Z'
  },
  {
    id: 'EXP-2026-0803',
    date: '2026-08-23',
    category: 'Water Treatment Chemicals & Minerals',
    title: 'USP Food Grade Mineral Electrolytes (Magnesium Sulfate, Calcium Chloride, Potassium Bicarbonate)',
    amount: 3540,
    taxableAmount: 3000,
    gstRate: 18,
    cgstAmount: 270,
    sgstAmount: 270,
    hsnCode: '2833',
    vendorGstin: '19AABCP1120E1Z4',
    vendorName: 'PurAqua Chemical Solutions',
    invoiceOrBillRef: 'PUR/2026/331',
    paymentMode: 'Bank Transfer',
    paymentStatus: 'Paid',
    itcEligible: true,
    quantity: 25,
    unit: 'kg',
    notes: 'Essential minerals for balanced 7.4 pH and 125 ppm TDS taste profile',
    createdAt: '2026-08-23T11:00:00.000Z'
  },
  {
    id: 'EXP-2026-0804',
    date: '2026-08-22',
    category: 'Fleet Fuel & Vehicle Service',
    title: 'Diesel Fuel for Tata Ace Delivery Fleet (WB-02-AK-9842)',
    amount: 3200,
    taxableAmount: 3200,
    gstRate: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    hsnCode: '2710',
    vendorGstin: '19AAACI1198F1ZV',
    vendorName: 'Indian Oil Retail Outlet',
    invoiceOrBillRef: 'IOCL-PETROL-8291',
    paymentMode: 'UPI',
    paymentStatus: 'Paid',
    itcEligible: false,
    quantity: 35,
    unit: 'litres',
    notes: 'Weekly dispatch vehicle refueling for local Kolkata deliveries',
    createdAt: '2026-08-22T08:00:00.000Z'
  },
  {
    id: 'EXP-2026-0805',
    date: '2026-08-20',
    category: 'RO Membrane & Filter Consumables',
    title: '5-Micron Spun Sediment Filter Cartridges (12 pcs) + Coconut Carbon Block',
    amount: 4720,
    taxableAmount: 4000,
    gstRate: 18,
    cgstAmount: 360,
    sgstAmount: 360,
    hsnCode: '8421',
    vendorGstin: '19AAACT8819Q1ZP',
    vendorName: 'AquaTech Industrial Spares',
    invoiceOrBillRef: 'AT-99120',
    paymentMode: 'Bank Transfer',
    paymentStatus: 'Paid',
    itcEligible: true,
    quantity: 12,
    unit: 'pcs',
    notes: 'Scheduled monthly pre-treatment sediment & carbon cartridge replacement',
    createdAt: '2026-08-20T15:00:00.000Z'
  }
];

export const DEFAULT_RAW_MATERIALS_INVENTORY: RawMaterialStockItem[] = [
  {
    id: 'RAW-001',
    name: 'PET Preforms 13.5g (28mm PCO 1810 Neck)',
    category: 'PET Preforms & Caps',
    hsnCode: '3923',
    currentStock: 450, // Critical: below 1,000 threshold
    unit: 'pcs',
    criticalThreshold: 1000,
    reorderLevel: 2500,
    costPerUnit: 1.85,
    standardVendorName: 'Apex Polymers India Ltd.',
    standardVendorPhone: '+91 98305 12345',
    lastRestockedDate: '2026-08-25',
    lastRestockedQty: 5000,
    notes: 'Food-grade virgin PET resin for 250ml & 500ml bottles'
  },
  {
    id: 'RAW-002',
    name: '28mm Food-Grade Tamper-Evident Blue Caps',
    category: 'Bottle Caps & Closures',
    hsnCode: '3923',
    currentStock: 380, // Critical: below 800 threshold
    unit: 'pcs',
    criticalThreshold: 800,
    reorderLevel: 2000,
    costPerUnit: 0.65,
    standardVendorName: 'Apex Polymers India Ltd.',
    standardVendorPhone: '+91 98305 12345',
    lastRestockedDate: '2026-08-25',
    lastRestockedQty: 5000,
    notes: 'Hermetic seal closures with tamper-evident drop ring'
  },
  {
    id: 'RAW-003',
    name: '5-Ply Corrugated Printed Master Cartons (24-Bottle)',
    category: 'Corrugated Boxes & Shrink Pack',
    hsnCode: '4819',
    currentStock: 28, // Critical: below 50 threshold
    unit: 'cartons',
    criticalThreshold: 50,
    reorderLevel: 120,
    costPerUnit: 24.5,
    standardVendorName: 'Kolkata Packaging & Corrugators',
    standardVendorPhone: '+91 98311 22334',
    lastRestockedDate: '2026-08-24',
    lastRestockedQty: 200,
    notes: 'Heavy duty 150 GSM Kraft paper boxes with HH branding'
  },
  {
    id: 'RAW-004',
    name: 'Food Grade Mineral Electrolytes Premix (Mg, Ca, K)',
    category: 'Water Treatment Chemicals & Minerals',
    hsnCode: '2833',
    currentStock: 14, // Warning: below 25 reorder level, above 10 critical
    unit: 'kg',
    criticalThreshold: 10,
    reorderLevel: 25,
    costPerUnit: 140.0,
    standardVendorName: 'PurAqua Chemical Solutions',
    standardVendorPhone: '+91 98319 87654',
    lastRestockedDate: '2026-08-23',
    lastRestockedQty: 25,
    notes: 'Food grade remineralization salts for BIS IS 14543 compliance'
  },
  {
    id: 'RAW-005',
    name: '5-Micron Spun Sediment & Carbon Filter Cartridges',
    category: 'RO Membrane & Filter Consumables',
    hsnCode: '8421',
    currentStock: 3, // Critical: below 5 threshold
    unit: 'filters',
    criticalThreshold: 5,
    reorderLevel: 12,
    costPerUnit: 320.0,
    standardVendorName: 'AquaTech Industrial Spares',
    standardVendorPhone: '+91 98300 99887',
    lastRestockedDate: '2026-08-20',
    lastRestockedQty: 12,
    notes: 'Pre-treatment stage 1 & 2 microfiltration consumables'
  },
  {
    id: 'RAW-006',
    name: 'FilmTec 8040 High-Rejection RO Membrane Elements',
    category: 'RO Membrane & Filter Consumables',
    hsnCode: '8421',
    currentStock: 3, // Healthy / Warning border
    unit: 'filters',
    criticalThreshold: 2,
    reorderLevel: 4,
    costPerUnit: 8500.0,
    standardVendorName: 'AquaTech Industrial Spares',
    standardVendorPhone: '+91 98300 99887',
    lastRestockedDate: '2026-07-15',
    lastRestockedQty: 4,
    notes: 'High flux polyamide composite thin-film elements'
  },
  {
    id: 'RAW-007',
    name: 'LDPE Heavy Duty Heat Shrink Film Rolls',
    category: 'Corrugated Boxes & Shrink Pack',
    hsnCode: '3920',
    currentStock: 9, // Warning: below 15 reorder level
    unit: 'rolls',
    criticalThreshold: 6,
    reorderLevel: 15,
    costPerUnit: 650.0,
    standardVendorName: 'Kolkata Packaging & Corrugators',
    standardVendorPhone: '+91 98311 22334',
    lastRestockedDate: '2026-08-24',
    lastRestockedQty: 20,
    notes: 'Multipack shrink bundle wrapping film'
  },
  {
    id: 'RAW-008',
    name: 'Delivery Fleet Diesel Fuel Reserve',
    category: 'Fleet Fuel & Vehicle Service',
    hsnCode: '2710',
    currentStock: 48, // Healthy
    unit: 'litres',
    criticalThreshold: 30,
    reorderLevel: 60,
    costPerUnit: 92.5,
    standardVendorName: 'Indian Oil Retail Outlet Sector V',
    standardVendorPhone: '+91 80173 41130',
    lastRestockedDate: '2026-08-22',
    lastRestockedQty: 35,
    notes: 'Emergency on-site fuel reserve for Tata Ace & dispatch fleet'
  },
  {
    id: 'RAW-009',
    name: 'Waterproof BOPP Metallic Roll Labels (Standard)',
    category: 'Other Operational',
    hsnCode: '4821',
    currentStock: 1250, // Healthy
    unit: 'pcs',
    criticalThreshold: 800,
    reorderLevel: 2500,
    costPerUnit: 0.75,
    standardVendorName: 'PrintCraft Label Technologies',
    standardVendorPhone: '+91 98302 44556',
    lastRestockedDate: '2026-08-18',
    lastRestockedQty: 5000,
    notes: 'High-gloss moisture-proof roll labels for automatic applicator'
  }
];


