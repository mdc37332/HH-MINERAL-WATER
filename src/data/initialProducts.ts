import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-250ml',
    name: 'HH Mineral Water — Pocket Hydration',
    size: '250ml',
    price: 5,
    mrp: 8,
    image: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Compact 250ml ergonomic bottle. Perfect for events, wedding tables, conferences, and on-the-go pure sips.',
    description: 'HH 250ml Pocket Hydration provides crystal-clear pristine natural mineral water purified through a 7-stage advanced multi-barrier process with added natural electrolytes, balanced 7.4 pH, and essential minerals for instant refreshment.',
    inStock: true,
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Popular for Events',
    casePackSize: 24,
    features: [
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
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'The classic 500ml companion for daily commute, gym, office desks, dining, and outdoor activities.',
    description: 'Stay at peak hydration with HH 500ml Natural Mineral Water. Enhanced with essential Magnesium and Calcium, micro-filtered with reverse osmosis and activated carbon polish to deliver an exceptionally crisp, velvety mouthfeel.',
    inStock: true,
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Best Seller',
    casePackSize: 20,
    features: [
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
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Full 1-Liter family bottle for long journeys, corporate meeting rooms, restaurants, and active fitness.',
    description: 'Our flagship 1L bottle engineered for uncompromising purity. Sourced from deep pristine aquifers, infused with balanced natural trace minerals, and sealed in high-durability crystal clear bottles with triple-lock spill proof lids.',
    inStock: true,
    minOrderQty: 1,
    category: 'Premium',
    badge: 'Great Value',
    casePackSize: 12,
    features: [
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
    image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Jumbo 2-Liter mega bottle for households, dining tables, wedding catering, road trips, and bulk dining.',
    description: 'HH 2L Family Pack ensures your household or party guests never run low on crisp, pure, revitalizing mineral water. Offers the maximum economy and convenience without compromising on our signature purity standards.',
    inStock: true,
    minOrderQty: 1,
    category: 'Standard',
    badge: 'Super Saver',
    casePackSize: 6,
    features: [
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

export const DEFAULT_ADMIN_SETTINGS = {
  ownerWhatsApp: '8017341130',
  helplinePhone: '+91 8017341130',
  contactEmail: 'orders@hhmineralwater.com',
  address: 'HH Mineral Water Plant, Industrial Water Hub, Kolkata & Surrounding Region',
  freeDeliveryMinAmount: 99,
  defaultDeliveryCharge: 20,
  adminPin: '8017',
  acceptingOrders: true
};
