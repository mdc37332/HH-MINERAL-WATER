import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Search,
  Compass,
  AlertCircle,
  Building,
  Crosshair,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import {
  getGoogleMapsLoader,
  reverseGeocodeCoords,
  geocodeAddressText,
  getGoogleMapsNavigationUrl,
  SOLUTION_ATTRIBUTION_ID
} from '../lib/googleMaps';
import { DEFAULT_FACTORY_CONFIG, calculateHaversineDistanceKm } from '../lib/factoryLocation';

interface LocationPickerProps {
  initialCoords?: { lat: number; lng: number } | null;
  gateNote?: string;
  addressTextToPin?: string;
  customTitle?: string;
  subTitle?: string;
  showPinAddressButton?: boolean;
  onLocationChange: (data: {
    lat: number;
    lng: number;
    accuracy?: number;
    addressText?: string;
    navigationUrl: string;
    distanceKm?: number;
  }) => void;
  onGateNoteChange?: (note: string) => void;
  onAddressAutofill?: (details: {
    address: string;
    city: string;
    pincode: string;
    landmark?: string;
  }) => void;
  factoryCoords?: { lat: number; lng: number };
}

const LOCAL_PRESETS = [
  { label: 'Sector V (700091)', lat: 22.5726, lng: 88.4331, area: 'Salt Lake Sector V Hub' },
  { label: 'Karunamoyee (700106)', lat: 22.5855, lng: 88.4182, area: 'Salt Lake Sector II' },
  { label: 'New Town AA-1 (700156)', lat: 22.5824, lng: 88.4597, area: 'New Town Action Area I' },
  { label: 'City Centre 1 (700064)', lat: 22.5938, lng: 88.4089, area: 'Salt Lake Sector I' },
  { label: 'Kestopur (700097)', lat: 22.6047, lng: 88.4308, area: 'Kestopur VIP Road' },
  { label: 'Phoolbagan (700054)', lat: 22.5786, lng: 88.3942, area: 'Phoolbagan Kankurgachi' }
];

export const LocationPickerMap: React.FC<LocationPickerProps> = ({
  initialCoords,
  gateNote = '',
  addressTextToPin = '',
  customTitle,
  subTitle,
  showPinAddressButton = true,
  onLocationChange,
  onGateNoteChange,
  onAddressAutofill,
  factoryCoords = {
    lat: DEFAULT_FACTORY_CONFIG.latitude,
    lng: DEFAULT_FACTORY_CONFIG.longitude
  }
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markerInstance, setMarkerInstance] = useState<google.maps.Marker | null>(null);
  const [infoWindowInstance, setInfoWindowInstance] = useState<google.maps.InfoWindow | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isPinningAddress, setIsPinningAddress] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [internalGateNote, setInternalGateNote] = useState<string>(gateNote);
  const [userNotice, setUserNotice] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);

  // Default center: Salt Lake Kolkata plant or user's initial coords
  const defaultCenter = currentCoords || {
    lat: factoryCoords.lat,
    lng: factoryCoords.lng
  };

  // Trigger geocode and notify parent
  const handleCoordsSelected = useCallback(
    async (lat: number, lng: number, acc?: number) => {
      setCurrentCoords({ lat, lng });
      if (acc !== undefined) setAccuracy(acc);

      const dist = calculateHaversineDistanceKm(
        factoryCoords.lat,
        factoryCoords.lng,
        lat,
        lng
      );

      const navUrl = getGoogleMapsNavigationUrl(lat, lng);

      setIsGeocoding(true);
      try {
        const geoResult = await reverseGeocodeCoords(lat, lng);
        setResolvedAddress(geoResult.formattedAddress);

        onLocationChange({
          lat,
          lng,
          accuracy: acc,
          addressText: geoResult.formattedAddress,
          navigationUrl: navUrl,
          distanceKm: dist
        });

        if (onAddressAutofill && geoResult.formattedAddress) {
          const streetPart = [geoResult.streetNumber, geoResult.route]
            .filter(Boolean)
            .join(' ');
          const fullAddress = streetPart
            ? `${streetPart}, ${geoResult.sublocality || ''}`.trim().replace(/^,\s*/, '')
            : geoResult.formattedAddress.split(',').slice(0, 2).join(',').trim();

          onAddressAutofill({
            address: fullAddress || geoResult.formattedAddress,
            city: geoResult.locality || 'Kolkata',
            pincode: geoResult.postalCode || '',
            landmark: geoResult.sublocality || ''
          });
        }
      } catch (err) {
        console.warn('Geocode notice:', err);
        onLocationChange({
          lat,
          lng,
          accuracy: acc,
          addressText: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          navigationUrl: navUrl,
          distanceKm: dist
        });
      } finally {
        setIsGeocoding(false);
      }
    },
    [factoryCoords.lat, factoryCoords.lng, onLocationChange, onAddressAutofill]
  );

  // Forward geocode and move marker
  const handlePinAddress = async (overrideAddress?: string) => {
    const textToFind = (overrideAddress || addressTextToPin || searchInputRef.current?.value || '').trim();
    if (!textToFind) {
      setUserNotice({
        type: 'info',
        text: 'Please enter a street, building, or society name above, or choose a quick area preset below.'
      });
      return;
    }

    setIsPinningAddress(true);
    setUserNotice(null);
    try {
      const result = await geocodeAddressText(textToFind);
      if (result) {
        const { lat, lng, formattedAddress } = result;
        setCurrentCoords({ lat, lng });
        setResolvedAddress(formattedAddress);

        if (mapInstance && markerInstance) {
          mapInstance.panTo({ lat, lng });
          mapInstance.setZoom(17);
          markerInstance.setPosition({ lat, lng });

          if (infoWindowInstance) {
            infoWindowInstance.setContent(`
              <div style="padding: 6px; font-family: sans-serif; font-size: 12px; color: #1e293b; max-width: 200px;">
                <strong style="color: #0284c7; display: block; margin-bottom: 2px;">📍 Customer Address Pin</strong>
                <span style="font-size: 11px; line-height: 1.3; display: block;">${formattedAddress}</span>
              </div>
            `);
            infoWindowInstance.open(mapInstance, markerInstance);
          }
        }

        handleCoordsSelected(lat, lng);
        setUserNotice({
          type: 'success',
          text: `Map pin placed at "${result.formattedAddress.split(',').slice(0, 2).join(',')}". Drag pin to adjust exact door entrance.`
        });
      } else {
        setUserNotice({
          type: 'error',
          text: `Could not locate "${textToFind}". You can drag the red pin manually or choose a preset.`
        });
      }
    } catch (err) {
      console.warn('Address pin notice:', err);
    } finally {
      setIsPinningAddress(false);
    }
  };

  // Quick Preset Selection
  const handleSelectPreset = (preset: typeof LOCAL_PRESETS[0]) => {
    setCurrentCoords({ lat: preset.lat, lng: preset.lng });
    if (mapInstance && markerInstance) {
      mapInstance.panTo({ lat: preset.lat, lng: preset.lng });
      mapInstance.setZoom(17);
      markerInstance.setPosition({ lat: preset.lat, lng: preset.lng });
    }
    handleCoordsSelected(preset.lat, preset.lng);

    if (onAddressAutofill) {
      const pin = preset.label.match(/\d{6}/)?.[0] || '700091';
      onAddressAutofill({
        address: preset.area,
        city: 'Kolkata',
        pincode: pin,
        landmark: preset.area
      });
    }

    setUserNotice({
      type: 'success',
      text: `Delivery pin moved to ${preset.area} (${preset.label}).`
    });
  };

  // Initialize Google Map
  useEffect(() => {
    let isCancelled = false;

    getGoogleMapsLoader()
      .then(maps => {
        if (isCancelled || !mapContainerRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: defaultCenter,
          zoom: currentCoords ? 16 : 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          ...({ internalUsageAttributionIds: [SOLUTION_ATTRIBUTION_ID] } as any)
        };

        const map = new maps.Map(mapContainerRef.current, mapOptions);
        setMapInstance(map);

        // Marker for customer delivery point
        const marker = new maps.Marker({
          position: defaultCenter,
          map,
          draggable: true,
          title: 'Customer Delivery Address / Pin',
          animation: maps.Animation.DROP
        });
        setMarkerInstance(marker);

        // Info window for pin explanation
        const infoWindow = new maps.InfoWindow({
          content: `
            <div style="padding: 6px; font-family: sans-serif; font-size: 12px; color: #1e293b; max-width: 200px;">
              <strong style="color: #0284c7; display: block; margin-bottom: 2px;">📍 Customer Delivery Pin</strong>
              <span style="font-size: 11px; color: #64748b;">Drag pin to exact door entrance</span>
            </div>
          `
        });
        setInfoWindowInstance(infoWindow);

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Add Plant Factory Marker for visual proximity reference
        new maps.Marker({
          position: { lat: factoryCoords.lat, lng: factoryCoords.lng },
          map,
          title: 'HH Mineral Water Bottling Plant',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#C5A059',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
          }
        });

        // Listen for marker drag end
        marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            handleCoordsSelected(newLat, newLng);
          }
        });

        // Listen for map click to reposition pin
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            marker.setPosition(e.latLng);
            handleCoordsSelected(newLat, newLng);
          }
        });

        // Autocomplete search input integration
        if (searchInputRef.current && maps.places) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            fields: ['geometry', 'formatted_address', 'name', 'address_components'],
            componentRestrictions: { country: 'in' }
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              map.setCenter({ lat, lng });
              map.setZoom(17);
              marker.setPosition({ lat, lng });
              handleCoordsSelected(lat, lng);

              if (place.formatted_address) {
                setResolvedAddress(place.formatted_address);
              }

              if (onAddressAutofill && place.formatted_address) {
                let postalCode = '';
                let locality = 'Kolkata';
                let landmark = place.name || '';

                if (place.address_components) {
                  place.address_components.forEach(comp => {
                    if (comp.types.includes('postal_code')) postalCode = comp.long_name;
                    if (comp.types.includes('locality') || comp.types.includes('sublocality')) {
                      locality = comp.long_name;
                    }
                  });
                }

                onAddressAutofill({
                  address: place.formatted_address.split(',').slice(0, 2).join(',').trim() || place.name || place.formatted_address,
                  city: locality || 'Kolkata',
                  pincode: postalCode || '700091',
                  landmark
                });
              }
            }
          });
        }

        setIsMapReady(true);
      })
      .catch(err => {
        console.warn('Unable to load Google Maps widget:', err);
        setMapError('Google Maps interactive canvas could not connect. Live GPS, Address Search, and Local Hubs remain fully operational.');
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Sync marker position when initialCoords changes externally (e.g. user selects a saved address)
  useEffect(() => {
    if (initialCoords && (initialCoords.lat !== currentCoords?.lat || initialCoords.lng !== currentCoords?.lng)) {
      setCurrentCoords(initialCoords);
      if (markerInstance && mapInstance) {
        markerInstance.setPosition(initialCoords);
        mapInstance.panTo(initialCoords);
        mapInstance.setZoom(17);
      }
    }
  }, [initialCoords?.lat, initialCoords?.lng, markerInstance, mapInstance]);

  // Request browser GPS position with clean, responsive error handling
  const handleDetectLiveLocation = () => {
    if (!navigator.geolocation) {
      setUserNotice({
        type: 'error',
        text: 'Geolocation is not supported by your browser. Please search your address above or select a local hub.'
      });
      return;
    }

    setIsLocating(true);
    setUserNotice(null);

    const onPosSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = pos.coords.accuracy;

      if (mapInstance && markerInstance) {
        mapInstance.panTo({ lat, lng });
        mapInstance.setZoom(17);
        markerInstance.setPosition({ lat, lng });
      }

      handleCoordsSelected(lat, lng, acc);
      setUserNotice({
        type: 'success',
        text: `Device GPS location captured (accuracy ±${Math.round(acc)}m). Drag pin to exact building door.`
      });
    };

    const onPosError = (geoErr: GeolocationPositionError) => {
      setIsLocating(false);
      if (geoErr.code === 1) {
        setUserNotice({
          type: 'info',
          text: 'Location access was not granted. You can type your street/society above, tap "Locate", or select a Salt Lake preset.'
        });
      } else {
        setUserNotice({
          type: 'info',
          text: 'GPS signal unavailable. You can search your address or choose a local hub preset below.'
        });
      }
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      onPosError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000
      }
    );
  };

  const handleGateNoteChange = (text: string) => {
    setInternalGateNote(text);
    if (onGateNoteChange) {
      onGateNoteChange(text);
    }
  };

  const navUrl = currentCoords
    ? getGoogleMapsNavigationUrl(currentCoords.lat, currentCoords.lng)
    : null;

  return (
    <div className="bg-[#121316] border border-[#2b2d35] rounded-2xl p-3.5 sm:p-4 space-y-3 text-white shadow-lg">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600/50 text-emerald-400">
              <MapPin className="w-4 h-4" />
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
              {customTitle || 'Customer Delivery Address Map Pin'}
            </h4>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {subTitle || 'Pin your exact building entrance so our delivery driver navigates directly to your door.'}
          </p>
        </div>

        {/* Dual Actions: Pin Address & Live GPS */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showPinAddressButton && (
            <button
              type="button"
              onClick={() => handlePinAddress()}
              disabled={isPinningAddress}
              title="Locates and drops the pin using your typed delivery address"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e222d] hover:bg-[#282d3c] border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isPinningAddress ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Pin Typed Address</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDetectLiveLocation}
            disabled={isLocating}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-900/30 transition-all cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 text-emerald-100" />
                <span>Use Current GPS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Places Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePinAddress(e.currentTarget.value);
              }
            }}
            placeholder="Search society, building, or street in Salt Lake / Kolkata..."
            className="w-full bg-[#181a20] border border-[#333742] focus:border-[#C5A059] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => handlePinAddress()}
          disabled={isPinningAddress}
          className="px-3 py-2 bg-[#C5A059]/20 hover:bg-[#C5A059]/30 border border-[#C5A059]/50 text-[#DFC283] hover:text-white rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isPinningAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Locate</span>
        </button>
      </div>

      {/* Quick Delivery Area Presets */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#C5A059]" />
          <span>Quick Hubs:</span>
        </span>
        {LOCAL_PRESETS.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className="px-2 py-1 rounded-lg bg-[#181a20] hover:bg-[#222530] border border-[#333742] hover:border-[#C5A059]/60 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Dismissible Notice */}
      {userNotice && (
        <div
          className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 text-xs animate-in fade-in duration-150 ${
            userNotice.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
              : userNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {userNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            ) : userNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
            )}
            <span>{userNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setUserNotice(null)}
            className="text-neutral-400 hover:text-white shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Google Map Container */}
      <div className="relative w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-[#2b2d35] bg-[#1a1c23]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Loading / Error Overlays */}
        {!isMapReady && !mapError && (
          <div className="absolute inset-0 bg-[#121316]/90 flex flex-col items-center justify-center gap-2 text-neutral-300">
            <Loader2 className="w-6 h-6 animate-spin text-[#C5A059]" />
            <span className="text-xs font-medium">Connecting to Google Maps Platform...</span>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 bg-[#121316]/95 flex flex-col items-center justify-center p-4 text-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <span className="text-xs text-neutral-300">{mapError}</span>
            <button
              type="button"
              onClick={handleDetectLiveLocation}
              className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold"
            >
              Capture Browser GPS Coordinates
            </button>
          </div>
        )}

        {/* Floating Instruction Chip on Map */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto bg-black/85 backdrop-blur-md border border-neutral-700/60 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-md pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] text-neutral-200">
            Drag the red pin or click anywhere on the map to place delivery point.
          </span>
        </div>
      </div>

      {/* Location Status & Geocoded Address Preview */}
      {currentCoords && (
        <div className="bg-[#181a20] border border-emerald-900/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Customer Address Pin Placed on Map</span>
            </div>
            {navUrl && (
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Preview in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="text-[11px] text-neutral-300 leading-relaxed font-mono">
            {isGeocoding ? (
              <span className="flex items-center gap-1 text-neutral-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Resolving official street address for pin...
              </span>
            ) : (
              <span>{resolvedAddress || `Lat: ${currentCoords.lat.toFixed(6)}, Lng: ${currentCoords.lng.toFixed(6)}`}</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono">
            <span>Lat: {currentCoords.lat.toFixed(5)}</span>
            <span>Lng: {currentCoords.lng.toFixed(5)}</span>
            {accuracy !== undefined && <span>Accuracy: ±{Math.round(accuracy)}m</span>}
          </div>
        </div>
      )}

      {/* Delivery / Entrance Note for Driver */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Entrance / Delivery Instructions for Driver (Optional)</span>
        </label>
        <input
          type="text"
          value={internalGateNote}
          onChange={e => handleGateNoteChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          placeholder="e.g., Tower B entrance, leave with security guard, 3rd floor lift"
          className="w-full bg-[#181a20] border border-[#333742] focus:border-[#C5A059] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
        />
      </div>
    </div>
  );
};
