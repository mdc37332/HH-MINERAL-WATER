import { Product, AdminSettings } from '../types';

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
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1559839914-ba2ce935690b?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Full 1-litre table bottle with premium mineral balance.',
    description: 'High-clarity 1 Litre mineral water bottle engineered for family dining, restaurants, long journeys, and hotel guest suites.',
    inStock: true,
    stockCount: 650,
    stockStatus: 'In Stock',
    minOrderQty: 1,
    category: 'Premium',
    badge: 'Restaurant Choice',
    casePackSize: 12,
    packOptions: [12, 24, 36, 48],
    gstRate: 18,
    hsnCode: '2201',
    tags: ['Table Water', 'Hotel Suite', 'Dining', '1 Litre'],
    features: ['Multi-Barrier Ultra Filtration', 'Optimized TDS 120-140 ppm', 'Heavy Duty Grip Bottle', 'Zero Microplastics'],
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
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Extra-large 2L bottle for home, office & travel supply.',
    description: 'Maximum volume 2-Litre heavy-duty bottle for home kitchens, work pantries, picnics, catering setups, and extended road travel.',
    inStock: true,
    stockCount: 400,
    stockStatus: 'In Stock',
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Value Pack',
    casePackSize: 6,
    packOptions: [6, 12, 24],
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
  adminPin: '8017',
  acceptingOrders: true,
  autoProgressOrders: true, // Automated status progression enabled by default
  autoProgressIntervalMinutes: 2, // 2-minute realistic interval per fulfillment stage
  heroBannerImage: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
  brandLogoImage: '',

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
  invoiceTerms: '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to Kolkata jurisdiction.\n3. Keep packaged bottles in a cool, dry, clean place away from direct sunlight.'
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
    title: 'Food-Grade PET Preforms 13.5g (5,000 pcs) + 28mm Caps',
    amount: 14500,
    paymentMode: 'Bank Transfer',
    vendorName: 'Apex Polymers Ltd.',
    invoiceOrBillRef: 'APEX/INV/2026/891',
    notes: 'For 250ml and 500ml production line',
    createdAt: '2026-08-25T10:00:00.000Z'
  },
  {
    id: 'EXP-2026-0802',
    date: '2026-08-24',
    category: 'Corrugated Boxes & Shrink Pack',
    title: '24-Bottle 5-Ply Master Cartons (200 boxes)',
    amount: 5800,
    paymentMode: 'UPI',
    vendorName: 'Kolkata Packaging & Corrugators',
    invoiceOrBillRef: 'KPC-8891',
    notes: 'Printed HH brand master cartons',
    createdAt: '2026-08-24T12:30:00.000Z'
  },
  {
    id: 'EXP-2026-0803',
    date: '2026-08-22',
    category: 'Fleet Fuel & Vehicle Service',
    title: 'Diesel Fuel for Tata Ace Delivery Fleet (WB-02-AK-9842)',
    amount: 3200,
    paymentMode: 'UPI',
    vendorName: 'Indian Oil Retail Outlet',
    invoiceOrBillRef: 'IOCL-PETROL-8291',
    notes: 'Weekly dispatch fueling',
    createdAt: '2026-08-22T08:00:00.000Z'
  },
  {
    id: 'EXP-2026-0804',
    date: '2026-08-20',
    category: 'RO Membrane & Filter Consumables',
    title: '5-Micron Spun Sediment Filters (Pack of 12) + Activated Carbon',
    amount: 4600,
    paymentMode: 'Bank Transfer',
    vendorName: 'AquaTech Industrial Spares',
    invoiceOrBillRef: 'AT-99120',
    notes: 'Scheduled monthly filtration cartridge replacement',
    createdAt: '2026-08-20T15:00:00.000Z'
  }
];

