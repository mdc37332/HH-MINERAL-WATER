import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import {
  X,
  Navigation,
  MapPin,
  MessageCircle,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Truck,
  User,
  ShieldCheck,
  Building,
  Clock,
  Compass,
  FileText
} from 'lucide-react';
import {
  formatDriverDeliveryNavigationMessage,
  getDriverWhatsAppShareUrl
} from '../lib/whatsapp';
import {
  getGoogleMapsLoader,
  getGoogleMapsNavigationUrl,
  SOLUTION_ATTRIBUTION_ID
} from '../lib/googleMaps';
import { DEFAULT_FACTORY_CONFIG } from '../lib/factoryLocation';

interface DriverNavigationModalProps {
  order: Order;
  onClose: () => void;
  factoryCoords?: { lat: number; lng: number };
}

const DRIVER_PRESETS = [
  { name: 'Driver Raju Mondal (Van 1)', phone: '9830012345' },
  { name: 'Driver Amit Sharma (Van 2)', phone: '9830054321' },
  { name: 'Driver Sunita Das (E-Rickshaw)', phone: '9830098765' }
];

export const DriverNavigationModal: React.FC<DriverNavigationModalProps> = ({
  order,
  onClose,
  factoryCoords = {
    lat: DEFAULT_FACTORY_CONFIG.latitude,
    lng: DEFAULT_FACTORY_CONFIG.longitude
  }
}) => {
  const [driverName, setDriverName] = useState<string>('Driver Raju Mondal');
  const [driverPhone, setDriverPhone] = useState<string>('9830012345');
  const [copied, setCopied] = useState<boolean>(false);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const coords = order.deliveryCoordinates || order.customer.deliveryCoordinates;
  const destinationLat = coords?.lat || factoryCoords.lat;
  const destinationLng = coords?.lng || factoryCoords.lng;

  const destinationAddress = [
    order.customer.address,
    order.customer.landmark ? `(Landmark: ${order.customer.landmark})` : '',
    order.customer.city,
    order.customer.pincode
  ]
    .filter(Boolean)
    .join(', ');

  const googleMapsNavUrl = coords
    ? getGoogleMapsNavigationUrl(coords.lat, coords.lng)
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress)}`;

  // Formatted message preview
  const driverMessage = formatDriverDeliveryNavigationMessage(order, driverName);

  // Initialize Route Map Preview
  useEffect(() => {
    let isCancelled = false;

    getGoogleMapsLoader()
      .then(maps => {
        if (isCancelled || !mapContainerRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: destinationLat, lng: destinationLng },
          zoom: 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
          ...({ internalUsageAttributionIds: [SOLUTION_ATTRIBUTION_ID] } as any)
        };

        const map = new maps.Map(mapContainerRef.current, mapOptions);

        // Factory Origin Marker
        new maps.Marker({
          position: factoryCoords,
          map,
          title: 'Factory Dispatch (Origin)',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#C5A059',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
          }
        });

        // Customer Delivery Marker
        new maps.Marker({
          position: { lat: destinationLat, lng: destinationLng },
          map,
          title: `Customer Location: ${order.customer.name}`,
          animation: maps.Animation.DROP
        });

        // Compute driving directions polyline if coordinates exist
        if (coords) {
          const directionsService = new maps.DirectionsService();
          const directionsRenderer = new maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#10B981',
              strokeWeight: 5,
              strokeOpacity: 0.8
            }
          });

          directionsService.route(
            {
              origin: factoryCoords,
              destination: { lat: coords.lat, lng: coords.lng },
              travelMode: maps.TravelMode.DRIVING
            },
            (result, status) => {
              if (status === maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
              }
            }
          );
        }

        setIsMapReady(true);
      })
      .catch(err => {
        console.warn('Google Maps Driver Route render error:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [coords, destinationLat, destinationLng, factoryCoords, order.customer.name]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(driverMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareToDriverWhatsApp = () => {
    const url = getDriverWhatsAppShareUrl(order, driverPhone, driverName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenTurnByTurnNav = () => {
    window.open(googleMapsNavUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative max-w-2xl w-full bg-[#111215] rounded-3xl shadow-2xl overflow-hidden border border-[#2b2d35] my-6 text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#23252d] flex items-center justify-between bg-[#16181f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Driver Dispatch & Navigation
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-400">
                  Google Maps
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Order #{order.id} • Customer: {order.customer.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Customer Delivery Destination Card */}
          <div className="bg-[#181a22] border border-[#2a2d39] rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  Destination Address
                </span>
                <h4 className="text-sm font-bold text-white">
                  {order.customer.name}
                </h4>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  {destinationAddress}
                </p>
              </div>

              {/* Call Customer Button */}
              <a
                href={`tel:${order.customer.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#232531] hover:bg-[#2e3141] border border-[#3b3f52] text-xs font-semibold text-neutral-200 shrink-0 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Call {order.customer.phone}</span>
              </a>
            </div>

            {coords?.gateNote && (
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-200">
                <Building className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[11px] uppercase tracking-wide">
                    Delivery / Entry Instructions:
                  </span>
                  <span>{coords.gateNote}</span>
                </div>
              </div>
            )}

            {coords ? (
              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400 bg-black/40 p-2 rounded-lg border border-[#252834]">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  GPS Pin: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </span>
                {coords.accuracy && <span>(Accuracy: ±{Math.round(coords.accuracy)}m)</span>}
              </div>
            ) : (
              <div className="text-[11px] text-amber-400/90 italic">
                * Note: Customer provided text address. Route will navigate via Google Maps geocoded street search.
              </div>
            )}
          </div>

          {/* Interactive Route Preview on Google Maps */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wide flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Live Route Preview (Factory → Customer Destination)</span>
              </span>
              <button
                type="button"
                onClick={handleOpenTurnByTurnNav}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1"
              >
                <span>Open in Google Maps App</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-[#2b2d35] bg-[#1a1c23]">
              <div ref={mapContainerRef} className="w-full h-full" />
              {!isMapReady && (
                <div className="absolute inset-0 bg-[#16181f]/90 flex items-center justify-center text-xs text-neutral-400">
                  Loading Google Maps route preview...
                </div>
              )}
            </div>
          </div>

          {/* Select / Enter Driver Assignment */}
          <div className="bg-[#181a22] border border-[#2a2d39] rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select Delivery Driver</span>
            </span>

            {/* Quick Driver Presets */}
            <div className="flex flex-wrap gap-2">
              {DRIVER_PRESETS.map(preset => (
                <button
                  key={preset.phone}
                  type="button"
                  onClick={() => {
                    setDriverName(preset.name);
                    setDriverPhone(preset.phone);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    driverPhone === preset.phone
                      ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
                      : 'bg-[#22242f] border-[#313543] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Custom Driver Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  placeholder="Driver Name"
                  className="w-full bg-[#111215] border border-[#313543] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Driver WhatsApp Number
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                  placeholder="e.g. 9830012345"
                  className="w-full bg-[#111215] border border-[#313543] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: 1-Click WhatsApp to Driver & Turn-by-Turn Nav */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* WhatsApp to Driver */}
            <button
              type="button"
              onClick={handleShareToDriverWhatsApp}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg hover:shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>Share to Driver via WhatsApp</span>
            </button>

            {/* Open Google Maps Live Navigation */}
            <button
              type="button"
              onClick={handleOpenTurnByTurnNav}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg hover:shadow-blue-900/40 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-white" />
              <span>Start Turn-by-Turn Navigation</span>
            </button>
          </div>

          {/* Copy Message / Text Fallback */}
          <div className="pt-1 flex items-center justify-between text-xs text-neutral-400">
            <span className="text-[11px]">Direct navigation link embedded in dispatch message.</span>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#313543] bg-[#181a22] hover:bg-[#232531] text-neutral-200 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied Manifest</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Dispatch Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
