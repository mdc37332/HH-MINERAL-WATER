import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Building,
  Phone,
  Clock,
  ExternalLink,
  ShieldCheck,
  Locate,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  getGoogleMapsLoader,
  getGoogleMapsNavigationUrl,
  getGoogleMapsLocationUrl,
  reverseGeocodeCoords,
  SOLUTION_ATTRIBUTION_ID
} from '../lib/googleMaps';
import { DEFAULT_FACTORY_CONFIG, calculateHaversineDistanceKm } from '../lib/factoryLocation';
import { OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';
import { useStore } from '../context/StoreContext';

interface FactoryGoogleMapProps {
  className?: string;
  height?: string;
}

export const FactoryGoogleMap: React.FC<FactoryGoogleMapProps> = ({
  className = '',
  height = '420px'
}) => {
  const { adminSettings } = useStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [deliveryCircle, setDeliveryCircle] = useState<google.maps.Circle | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [userLocationName, setUserLocationName] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'success' | 'out_of_radius' | 'error'>('idle');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const factoryLat = adminSettings?.factoryLatitude || DEFAULT_FACTORY_CONFIG.latitude;
  const factoryLng = adminSettings?.factoryLongitude || DEFAULT_FACTORY_CONFIG.longitude;
  const factoryAddress = adminSettings?.factoryAddress || DEFAULT_FACTORY_CONFIG.address;
  const factoryName = adminSettings?.factoryLocationName || DEFAULT_FACTORY_CONFIG.name;
  const maxRadiusKm = adminSettings?.maxDeliveryRadiusKm || 7.0;

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    getGoogleMapsLoader()
      .then(maps => {
        if (isCancelled || !mapContainerRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: factoryLat, lng: factoryLng },
          zoom: 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          ...({ internalUsageAttributionIds: [SOLUTION_ATTRIBUTION_ID] } as any)
        };

        const map = new maps.Map(mapContainerRef.current, mapOptions);
        setMapInstance(map);

        // Factory Bottling Plant Custom Marker
        const factoryMarker = new maps.Marker({
          position: { lat: factoryLat, lng: factoryLng },
          map,
          title: factoryName,
          animation: maps.Animation.DROP,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#C5A059',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 2,
            anchor: new maps.Point(12, 22)
          }
        });

        // Live Delivery Radius Zone Circle (7 Km)
        const circle = new maps.Circle({
          strokeColor: '#C5A059',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#C5A059',
          fillOpacity: 0.12,
          map,
          center: { lat: factoryLat, lng: factoryLng },
          radius: maxRadiusKm * 1000 // 7000 meters
        });
        setDeliveryCircle(circle);

        // Rich InfoWindow for Bottling Plant
        const infoWindow = new maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 6px; max-width: 240px; color: #111;">
              <div style="font-weight: 800; font-size: 13px; color: #9A7B38; margin-bottom: 3px;">
                🏭 ${factoryName}
              </div>
              <div style="font-size: 11px; color: #444; line-height: 1.4; margin-bottom: 6px;">
                ${factoryAddress}
              </div>
              <div style="font-size: 10px; background: #f4ede0; color: #7c5e20; padding: 3px 6px; border-radius: 4px; font-weight: 600; display: inline-block; margin-bottom: 6px;">
                ✓ IS 14543 Certified & ${maxRadiusKm} Km Delivery Radius
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #15803d; margin-bottom: 8px;">
                📞 Dispatch: +91 ${OWNER_WHATSAPP_NUMBER}
              </div>
              <a href="${getGoogleMapsNavigationUrl(factoryLat, factoryLng)}" target="_blank" rel="noopener noreferrer" style="display: block; background: #C5A059; color: #000; text-align: center; text-decoration: none; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 6px;">
                Get Directions on Google Maps ↗
              </a>
            </div>
          `
        });

        factoryMarker.addListener('click', () => {
          infoWindow.open(map, factoryMarker);
        });

        setIsLoading(false);
      })
      .catch(err => {
        console.warn('Google Maps error in FactoryGoogleMap:', err);
        setMapError('Google Maps could not be loaded.');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [factoryLat, factoryLng, maxRadiusKm, factoryAddress, factoryName]);

  // Toggle map type
  const handleToggleMapType = (type: 'roadmap' | 'satellite') => {
    setMapType(type);
    if (mapInstance) {
      mapInstance.setMapTypeId(type);
    }
  };

  // Recenter on Factory
  const handleRecenterFactory = () => {
    if (mapInstance) {
      mapInstance.setCenter({ lat: factoryLat, lng: factoryLng });
      mapInstance.setZoom(14);
    }
  };

  // Check user GPS distance to bottling plant with resilient two-step fallback
  const handleLocateCoordinates = async (uLat: number, uLng: number, label?: string) => {
    const dist = calculateHaversineDistanceKm(
      factoryLat,
      factoryLng,
      uLat,
      uLng
    );
    setDistanceKm(dist);

    if (dist <= maxRadiusKm) {
      setLocationStatus('success');
    } else {
      setLocationStatus('out_of_radius');
    }

    if (label) {
      setUserLocationName(label);
    } else {
      try {
        const geo = await reverseGeocodeCoords(uLat, uLng);
        setUserLocationName(geo.formattedAddress);
      } catch {
        setUserLocationName(`GPS: ${uLat.toFixed(4)}, ${uLng.toFixed(4)}`);
      }
    }

    if (mapInstance) {
      getGoogleMapsLoader().then(maps => {
        if (userMarker) {
          userMarker.setMap(null);
        }

        const newUserMarker = new maps.Marker({
          position: { lat: uLat, lng: uLng },
          map: mapInstance,
          title: label || 'Selected Location',
          animation: maps.Animation.DROP,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });
        setUserMarker(newUserMarker);

        // Fit bounds to show both factory and user
        const bounds = new maps.LatLngBounds();
        bounds.extend({ lat: factoryLat, lng: factoryLng });
        bounds.extend({ lat: uLat, lng: uLng });
        mapInstance.fitBounds(bounds, 60);
      });
    }

    setIsLocating(false);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    setIsLocating(true);
    setLocationStatus('idle');

    navigator.geolocation.getCurrentPosition(
      pos => {
        handleLocateCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Fallback: standard accuracy with longer timeout
        navigator.geolocation.getCurrentPosition(
          fallbackPos => {
            handleLocateCoordinates(fallbackPos.coords.latitude, fallbackPos.coords.longitude);
          },
          err => {
            console.warn('Geolocation notice in FactoryGoogleMap:', err);
            setIsLocating(false);
            setLocationStatus('error');
          },
          { enableHighAccuracy: false, timeout: 14000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  };

  return (
    <div className={`rounded-3xl overflow-hidden border border-[#2a2a2a] bg-[#121212] shadow-2xl relative ${className}`}>
      {/* Map Header Controls */}
      <div className="bg-[#181818] border-b border-[#262626] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#24211a] border border-[#C5A059]/40 flex items-center justify-center text-[#DFC283]">
            <Building className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              HH Bottling Plant & {maxRadiusKm} Km Delivery Radius
            </span>
            <span className="text-[10px] text-neutral-400 block">
              {factoryAddress.split(',').slice(0, 3).join(',')} • Google Maps Verified
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <div className="bg-[#121212] p-0.5 rounded-lg border border-[#2e2e2e] flex items-center">
            <button
              type="button"
              onClick={() => handleToggleMapType('roadmap')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                mapType === 'roadmap'
                  ? 'bg-[#C5A059] text-black shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => handleToggleMapType('satellite')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                mapType === 'satellite'
                  ? 'bg-[#C5A059] text-black shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          <button
            type="button"
            onClick={handleRecenterFactory}
            className="px-2.5 py-1.5 rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#333333] text-neutral-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="Recenter Map on Factory"
          >
            <Compass className="w-3.5 h-3.5 text-[#DFC283]" />
            <span className="hidden sm:inline">Center Plant</span>
          </button>

          <button
            type="button"
            onClick={handleLocateUser}
            disabled={isLocating}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
            title="Check distance from your location to factory"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Locate className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isLocating ? 'Locating...' : 'Check My Distance'}</span>
          </button>
        </div>
      </div>

      {/* Map Display Container */}
      <div className="relative w-full" style={{ height }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {isLoading && (
          <div className="absolute inset-0 bg-[#121212]/90 flex flex-col items-center justify-center gap-3 text-neutral-300 z-10">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
            <span className="text-xs font-semibold">Loading Google Maps Platform...</span>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 bg-[#121212]/95 flex flex-col items-center justify-center p-6 text-center gap-3 z-10">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <div className="text-sm font-bold text-white">Google Maps Notice</div>
            <p className="text-xs text-neutral-400 max-w-sm">
              {mapError} You can open the factory location directly in Google Maps:
            </p>
            <a
              href={getGoogleMapsLocationUrl(factoryLat, factoryLng)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#C5A059] hover:bg-[#DFC283] text-black text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Google Maps App</span>
            </a>
          </div>
        )}

        {/* Legend Badge Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-black/85 backdrop-blur-md rounded-xl p-2.5 border border-[#333333] shadow-lg text-[11px] space-y-1.5 pointer-events-none max-w-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#C5A059] inline-block ring-2 ring-white/80" />
            <span className="text-white font-bold">HH Bottling Plant (Origin)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[#C5A059] bg-[#C5A059]/30 inline-block" />
            <span className="text-neutral-300">{maxRadiusKm} Km Delivery Zone (Golden Ring)</span>
          </div>
          {userMarker && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block ring-2 ring-white/80" />
              <span className="text-blue-300 font-bold">Your Detected Location</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Location Distance Feedback Banner */}
      {locationStatus !== 'idle' && (
        <div className="bg-[#161616] border-t border-[#262626] p-4 text-xs">
          {locationStatus === 'success' && distanceKm !== null && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>You are {distanceKm.toFixed(2)} Km from HH Bottling Plant</span>
                    <span className="bg-emerald-950 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-800/50">
                      ✓ Inside {maxRadiusKm} Km Doorstep Delivery Zone
                    </span>
                  </div>
                  {userLocationName && (
                    <p className="text-neutral-400 text-[11px] mt-0.5 truncate max-w-md">
                      {userLocationName}
                    </p>
                  )}
                </div>
              </div>

              <a
                href={getGoogleMapsNavigationUrl(factoryLat, factoryLng)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Route in Google Maps</span>
              </a>
            </div>
          )}

          {locationStatus === 'out_of_radius' && distanceKm !== null && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>You are {distanceKm.toFixed(2)} Km from HH Bottling Plant</span>
                    <span className="bg-amber-950 text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-800/50">
                      Outside {maxRadiusKm} Km Home Delivery
                    </span>
                  </div>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Free Self Pickup at Factory is available anytime! For bulk/corporate dispatch beyond {maxRadiusKm} Km, contact owner.
                  </p>
                </div>
              </div>

              <a
                href={getGoogleMapsNavigationUrl(factoryLat, factoryLng)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#202020] hover:bg-[#282828] border border-[#383838] text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-[#DFC283]" />
                <span>Navigate to Factory</span>
              </a>
            </div>
          )}

          {locationStatus === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Device GPS not detected or permission denied. You can test distance with a local hub:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleLocateCoordinates(22.5726, 88.4331, 'Salt Lake Sector V (0.5 km)')}
                  className="px-2.5 py-1 rounded-lg bg-[#222530] hover:bg-[#2c3040] border border-[#3e4458] text-[11px] text-white cursor-pointer transition-colors"
                >
                  📍 Test Sector V (0.5 km)
                </button>
                <button
                  type="button"
                  onClick={() => handleLocateCoordinates(22.5855, 88.4182, 'Karunamoyee Sector II (2.6 km)')}
                  className="px-2.5 py-1 rounded-lg bg-[#222530] hover:bg-[#2c3040] border border-[#3e4458] text-[11px] text-white cursor-pointer transition-colors"
                >
                  📍 Test Karunamoyee (2.6 km)
                </button>
                <button
                  type="button"
                  onClick={() => handleLocateCoordinates(22.5824, 88.4597, 'New Town Action Area 1 (2.8 km)')}
                  className="px-2.5 py-1 rounded-lg bg-[#222530] hover:bg-[#2c3040] border border-[#3e4458] text-[11px] text-white cursor-pointer transition-colors"
                >
                  📍 Test New Town (2.8 km)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation Link */}
      <div className="bg-[#141414] border-t border-[#222222] px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#DFC283]" />
          <span>{factoryAddress}</span>
        </div>
        <a
          href={getGoogleMapsNavigationUrl(factoryLat, factoryLng)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#DFC283] hover:text-white font-bold flex items-center gap-1 transition-colors"
        >
          <span>Open Turn-by-Turn in Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
