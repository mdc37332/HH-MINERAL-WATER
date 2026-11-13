import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { getPincodeCentroid, LOCAL_PINCODE_DISTANCES, DEFAULT_FACTORY_CONFIG } from './factoryLocation';

// Provisioned Google Maps Platform API Key
export const GOOGLE_MAPS_API_KEY: string =
  (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof window !== 'undefined' && (window as any).__VITE_GOOGLE_MAPS_API_KEY__) ||
  'AIzaSyA8iqtaI3_UEH1fz5USvbj7cTmxJUcrGJc';

// Mandatory solution ID for tracking and attribution as required by GMP Skills
export const SOLUTION_ATTRIBUTION_ID = 'gmp_git_agentskills_v1';

let isOptionsConfigured = false;
let mapsPromise: Promise<typeof google.maps> | null = null;

/**
 * Initializes and loads the Google Maps JavaScript API with Places, Geometry, Marker, Routes, and Geocoding libraries.
 */
export function getGoogleMapsLoader(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in a browser environment.'));
  }

  // If already loaded on window
  if ((window as any).google && (window as any).google.maps) {
    return Promise.resolve((window as any).google.maps);
  }

  if (!isOptionsConfigured) {
    try {
      setOptions({
        key: GOOGLE_MAPS_API_KEY,
        v: 'weekly',
        libraries: ['places', 'geometry', 'marker', 'routes', 'geocoding'],
        solutionChannel: SOLUTION_ATTRIBUTION_ID
      });
      isOptionsConfigured = true;
    } catch (e) {
      console.warn('Google Maps setOptions notice:', e);
    }
  }

  if (!mapsPromise) {
    mapsPromise = (async () => {
      // Load essential libraries progressively to prevent single-library failure from crashing the map
      const libLoaders = [
        importLibrary('maps').catch(err => {
          console.warn('Failed to load maps library:', err);
          return null;
        }),
        importLibrary('places').catch(err => {
          console.warn('Failed to load places library:', err);
          return null;
        }),
        importLibrary('marker').catch(err => {
          console.warn('Failed to load marker library:', err);
          return null;
        }),
        importLibrary('routes').catch(err => {
          console.warn('Failed to load routes library:', err);
          return null;
        }),
        importLibrary('geocoding').catch(err => {
          console.warn('Geocoding modular import notice:', err);
          return null;
        })
      ];

      await Promise.all(libLoaders);

      if ((window as any).google && (window as any).google.maps) {
        return (window as any).google.maps;
      }
      throw new Error('Google Maps JavaScript SDK could not be initialized.');
    })().catch(err => {
      console.warn('Google Maps Loader fallback:', err);
      mapsPromise = null;
      throw err;
    });
  }

  return mapsPromise;
}

/**
 * Safely obtains a Google Maps Geocoder instance across different SDK packaging versions
 */
export async function getGeocoder(): Promise<google.maps.Geocoder | null> {
  try {
    const maps = await getGoogleMapsLoader();
    if ((maps as any).Geocoder) {
      return new (maps as any).Geocoder();
    }
    const geocodingLib = (await importLibrary('geocoding')) as any;
    if (geocodingLib?.Geocoder) {
      return new geocodingLib.Geocoder();
    }
    if ((window as any).google?.maps?.Geocoder) {
      return new (window as any).google.maps.Geocoder();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Executes a geocoding request with a strict 4-second timeout, supporting both callback & Promise styles.
 */
function safeGeocode(
  geocoder: google.maps.Geocoder,
  request: google.maps.GeocoderRequest
): Promise<google.maps.GeocoderResult[]> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve([]), 4000);
    let resolved = false;

    const finish = (res: google.maps.GeocoderResult[]) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(res);
      }
    };

    try {
      const maybePromise = geocoder.geocode(request, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          finish(results);
        } else {
          finish([]);
        }
      });

      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        (maybePromise as any)
          .then((res: any) => {
            if (res && res.results) finish(res.results);
            else if (Array.isArray(res)) finish(res);
          })
          .catch(() => finish([]));
      }
    } catch {
      finish([]);
    }
  });
}

/**
 * Generates an official Google Maps turn-by-turn navigation URL.
 * Designed for delivery drivers to navigate directly to the customer's delivery destination.
 */
export function getGoogleMapsNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Generates a Google Maps search/pin URL for exact lat/lng.
 */
export function getGoogleMapsLocationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Reverse geocodes coordinates to a human-readable street address using Google Maps Geocoder,
 * with graceful fallback to Nominatim and Kolkata locality centroids.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  locality?: string;
  sublocality?: string;
  postalCode?: string;
  state?: string;
}> {
  // 1. Try Google Maps Geocoder with safe fallback
  try {
    const geocoder = await getGeocoder();
    if (geocoder) {
      const results = await safeGeocode(geocoder, { location: { lat, lng } });

      if (results && results.length > 0) {
        const topResult = results[0];
        let streetNumber = '';
        let route = '';
        let locality = '';
        let sublocality = '';
        let postalCode = '';
        let state = '';

        topResult.address_components.forEach(comp => {
          if (comp.types.includes('street_number')) streetNumber = comp.long_name;
          if (comp.types.includes('route')) route = comp.long_name;
          if (comp.types.includes('locality')) locality = comp.long_name;
          if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) sublocality = comp.long_name;
          if (comp.types.includes('postal_code')) postalCode = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        });

        return {
          formattedAddress: topResult.formatted_address,
          streetNumber,
          route,
          locality: locality || sublocality,
          sublocality,
          postalCode,
          state
        };
      }
    }
  } catch (error) {
    console.warn('Google Maps reverse geocoding notice:', error);
  }

  // 2. Try OpenStreetMap Nominatim reverse geocode (client fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (nomData && nomData.display_name) {
        const addr = nomData.address || {};
        return {
          formattedAddress: nomData.display_name,
          streetNumber: addr.house_number,
          route: addr.road,
          locality: addr.city || addr.town || addr.suburb || 'Kolkata',
          sublocality: addr.neighbourhood || addr.suburb,
          postalCode: addr.postcode,
          state: addr.state || 'West Bengal'
        };
      }
    }
  } catch {
    // Ignore network error and proceed to centroid matching
  }

  // 3. Match against closest known local Kolkata pincode centroid
  let closestArea = 'Salt Lake, Kolkata';
  let closestPincode = '700091';
  let minDistance = Infinity;

  Object.entries(LOCAL_PINCODE_DISTANCES).forEach(([pin, info]) => {
    const distSq = Math.pow(info.lat - lat, 2) + Math.pow(info.lng - lng, 2);
    if (distSq < minDistance) {
      minDistance = distSq;
      closestArea = info.area;
      closestPincode = pin;
    }
  });

  return {
    formattedAddress: `${closestArea}, Kolkata - ${closestPincode}`,
    locality: 'Kolkata',
    sublocality: closestArea,
    postalCode: closestPincode,
    state: 'West Bengal'
  };
}

/**
 * Forward geocodes a customer street address to coordinates using Google Maps Geocoder,
 * with automated fallbacks to Kolkata pincode centroids and OpenStreetMap.
 * Enables dropping a map pin directly at the customer's typed delivery address.
 */
export async function geocodeAddressText(addressText: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
  postalCode?: string;
  locality?: string;
} | null> {
  if (!addressText || !addressText.trim()) return null;
  const rawQuery = addressText.trim();

  // Extract 6-digit PIN code if present
  const pinMatch = rawQuery.match(/\b(700\d{3})\b/);
  const detectedPin = pinMatch ? pinMatch[1] : null;

  // 1. Try Google Maps Geocoder
  try {
    const geocoder = await getGeocoder();
    if (geocoder) {
      // Ensure city/state context if omitted
      const qualifiedQuery = /kolkata|west bengal|salt lake|new town/i.test(rawQuery)
        ? rawQuery
        : `${rawQuery}, Salt Lake, Kolkata, West Bengal, India`;

      const results = await safeGeocode(geocoder, {
        address: qualifiedQuery,
        componentRestrictions: { country: 'in' }
      });

      if (results && results.length > 0) {
        const top = results[0];
        const lat = top.geometry.location.lat();
        const lng = top.geometry.location.lng();

        let postalCode = '';
        let locality = '';
        top.address_components.forEach(comp => {
          if (comp.types.includes('postal_code')) postalCode = comp.long_name;
          if (comp.types.includes('locality')) locality = comp.long_name;
        });

        return {
          lat,
          lng,
          formattedAddress: top.formatted_address,
          postalCode: postalCode || detectedPin || undefined,
          locality
        };
      }
    }
  } catch (error) {
    console.warn('Google Maps forward geocoding notice:', error);
  }

  // 2. Check known local Kolkata pincode table
  if (detectedPin && LOCAL_PINCODE_DISTANCES[detectedPin]) {
    const pinInfo = LOCAL_PINCODE_DISTANCES[detectedPin];
    return {
      lat: pinInfo.lat,
      lng: pinInfo.lng,
      formattedAddress: `${rawQuery}, ${pinInfo.area}, Kolkata ${detectedPin}`,
      postalCode: detectedPin,
      locality: 'Kolkata'
    };
  }

  // Check specific local Kolkata hubs and landmarks
  const lower = rawQuery.toLowerCase();
  const LOCAL_LANDMARK_MAP: { keywords: string[]; lat: number; lng: number; area: string; pin: string }[] = [
    { keywords: ['sector v', 'sector 5', 'sector-v', 'sector-5', 'ep block', 'gp block', 'webel', 'technopolis', 'college more', 'rdb', 'godrej waterside', 'infinity benchmark'], lat: 22.5726, lng: 88.4331, area: 'Salt Lake Sector V', pin: '700091' },
    { keywords: ['karunamoyee', 'mayukh bhavan', 'bikash bhavan', 'central park', 'sector ii', 'sector 2', 'sector-ii', 'sector-2'], lat: 22.5855, lng: 88.4182, area: 'Salt Lake Sector II / Karunamoyee', pin: '700106' },
    { keywords: ['city centre', 'city center', 'sector i', 'sector 1', 'sector-i', 'sector-1', 'baf block', 'bd block'], lat: 22.5938, lng: 88.4089, area: 'Salt Lake Sector I / City Centre 1', pin: '700064' },
    { keywords: ['stadium', 'yuva bharati', 'hyatt', 'sector iii', 'sector 3', 'sector-iii', 'sector-3', 'duttabad', 'subhas sarobar'], lat: 22.5697, lng: 88.4112, area: 'Salt Lake Sector III / Stadium', pin: '700098' },
    { keywords: ['new town', 'action area 1', 'action area i', 'action area-1', 'dlf', 'axis mall', 'pride hotel', 'biswa bangla'], lat: 22.5824, lng: 88.4597, area: 'New Town Action Area I', pin: '700156' },
    { keywords: ['eco park', 'action area 2', 'action area ii', 'action area-2', 'mothers wax museum'], lat: 22.6095, lng: 88.4720, area: 'New Town Action Area II', pin: '700135' },
    { keywords: ['kestopur', 'vip road', 'mission bazar', 'prafulla kanan'], lat: 22.6047, lng: 88.4308, area: 'Kestopur / VIP Road', pin: '700097' },
    { keywords: ['beliaghata', 'beleghata', 'building hub', 'cit road'], lat: 22.5645, lng: 88.3982, area: 'Beliaghata', pin: '700085' },
    { keywords: ['phoolbagan', 'kankurgachi', 'maniktala'], lat: 22.5786, lng: 88.3942, area: 'Phoolbagan / Kankurgachi', pin: '700054' },
    { keywords: ['lake town', 'bangur', 'bangur avenue', 'clock tower'], lat: 22.6025, lng: 88.4072, area: 'Lake Town / Bangur Avenue', pin: '700102' },
    { keywords: ['ultadanga', 'bidhan nagar road', 'hudco'], lat: 22.5970, lng: 88.3890, area: 'Ultadanga', pin: '700067' },
    { keywords: ['baguiati', 'deshbandhu nagar'], lat: 22.6180, lng: 88.4280, area: 'Baguiati', pin: '700057' },
    { keywords: ['teghoria', 'rajarhat road'], lat: 22.6220, lng: 88.4350, area: 'Teghoria', pin: '700059' }
  ];

  for (const lm of LOCAL_LANDMARK_MAP) {
    if (lm.keywords.some(kw => lower.includes(kw))) {
      return {
        lat: lm.lat,
        lng: lm.lng,
        formattedAddress: `${rawQuery}, ${lm.area}, Kolkata ${lm.pin}`,
        postalCode: lm.pin,
        locality: 'Kolkata'
      };
    }
  }

  // Check known keywords in generic pincode table
  for (const [pin, info] of Object.entries(LOCAL_PINCODE_DISTANCES)) {
    const areaLower = info.area.toLowerCase();
    if (areaLower.split(/[\/\s]+/).some(word => word.length > 3 && lower.includes(word))) {
      return {
        lat: info.lat,
        lng: info.lng,
        formattedAddress: `${rawQuery}, ${info.area}, Kolkata ${pin}`,
        postalCode: pin,
        locality: 'Kolkata'
      };
    }
  }

  // 3. Try OpenStreetMap Nominatim fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const searchParam = encodeURIComponent(
      lower.includes('kolkata') ? rawQuery : `${rawQuery}, Kolkata, India`
    );
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${searchParam}&countrycodes=in&limit=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const results = await res.json();
      if (results && results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          formattedAddress: results[0].display_name,
          postalCode: detectedPin || undefined,
          locality: 'Kolkata'
        };
      }
    }
  } catch {
    // Continue to default
  }

  // 4. Default to Salt Lake Sector V Bottling Plant area if related to Kolkata
  return {
    lat: DEFAULT_FACTORY_CONFIG.latitude,
    lng: DEFAULT_FACTORY_CONFIG.longitude,
    formattedAddress: `${rawQuery}, Sector V, Salt Lake, Kolkata 700091`,
    postalCode: '700091',
    locality: 'Kolkata'
  };
}

/**
 * Creates a direct Google Maps pin link for customer address.
 * If coordinates are known, links to exact GPS pin; otherwise falls back to address query pin.
 */
export function createCustomerAddressMapUrl(
  address: string,
  coords?: { lat: number; lng: number }
): string {
  if (coords && coords.lat && coords.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/**
 * Helper to share a formatted WhatsApp message to a driver
 */
export function openDriverWhatsAppChat(driverPhone: string, message: string): void {
  const cleanPhone = driverPhone.replace(/\D/g, '');
  const target = cleanPhone.startsWith('91') && cleanPhone.length === 12
    ? cleanPhone
    : cleanPhone.length === 10
    ? `91${cleanPhone}`
    : cleanPhone;

  const url = `https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
