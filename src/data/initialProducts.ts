import { Product, AdminSettings } from '../types';

export const AVAILABLE_PACK_SIZES = [12, 24, 36, 48] as const;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-250ml',
    name: 'HH Mineral Water — Pocket Hydration',
    size: '250ml',
    price: 5,
    mrp: 8,
    customDesignPrice: 10, // Double normal price (₹5 * 2)
    image: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Compact 250ml ergonomic bottle. Sold in 12, 24, 36 & 48-bottle wholesale packs for events, weddings & conferences.',
    description: 'HH 250ml Pocket Hydration provides crystal-clear pristine natural mineral water purified through a 7-stage advanced multi-barrier process with added natural electrolytes, balanced 7.4 pH, and essential minerals. Sold strictly in 12, 24, 36, and 48 piece packs (single bottle retail not available).',
    inStock: true,
    minOrderQty: 12,
    category: 'Standard',
    badge: 'Popular for Events',
    casePackSize: 24,
    packOptions: [12, 24, 36, 48],
    features: [
      'Available in 12, 24, 36, 48 piece packs',
      'Ergonomic easy-grip shape',
      'Tamper-evident airtight seal',
      'Ideal for custom label branding',
      'BPA-free 100% recyclable PET'
    ],
    mineralInfo: {
      calcium: '18 mg/L',
      magnesium: '9 mg/L',
      potassium: '3.2 mg/L',
      sodium: '6.5 mg/L',
      bicarbonate: '55 mg/L',
      silica: '12 mg/L',
      tds: '120 ppm (Ideal Mineral Rich)',
      ph: '7.4 (Naturally Alkaline)'
    }
  },
  {
    id: 'prod-500ml',
    name: 'HH Mineral Water — Active Daily Pure',
    size: '500ml',
    price: 8,
    mrp: 12,
    customDesignPrice: 16, // Double normal price (₹8 * 2)
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'The classic 500ml companion for daily commute, gym, dining & offices. Sold in 12, 24, 36 & 48-bottle packs.',
    description: 'Stay at peak hydration with HH 500ml Natural Mineral Water. Enhanced with essential Magnesium and Calcium, micro-filtered with reverse osmosis and activated carbon polish. Sold strictly in 12, 24, 36, and 48 piece factory packs.',
    inStock: true,
    minOrderQty: 12,
    category: 'Standard',
    badge: 'Best Seller',
    casePackSize: 24,
    packOptions: [12, 24, 36, 48],
    features: [
      'Sold in 12, 24, 36, 48 bottle packs',
      'Perfect daily hydration balance',
      'Ultra-pure 7-Stage UV filtration',
      'Micro-structured clean taste',
      '100% Food-grade recyclable'
    ],
    mineralInfo: {
      calcium: '22 mg/L',
      magnesium: '11 mg/L',
      potassium: '4.1 mg/L',
      sodium: '7.2 mg/L',
      bicarbonate: '62 mg/L',
      silica: '14 mg/L',
      tds: '125 ppm (Pristine Grade)',
      ph: '7.4 (Alkaline Balance)'
    }
  },
  {
    id: 'prod-1l',
    name: 'HH Mineral Water — Pure Spring Luxury',
    size: '1L',
    price: 10,
    mrp: 15,
    customDesignPrice: 20, // Double normal price (₹10 * 2)
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Full 1-Liter family bottle for long journeys, corporate meeting rooms & dining. Sold in 12, 24, 36 & 48 packs.',
    description: 'Our flagship 1L bottle engineered for uncompromising purity. Sourced from deep pristine aquifers, infused with balanced natural trace minerals, and sealed in high-durability crystal clear bottles. Available exclusively in 12, 24, 36, and 48 bottle bundles.',
    inStock: true,
    minOrderQty: 12,
    category: 'Premium',
    badge: 'Great Value',
    casePackSize: 12,
    packOptions: [12, 24, 36, 48],
    features: [
      'Available in 12, 24, 36, 48 piece packs',
      'All-day optimal hydration reservoir',
      'Triple micro-purified & ozonated',
      'Natural mineral enrichment',
      'Rigid leak-proof body'
    ],
    mineralInfo: {
      calcium: '24 mg/L',
      magnesium: '12 mg/L',
      potassium: '4.5 mg/L',
      sodium: '8.0 mg/L',
      bicarbonate: '68 mg/L',
      silica: '15 mg/L',
      tds: '130 ppm (Optimal Balance)',
      ph: '7.5 (Pristine Alkaline)'
    }
  },
  {
    id: 'prod-2l',
    name: 'HH Mineral Water — Family & Party Pack',
    size: '2L',
    price: 25,
    mrp: 35,
    customDesignPrice: 50, // Double normal price (₹25 * 2)
    image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Jumbo 2-Liter mega bottle for households, dining tables & wedding catering. Sold in 12, 24, 36 & 48 packs.',
    description: 'HH 2L Family Pack ensures your household or party guests never run low on crisp, pure, revitalizing mineral water. Offers the maximum economy and convenience. Available in 12, 24, 36, and 48 piece pack bundles.',
    inStock: true,
    minOrderQty: 12,
    category: 'Standard',
    badge: 'Super Saver',
    casePackSize: 12,
    packOptions: [12, 24, 36, 48],
    features: [
      'Available in 12, 24, 36, 48 piece packs',
      'High capacity 2000ml volume',
      'Heavy-duty ergonomic sturdy grip',
      'Cost-effective bulk hydration',
      'Fresh seal aroma-lock cap'
    ],
    mineralInfo: {
      calcium: '24 mg/L',
      magnesium: '12 mg/L',
      potassium: '4.5 mg/L',
      sodium: '8.0 mg/L',
      bicarbonate: '68 mg/L',
      silica: '15 mg/L',
      tds: '130 ppm',
      ph: '7.4'
    }
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

