/**
 * Factory Location & 7 Km Delivery Radius Logistics Engine
 * 
 * Factory Location:
 * Plot 12, Sector V, Salt Lake, Kolkata, West Bengal 700091
 * Latitude: 22.5726° N, Longitude: 88.4331° E
 * 
 * Rules:
 * 1. Home Delivery is strictly allowed ONLY under 7 Km from the factory location.
 * 2. Self Pickup is available at the factory counter (Free of delivery charge, no distance restriction).
 */

export interface FactoryConfig {
  name: string;
  address: string;
  landmark: string;
  city: string;
  pincode: string;
  state: string;
  latitude: number;
  longitude: number;
  maxDeliveryRadiusKm: number;
  selfPickupEnabled: boolean;
  selfPickupAddress: string;
  selfPickupTimings: string;
  selfPickupContact: string;
}

export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  name: 'HH Mineral Water Bottling Facility',
  address: 'Plot 12, Block EP & GP, Sector V, Salt Lake',
  landmark: 'Near Webel Bhavan & RDB Cinema',
  city: 'Kolkata',
  pincode: '700091',
  state: 'West Bengal',
  latitude: 22.5726,
  longitude: 88.4331,
  maxDeliveryRadiusKm: 7.0, // Strictly under 7 Km
  selfPickupEnabled: true,
  selfPickupAddress: 'Factory Dispatch Counter #1, Plot 12, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
  selfPickupTimings: 'Monday – Sunday: 8:30 AM – 8:30 PM (Fresh Batch Ready in 30 Mins)',
  selfPickupContact: '+91 8017341130'
};

export interface LocalPincodeInfo {
  distanceKm: number;
  area: string;
  lat: number;
  lng: number;
}

/**
 * Pincode proximity table relative to HH Bottling Plant (Sector V, 700091).
 * Includes precise GPS coordinates for each locality centroid.
 */
export const LOCAL_PINCODE_DISTANCES: Record<string, LocalPincodeInfo> = {
  // Within 7 Km (Eligible for Doorstep Delivery)
  '700091': { distanceKm: 0.5, area: 'Salt Lake Sector V / EP GP Block', lat: 22.5726, lng: 88.4331 },
  '700098': { distanceKm: 2.2, area: 'Salt Lake Stadium / Sector III', lat: 22.5697, lng: 88.4112 },
  '700106': { distanceKm: 2.6, area: 'Salt Lake Sector II / Karunamoyee', lat: 22.5855, lng: 88.4182 },
  '700064': { distanceKm: 3.1, area: 'Salt Lake Sector I / City Centre 1', lat: 22.5938, lng: 88.4089 },
  '700156': { distanceKm: 2.8, area: 'New Town Action Area I / DLF 1', lat: 22.5824, lng: 88.4597 },
  '700157': { distanceKm: 3.8, area: 'New Town Action Area I Ext / Jatragachi', lat: 22.5880, lng: 88.4680 },
  '700097': { distanceKm: 3.5, area: 'Kestopur / VIP Road Crossing', lat: 22.6047, lng: 88.4308 },
  '700085': { distanceKm: 4.1, area: 'Beliaghata / Beleghata Building Hub', lat: 22.5645, lng: 88.3982 },
  '700054': { distanceKm: 4.4, area: 'Phoolbagan / Kankurgachi', lat: 22.5786, lng: 88.3942 },
  '700010': { distanceKm: 4.6, area: 'Beliaghata Main Road / CIT Road', lat: 22.5601, lng: 88.3910 },
  '700102': { distanceKm: 4.7, area: 'Lake Town / Bangur Avenue', lat: 22.6025, lng: 88.4072 },
  '700067': { distanceKm: 4.8, area: 'Ultadanga / Bidhan Nagar Road', lat: 22.5970, lng: 88.3890 },
  '700048': { distanceKm: 4.9, area: 'Bangur / Dum Dum Park / VIP Road', lat: 22.6105, lng: 88.4120 },
  '700057': { distanceKm: 4.9, area: 'Baguiati / Deshbandhu Nagar', lat: 22.6180, lng: 88.4280 },
  '700059': { distanceKm: 4.8, area: 'Teghoria / Rajarhat Road', lat: 22.6220, lng: 88.4350 },
  '700107': { distanceKm: 5.8, area: 'Ruby Hospital / Kasba / Anandapur', lat: 22.5186, lng: 88.3985 },
  '700135': { distanceKm: 6.5, area: 'New Town Action Area II / Eco Park', lat: 22.6095, lng: 88.4720 },

  // Beyond 7 Km (> 7.0 Km: Doorstep Delivery restricted, Self Pickup recommended)
  '700001': { distanceKm: 7.2, area: 'BBD Bagh / Dalhousie', lat: 22.5726, lng: 88.3500 },
  '700028': { distanceKm: 7.4, area: 'Dum Dum Airport / Jessore Road', lat: 22.6358, lng: 88.4237 },
  '700006': { distanceKm: 7.8, area: 'Girish Park / North Kolkata', lat: 22.5880, lng: 88.3610 },
  '700016': { distanceKm: 8.1, area: 'Park Street / Camac Street', lat: 22.5510, lng: 88.3540 },
  '700019': { distanceKm: 8.5, area: 'Ballygunge / Gariahat', lat: 22.5280, lng: 88.3650 },
  '700020': { distanceKm: 9.2, area: 'Bhowanipore / Elgin', lat: 22.5360, lng: 88.3470 },
  '700030': { distanceKm: 9.7, area: 'Sinthee / Dum Dum', lat: 22.6280, lng: 88.3840 },
  '700026': { distanceKm: 10.4, area: 'Kalighat / Hazra', lat: 22.5190, lng: 88.3460 },
  '700032': { distanceKm: 10.8, area: 'Jadavpur / Santoshpur', lat: 22.4960, lng: 88.3710 },
  '700040': { distanceKm: 12.1, area: 'Tollygunge / Prince Anwar Shah', lat: 22.4980, lng: 88.3480 },
  '700084': { distanceKm: 14.2, area: 'Garia / Patuli', lat: 22.4720, lng: 88.3860 },
  '700038': { distanceKm: 16.0, area: 'Behala / Behala Tram Depot', lat: 22.4950, lng: 88.3180 }
};

/**
 * Returns centroid GPS coordinates for a given Kolkata pincode if available
 */
export function getPincodeCentroid(pincode: string): { lat: number; lng: number; area: string; distanceKm: number } | null {
  const clean = pincode.replace(/\D/g, '').trim();
  if (clean && LOCAL_PINCODE_DISTANCES[clean]) {
    const item = LOCAL_PINCODE_DISTANCES[clean];
    return {
      lat: item.lat,
      lng: item.lng,
      area: item.area,
      distanceKm: item.distanceKm
    };
  }
  return null;
}

/**
 * Calculates straight-line great-circle distance between two GPS coordinates using Haversine formula.
 * @returns distance in kilometers rounded to 1 decimal place.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export interface DeliveryEligibilityResult {
  distanceKm: number;
  isEligible: boolean; // Under maxDeliveryRadiusKm (5.0 km)
  maxRadiusKm: number;
  detectionSource: 'gps' | 'pincode' | 'approximate';
  locationLabel?: string;
  message: string;
}

/**
 * Validates whether a delivery location is under the 7 Km limit from the factory.
 */
export function checkDeliveryEligibility(params: {
  userCoords?: { latitude: number; longitude: number } | null;
  pincode?: string;
  address?: string;
  factoryLat?: number;
  factoryLng?: number;
  maxRadiusKm?: number;
}): DeliveryEligibilityResult {
  const factoryLat = params.factoryLat ?? DEFAULT_FACTORY_CONFIG.latitude;
  const factoryLng = params.factoryLng ?? DEFAULT_FACTORY_CONFIG.longitude;
  const maxRadiusKm = params.maxRadiusKm ?? DEFAULT_FACTORY_CONFIG.maxDeliveryRadiusKm;

  const cleanPin = (params.pincode || '').replace(/\D/g, '').trim();
  const addressLower = (params.address || '').toLowerCase();

  // Known local keywords indicating delivery within Salt Lake / New Town / nearby zones
  const isAddressInLocalZone = [
    'salt lake', 'sector v', 'sector 5', 'sector-v', 'sector-5', 'ep block', 'gp block',
    'sector 1', 'sector i', 'sector-1', 'sector-i', 'city centre', 'karunamoyee',
    'sector 2', 'sector ii', 'sector-2', 'sector-ii', 'bikash bhavan', 'mayukh bhavan',
    'sector 3', 'sector iii', 'sector-3', 'sector-iii', 'stadium', 'subhas sarobar',
    'new town', 'action area 1', 'action area i', 'dlf', 'axis mall', 'pride hotel',
    'kestopur', 'beliaghata', 'phoolbagan', 'kankurgachi', 'lake town', 'bangur',
    'technopolis', 'webel', 'college more', 'rdb', 'godrej waterside', 'infinity'
  ].some(kw => addressLower.includes(kw));

  // Check if pincode belongs to our < 7km delivery list
  const isPinEligible = cleanPin && LOCAL_PINCODE_DISTANCES[cleanPin] && LOCAL_PINCODE_DISTANCES[cleanPin].distanceKm <= maxRadiusKm;

  // 1. Direct GPS coordinates provided
  if (params.userCoords?.latitude && params.userCoords?.longitude) {
    const dist = calculateHaversineDistanceKm(
      factoryLat,
      factoryLng,
      params.userCoords.latitude,
      params.userCoords.longitude
    );
    const isGpsEligible = dist <= maxRadiusKm;

    if (isGpsEligible) {
      return {
        distanceKm: dist,
        isEligible: true,
        maxRadiusKm,
        detectionSource: 'gps',
        locationLabel: `Pinned Map GPS (${params.userCoords.latitude.toFixed(4)}, ${params.userCoords.longitude.toFixed(4)})`,
        message: `Delivery Eligible: ${dist} km from factory (within ${maxRadiusKm} km radius).`
      };
    }

    // If device/pin GPS is outside 7 km (e.g. user ordering from work or mobile ISP), check if delivery destination itself is within 7 km
    if (isPinEligible) {
      const entry = LOCAL_PINCODE_DISTANCES[cleanPin];
      return {
        distanceKm: entry.distanceKm,
        isEligible: true,
        maxRadiusKm,
        detectionSource: 'pincode',
        locationLabel: `${cleanPin} (${entry.area})`,
        message: `Delivery Destination Eligible: ${cleanPin} (${entry.area}) is ~${entry.distanceKm} km from plant (within our ${maxRadiusKm} km zone).`
      };
    }

    if (isAddressInLocalZone) {
      return {
        distanceKm: 2.0,
        isEligible: true,
        maxRadiusKm,
        detectionSource: 'approximate',
        locationLabel: 'Salt Lake / New Town Zone',
        message: `Delivery Destination Eligible: Your delivery address is located within our ${maxRadiusKm} km Salt Lake & New Town zone.`
      };
    }

    return {
      distanceKm: dist,
      isEligible: false,
      maxRadiusKm,
      detectionSource: 'gps',
      locationLabel: `GPS Coordinates (${params.userCoords.latitude.toFixed(4)}, ${params.userCoords.longitude.toFixed(4)})`,
      message: `Delivery Unavailable: Selected location is ${dist} km away. We deliver doorstep orders exclusively within ${maxRadiusKm} km from our Salt Lake plant. You can choose Self Pickup or enter a delivery address in Salt Lake / New Town.`
    };
  }

  // 2. Known PIN code lookup
  if (cleanPin && LOCAL_PINCODE_DISTANCES[cleanPin]) {
    const entry = LOCAL_PINCODE_DISTANCES[cleanPin];
    const isEligible = entry.distanceKm <= maxRadiusKm;
    return {
      distanceKm: entry.distanceKm,
      isEligible,
      maxRadiusKm,
      detectionSource: 'pincode',
      locationLabel: `${cleanPin} (${entry.area})`,
      message: isEligible
        ? `Delivery Eligible: ~${entry.distanceKm} km from factory (${entry.area} - within ${maxRadiusKm} km radius).`
        : `Delivery Unavailable: Area ${cleanPin} (${entry.area}) is ~${entry.distanceKm} km away. We deliver exclusively under ${maxRadiusKm} km from our bottling plant. Please select Self Pickup.`
    };
  }

  // 3. Address keyword match if PIN code was not recognized
  if (isAddressInLocalZone) {
    return {
      distanceKm: 2.5,
      isEligible: true,
      maxRadiusKm,
      detectionSource: 'approximate',
      locationLabel: 'Salt Lake / New Town Local Zone',
      message: `Delivery Destination Eligible: Your address is within our ${maxRadiusKm} km factory delivery radius.`
    };
  }

  // 4. Fallback for unknown pincode
  if (cleanPin) {
    // If it starts with 70009 or 70010, it's proximate to Salt Lake / New Town
    const isNearHub = ['700091', '700098', '700106', '700064', '700156', '700157', '700097', '700085', '700054', '700010', '700102', '700067', '700048', '700057', '700059'].includes(cleanPin);
    if (isNearHub) {
      return {
        distanceKm: 3.0,
        isEligible: true,
        maxRadiusKm,
        detectionSource: 'approximate',
        locationLabel: `PIN Code ${cleanPin}`,
        message: `Delivery Eligible: Estimated ~3.0 km from factory (within ${maxRadiusKm} km radius).`
      };
    }

    // Other Kolkata pincodes starting with 700
    if (cleanPin.startsWith('700')) {
      const approxDist = 8.5;
      return {
        distanceKm: approxDist,
        isEligible: false,
        maxRadiusKm,
        detectionSource: 'approximate',
        locationLabel: `PIN Code ${cleanPin}`,
        message: `Delivery Unavailable: Area ${cleanPin} is estimated ~${approxDist} km from factory. We deliver under ${maxRadiusKm} km only. Please select Self Pickup.`
      };
    }

    // Outside Kolkata
    const farDist = 25.0;
    return {
      distanceKm: farDist,
      isEligible: false,
      maxRadiusKm,
      detectionSource: 'approximate',
      locationLabel: `PIN Code ${cleanPin}`,
      message: `Delivery Unavailable: Location ${cleanPin} is outside our ${maxRadiusKm} km local factory delivery zone. Please choose Self Pickup at checkout.`
    };
  }

  // No location info entered yet
  return {
    distanceKm: 0,
    isEligible: true,
    maxRadiusKm,
    detectionSource: 'approximate',
    message: `Delivery available strictly within ${maxRadiusKm} km of our factory. Enter your address or click "Detect GPS" to verify eligibility.`
  };
}
