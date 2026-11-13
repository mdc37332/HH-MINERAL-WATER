export interface BottlePreset {
  id: string;
  title: string;
  size: string;
  desc: string;
  url: string;
  category: string;
}

export const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85';
export const DEFAULT_BOTTLE_IMAGE = 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85';

export const BOTTLE_IMAGE_PRESETS: BottlePreset[] = [
  {
    id: 'preset-500ml-active',
    title: '500ml Everyday Active',
    size: '500ml',
    desc: 'Signature clear PET with condensation droplets and ergonomic contour',
    url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85',
    category: 'Standard'
  },
  {
    id: 'preset-250ml-pocket',
    title: '250ml Pocket Hydration',
    size: '250ml',
    desc: 'Compact single-serve bottle for events, hospitality, and banquets',
    url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85',
    category: 'Pocket'
  },
  {
    id: 'preset-1L-luxury',
    title: '1 Litre Premium Table Edition',
    size: '1L',
    desc: 'Full 1-litre table bottle with crystal clarity and pristine mineral balance',
    url: 'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?auto=format&fit=crop&w=1000&q=85',
    category: 'Table'
  },
  {
    id: 'preset-2L-jumbo',
    title: '2 Litre Jumbo Family Reserve',
    size: '2L',
    desc: 'Maximum volume heavy-duty bottle for home kitchens, offices, and road trips',
    url: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=1000&q=85',
    category: 'Jumbo'
  },
  {
    id: 'preset-artisan-glass',
    title: 'Artisan Luxury Glass Mineral Water',
    size: '500ml Glass',
    desc: 'High-clarity luxury glass edition for fine dining and executive suites',
    url: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=1000&q=85',
    category: 'Luxury'
  },
  {
    id: 'preset-glacier-crisp',
    title: 'Crisp Glacier Mountain Spring',
    size: '750ml Sport',
    desc: 'Chilled mountain spring water in an active sport silhouette',
    url: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?auto=format&fit=crop&w=1000&q=85',
    category: 'Active'
  },
  {
    id: 'preset-pristine-spring',
    title: 'Natural Alkaline Spring Hydration',
    size: '500ml',
    desc: 'Ultra-pure bottled spring water with natural mineral richness',
    url: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=1000&q=85',
    category: 'Standard'
  }
];

/**
 * Checks if a given image URL points to outdated dead images or doctor photos
 */
export function isDeadOrDoctorImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('photo-1559839914-17aae19cec71') ||
    lower.includes('photo-1548839140-29a749e1bc4e') ||
    lower.includes('photo-1559839914-ba2ce935690b')
  );
}

/**
 * High-fidelity SVG fallback bottle that renders crisp, realistic studio bottled water
 */
export const STUDIO_BOTTLE_SVG_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 460" width="240" height="460">
  <defs>
    <linearGradient id="bottleBody" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.95"/>
      <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="75%" stop-color="#38bdf8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="goldCap" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#DFC283"/>
      <stop offset="50%" stop-color="#F3E5AB"/>
      <stop offset="100%" stop-color="#C5A059"/>
    </linearGradient>
    <linearGradient id="goldLabel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#141414"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
  </defs>

  <!-- Bottle Cap -->
  <rect x="96" y="20" width="48" height="26" rx="5" fill="url(#goldCap)" stroke="#C5A059" stroke-width="1.5"/>
  <line x1="102" y1="20" x2="102" y2="46" stroke="#997A35" stroke-width="1.5"/>
  <line x1="112" y1="20" x2="112" y2="46" stroke="#997A35" stroke-width="1.5"/>
  <line x1="120" y1="20" x2="120" y2="46" stroke="#ffffff" stroke-width="1"/>
  <line x1="128" y1="20" x2="128" y2="46" stroke="#997A35" stroke-width="1.5"/>
  <line x1="138" y1="20" x2="138" y2="46" stroke="#997A35" stroke-width="1.5"/>

  <!-- Neck Ring & Neck -->
  <rect x="92" y="46" width="56" height="8" rx="2" fill="#38bdf8" opacity="0.6"/>
  <path d="M96,54 L96,85 Q96,115 65,145 L65,405 Q65,425 90,430 L150,430 Q175,425 175,405 L175,145 Q144,115 144,85 L144,54 Z"
        fill="url(#bottleBody)" stroke="#38bdf8" stroke-width="1.5" opacity="0.95"/>

  <!-- Inner Water Highlight -->
  <path d="M102,60 L102,85 Q102,110 75,140 L75,400 Q75,415 95,420 L145,420 Q165,415 165,400 L165,140 Q138,110 138,85 L138,60 Z"
        fill="none" stroke="#ffffff" stroke-width="2" opacity="0.4"/>

  <!-- Studio Label -->
  <rect x="68" y="195" width="104" height="135" rx="6" fill="url(#goldLabel)" stroke="#C5A059" stroke-width="2"/>
  <rect x="74" y="201" width="92" height="123" rx="4" fill="none" stroke="#C5A059" stroke-width="0.75" stroke-dasharray="2,2"/>
  
  <text x="120" y="235" fill="#DFC283" font-family="'Cinzel', serif, sans-serif" font-weight="900" font-size="20" text-anchor="middle" letter-spacing="2">HH</text>
  <text x="120" y="258" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="9" text-anchor="middle" letter-spacing="3">NATURAL MINERAL</text>
  <text x="120" y="274" fill="#C5A059" font-family="sans-serif" font-weight="800" font-size="8.5" text-anchor="middle" letter-spacing="2">WATER</text>
  
  <line x1="85" y1="284" x2="155" y2="284" stroke="#C5A059" stroke-width="1" opacity="0.8"/>
  <text x="120" y="298" fill="#38BDF8" font-family="sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">7.4 pH • 7-STAGE UV</text>
  <text x="120" y="312" fill="#E2E8F0" font-family="sans-serif" font-weight="600" font-size="7" text-anchor="middle">100% PURE &amp; NATURAL</text>

  <!-- Droplets on Bottle -->
  <circle cx="82" cy="155" r="2.5" fill="#ffffff" opacity="0.7"/>
  <circle cx="158" cy="165" r="2" fill="#ffffff" opacity="0.8"/>
  <circle cx="80" cy="355" r="3" fill="#ffffff" opacity="0.7"/>
  <circle cx="160" cy="370" r="2.5" fill="#ffffff" opacity="0.7"/>
</svg>
`.trim());
