import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Building,
  Search,
  Locate,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Truck
} from 'lucide-react';
import {
  getGoogleMapsLoader,
  geocodeAddressText,
  reverseGeocodeCoords,
  getGoogleMapsNavigationUrl,
  SOLUTION_ATTRIBUTION_ID
} from '../../lib/googleMaps';

interface AdminFactoryLocationEditorProps {
  factoryLatitude: number;
  factoryLongitude: number;
  factoryAddress: string;
  factoryLocationName?: string;
  maxDeliveryRadiusKm: number;
  onChange: (updates: {
    factoryLatitude: number;
    factoryLongitude: number;
    factoryAddress: string;
    maxDeliveryRadiusKm: number;
    selfPickupAddress?: string;
  }) => void;
}

export const AdminFactoryLocationEditor: React.FC<AdminFactoryLocationEditorProps> = ({
  factoryLatitude,
  factoryLongitude,
  factoryAddress,
  factoryLocationName = 'HH Mineral Water Bottling Facility',
  maxDeliveryRadiusKm,
  onChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markerInstance, setMarkerInstance] = useState<google.maps.Marker | null>(null);
  const [circleInstance, setCircleInstance] = useState<google.maps.Circle | null>(null);
  const [infoWindowInstance, setInfoWindowInstance] = useState<google.maps.InfoWindow | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(factoryLatitude || 22.5726);
  const [currentLng, setCurrentLng] = useState<number>(factoryLongitude || 88.4331);
  const [currentRadius, setCurrentRadius] = useState<number>(maxDeliveryRadiusKm || 7.0);
  const [currentAddress, setCurrentAddress] = useState<string>(
    factoryAddress || 'Plot 12, Block EP & GP, Sector V, Salt Lake, Kolkata, West Bengal - 700091'
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Sync internal state if props change from outside
  useEffect(() => {
    if (factoryLatitude && factoryLatitude !== currentLat) setCurrentLat(factoryLatitude);
    if (factoryLongitude && factoryLongitude !== currentLng) setCurrentLng(factoryLongitude);
    if (factoryAddress && factoryAddress !== currentAddress) setCurrentAddress(factoryAddress);
    if (maxDeliveryRadiusKm && maxDeliveryRadiusKm !== currentRadius) setCurrentRadius(maxDeliveryRadiusKm);
  }, [factoryLatitude, factoryLongitude, factoryAddress, maxDeliveryRadiusKm]);

  // Handle position change and reverse geocode
  const handlePositionChanged = useCallback(
    async (lat: number, lng: number, skipReverseGeocode = false) => {
      setCurrentLat(lat);
      setCurrentLng(lng);

      if (mapInstance) {
        mapInstance.panTo({ lat, lng });
      }
      if (markerInstance) {
        markerInstance.setPosition({ lat, lng });
      }
      if (circleInstance) {
        circleInstance.setCenter({ lat, lng });
      }

      if (skipReverseGeocode) {
        onChange({
          factoryLatitude: lat,
          factoryLongitude: lng,
          factoryAddress: currentAddress,
          maxDeliveryRadiusKm: currentRadius
        });
        return;
      }

      setIsGeocoding(true);
      try {
        const geo = await reverseGeocodeCoords(lat, lng);
        if (geo?.formattedAddress) {
          const newAddr = geo.formattedAddress;
          setCurrentAddress(newAddr);
          onChange({
            factoryLatitude: lat,
            factoryLongitude: lng,
            factoryAddress: newAddr,
            maxDeliveryRadiusKm: currentRadius,
            selfPickupAddress: `Factory Dispatch Counter #1, ${newAddr}`
          });
          setStatusMessage({
            type: 'success',
            text: `Factory address updated to: ${newAddr.split(',').slice(0, 3).join(',')}`
          });
        }
      } catch (err) {
        console.warn('Reverse geocode error:', err);
        onChange({
          factoryLatitude: lat,
          factoryLongitude: lng,
          factoryAddress: currentAddress,
          maxDeliveryRadiusKm: currentRadius
        });
      } finally {
        setIsGeocoding(false);
      }
    },
    [mapInstance, markerInstance, circleInstance, currentAddress, currentRadius, onChange]
  );

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    getGoogleMapsLoader()
      .then(maps => {
        if (isCancelled || !mapContainerRef.current) return;

        const initialCenter = { lat: currentLat, lng: currentLng };

        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          ...({ internalUsageAttributionIds: [SOLUTION_ATTRIBUTION_ID] } as any)
        });

        // Draggable Factory Marker with Gold Industrial Badge
        const marker = new maps.Marker({
          position: initialCenter,
          map,
          draggable: true,
          title: 'HH Mineral Water Bottling Facility (Drag to reposition)',
          animation: maps.Animation.DROP,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#C5A059',
            fillOpacity: 1,
            strokeWeight: 2.5,
            strokeColor: '#000000',
            scale: 2.4,
            anchor: new maps.Point(12, 22)
          }
        });

        // Live Delivery Radius Circle
        const circle = new maps.Circle({
          strokeColor: '#C5A059',
          strokeOpacity: 0.9,
          strokeWeight: 2.5,
          fillColor: '#C5A059',
          fillOpacity: 0.15,
          map,
          center: initialCenter,
          radius: currentRadius * 1000
        });

        const infoWindow = new maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 8px; max-width: 260px; color: #111;">
              <strong style="color: #9A7B38; font-size: 13px; display: block; margin-bottom: 4px;">
                🏭 ${factoryLocationName}
              </strong>
              <div style="font-size: 11px; color: #444; line-height: 1.4; margin-bottom: 6px;">
                ${currentAddress}
              </div>
              <div style="background: #fdf6e7; border: 1px solid #d4af37; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #855d14; margin-bottom: 6px;">
                ⭐ Delivery Radius: ${currentRadius} Km
              </div>
              <span style="font-size: 10px; color: #666; font-style: italic;">
                💡 Drag this pin or click anywhere on the map to relocate factory.
              </span>
            </div>
          `
        });

        infoWindow.open(map, marker);

        // Marker Drag End Listener
        marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = Number(e.latLng.lat().toFixed(6));
            const lng = Number(e.latLng.lng().toFixed(6));
            handlePositionChanged(lat, lng);
          }
        });

        // Click anywhere on map to reposition marker
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = Number(e.latLng.lat().toFixed(6));
            const lng = Number(e.latLng.lng().toFixed(6));
            handlePositionChanged(lat, lng);
          }
        });

        setMapInstance(map);
        setMarkerInstance(marker);
        setCircleInstance(circle);
        setInfoWindowInstance(infoWindow);
      })
      .catch(err => {
        console.error('Error loading Google Maps for Admin Factory Editor:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update circle radius when currentRadius changes
  useEffect(() => {
    if (circleInstance) {
      circleInstance.setRadius(currentRadius * 1000);
    }
  }, [currentRadius, circleInstance]);

  // Handle radius changes from slider or presets
  const handleRadiusChange = (newRadius: number) => {
    const val = Math.max(1, Math.min(50, Math.round(newRadius * 10) / 10));
    setCurrentRadius(val);
    if (circleInstance) {
      circleInstance.setRadius(val * 1000);
    }
    onChange({
      factoryLatitude: currentLat,
      factoryLongitude: currentLng,
      factoryAddress: currentAddress,
      maxDeliveryRadiusKm: val
    });
    setStatusMessage({
      type: 'info',
      text: `Delivery radius updated to ${val} Km. Golden delivery zone ring resized.`
    });
  };

  // Search Address / Landmark
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setStatusMessage(null);
    try {
      const result = await geocodeAddressText(query);
      if (result) {
        const { lat, lng, formattedAddress } = result;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setCurrentAddress(formattedAddress);

        if (mapInstance) {
          mapInstance.panTo({ lat, lng });
          mapInstance.setZoom(16);
        }
        if (markerInstance) {
          markerInstance.setPosition({ lat, lng });
        }
        if (circleInstance) {
          circleInstance.setCenter({ lat, lng });
        }

        onChange({
          factoryLatitude: lat,
          factoryLongitude: lng,
          factoryAddress: formattedAddress,
          maxDeliveryRadiusKm: currentRadius,
          selfPickupAddress: `Factory Dispatch Counter #1, ${formattedAddress}`
        });

        setStatusMessage({
          type: 'success',
          text: `Factory relocated to "${formattedAddress.split(',').slice(0, 3).join(',')}"`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Location "${query}" could not be found. Try searching with city e.g. "Salt Lake Sector V, Kolkata".`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Geocoding failed. Please check address spelling.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Detect GPS Location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setStatusMessage({
        type: 'error',
        text: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    setIsLocating(true);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        handlePositionChanged(lat, lng);
        if (mapInstance) {
          mapInstance.setZoom(16);
        }
      },
      err => {
        setIsLocating(false);
        setStatusMessage({
          type: 'error',
          text: `GPS detection failed: ${err.message}. You can drag the pin on the map instead.`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick Presets
  const quickPresets = [
    { name: 'Salt Lake Sector V', lat: 22.5726, lng: 88.4331, addr: 'Plot 12, Block EP & GP, Sector V, Salt Lake, Kolkata, West Bengal - 700091' },
    { name: 'New Town Action Area I', lat: 22.5824, lng: 88.4597, addr: 'Action Area I, New Town, Rajarhat, Kolkata, West Bengal - 700156' },
    { name: 'Karunamoyee Central', lat: 22.5855, lng: 88.4182, addr: 'Karunamoyee, Salt Lake Sector II, Bidhannagar, Kolkata - 700106' },
    { name: 'City Centre 1 Hub', lat: 22.5938, lng: 88.4089, addr: 'DC Block, Sector I, Salt Lake City, Kolkata, West Bengal - 700064' }
  ];

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 space-y-5 text-white shadow-xl">
      {/* Header with Admin-Only Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#242424]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center text-[#DFC283]">
              <Building className="w-4 h-4 text-[#C5A059]" />
            </div>
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <span>Google Maps Factory Dispatch Location</span>
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Pin the exact factory dispatch origin and calibrate the live golden delivery radius zone (default: 7.0 Km).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#333333] hover:border-[#C5A059]/50 text-xs font-semibold text-[#DFC283] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
            ) : (
              <Locate className="w-3.5 h-3.5 text-[#C5A059]" />
            )}
            <span>{isLocating ? 'Detecting...' : 'Detect GPS'}</span>
          </button>

          <a
            href={getGoogleMapsNavigationUrl(currentLat, currentLng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#333333] hover:border-[#C5A059]/50 text-xs font-semibold text-neutral-300 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#DFC283]" />
            <span>Open in Maps</span>
          </a>
        </div>
      </div>

      {/* Address Search Bar */}
      <form onSubmit={handleSearchAddress} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search factory address (e.g., Plot 12 Sector V Salt Lake, Kolkata)..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-[#2e2e2e] focus:border-[#C5A059] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="px-4 py-2.5 bg-[#C5A059] hover:bg-[#DFC283] text-black font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Locate Pin</span>
        </button>
      </form>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] text-neutral-400 font-semibold mr-1">Quick Hubs:</span>
        {quickPresets.map(preset => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              setCurrentAddress(preset.addr);
              handlePositionChanged(preset.lat, preset.lng, true);
              onChange({
                factoryLatitude: preset.lat,
                factoryLongitude: preset.lng,
                factoryAddress: preset.addr,
                maxDeliveryRadiusKm: currentRadius,
                selfPickupAddress: `Factory Dispatch Counter #1, ${preset.addr}`
              });
              setStatusMessage({
                type: 'success',
                text: `Relocated to ${preset.name}`
              });
            }}
            className="px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#242424] border border-[#2e2e2e] hover:border-[#C5A059]/40 text-[11px] text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Interactive Google Map Container */}
      <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-[#262626]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {isLoading && (
          <div className="absolute inset-0 bg-[#121212]/90 flex flex-col items-center justify-center gap-2.5 text-neutral-300 z-10">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
            <span className="text-xs font-semibold">Loading Google Maps Platform Engine...</span>
          </div>
        )}

        {/* Real-time Radius Badge on Map */}
        <div className="absolute top-3 left-3 z-10 bg-black/85 backdrop-blur-md rounded-xl p-3 border border-[#333333] shadow-lg text-[11px] space-y-1.5 pointer-events-none max-w-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#C5A059] inline-block ring-2 ring-white/80" />
            <span className="text-white font-bold">Factory Origin: ({currentLat.toFixed(4)}, {currentLng.toFixed(4)})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[#C5A059] bg-[#C5A059]/30 inline-block" />
            <span className="text-neutral-300 font-semibold">{currentRadius} Km Live Delivery Radius Circle</span>
          </div>
          <div className="text-[10px] text-[#DFC283] pt-0.5">
            💡 Drag marker or click map to move origin
          </div>
        </div>

        {isGeocoding && (
          <div className="absolute bottom-3 left-3 z-10 bg-black/85 backdrop-blur-md rounded-lg px-3 py-1.5 border border-[#333333] text-[11px] text-white flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-[#C5A059]" />
            <span>Resolving street address...</span>
          </div>
        )}
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              : 'bg-[#1c1913] border-[#C5A059]/40 text-[#DFC283]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#C5A059] shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Delivery Radius Controls & Slider (Updated from 5km to 7km) */}
      <div className="bg-[#181818] p-4.5 rounded-2xl border border-[#2a2a2a] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#C5A059]" />
              <span>Doorstep Delivery Radius Constraint</span>
            </span>
            <p className="text-[11px] text-neutral-400">
              Orders placed beyond this distance will be automatically redirected to free Self Pickup at the factory counter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min={1}
              max={30}
              value={currentRadius}
              onChange={e => handleRadiusChange(parseFloat(e.target.value) || 7.0)}
              className="w-20 px-2.5 py-1.5 bg-[#121212] border border-[#333333] focus:border-[#C5A059] rounded-lg text-sm font-bold text-center text-[#DFC283] font-mono focus:outline-none"
            />
            <span className="text-xs font-bold text-neutral-300">Kilometers</span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={1}
            max={25}
            step={0.5}
            value={currentRadius}
            onChange={e => handleRadiusChange(parseFloat(e.target.value))}
            className="w-full accent-[#C5A059] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>1 Km</span>
            <span className={currentRadius === 5 ? 'text-neutral-400' : ''}>5 Km</span>
            <span className={currentRadius === 7 ? 'text-[#DFC283] font-bold' : ''}>7 Km (Standard)</span>
            <span>10 Km</span>
            <span>15 Km</span>
            <span>25 Km</span>
          </div>
        </div>

        {/* Quick Radius Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-neutral-400 font-medium">Quick Radius:</span>
          {[3, 5, 7, 10, 12, 15].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => handleRadiusChange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentRadius === r
                  ? 'bg-[#C5A059] text-black shadow-xs'
                  : 'bg-[#121212] text-neutral-300 hover:text-white border border-[#2c2c2c]'
              }`}
            >
              {r} Km {r === 7 ? '★' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Numerical Coordinate & Formatted Address Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        <div className="lg:col-span-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Factory Address (Dispatch Counter)
          </label>
          <input
            type="text"
            value={currentAddress}
            onChange={e => {
              setCurrentAddress(e.target.value);
              onChange({
                factoryLatitude: currentLat,
                factoryLongitude: currentLng,
                factoryAddress: e.target.value,
                maxDeliveryRadiusKm: currentRadius,
                selfPickupAddress: `Factory Dispatch Counter #1, ${e.target.value}`
              });
            }}
            className="w-full px-3.5 py-2.5 bg-[#161616] border border-[#2c2c2c] focus:border-[#C5A059] rounded-xl text-xs font-medium text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Factory Latitude (°N)
          </label>
          <input
            type="number"
            step="0.000001"
            value={currentLat}
            onChange={e => {
              const val = parseFloat(e.target.value) || 22.5726;
              handlePositionChanged(val, currentLng, true);
            }}
            className="w-full px-3 py-2 bg-[#161616] border border-[#2c2c2c] focus:border-[#C5A059] rounded-xl text-xs font-mono text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Factory Longitude (°E)
          </label>
          <input
            type="number"
            step="0.000001"
            value={currentLng}
            onChange={e => {
              const val = parseFloat(e.target.value) || 88.4331;
              handlePositionChanged(currentLat, val, true);
            }}
            className="w-full px-3 py-2 bg-[#161616] border border-[#2c2c2c] focus:border-[#C5A059] rounded-xl text-xs font-mono text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Active Delivery Limit
          </label>
          <div className="px-3 py-2 bg-[#161616] border border-[#2c2c2c] rounded-xl text-xs font-bold text-[#DFC283] flex items-center justify-between">
            <span>{currentRadius} Km Delivery Radius</span>
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
          </div>
        </div>
      </div>
    </div>
  );
};
