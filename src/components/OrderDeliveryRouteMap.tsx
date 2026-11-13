import React, { useEffect, useRef, useState } from 'react';
import { Order } from '../types';
import {
  MapPin,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Building,
  Truck,
  Loader2,
  Compass
} from 'lucide-react';
import {
  getGoogleMapsLoader,
  getGoogleMapsNavigationUrl,
  SOLUTION_ATTRIBUTION_ID
} from '../lib/googleMaps';
import { DEFAULT_FACTORY_CONFIG } from '../lib/factoryLocation';

interface OrderDeliveryRouteMapProps {
  order: Order;
}

export const OrderDeliveryRouteMap: React.FC<OrderDeliveryRouteMapProps> = ({ order }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);

  const coords = order.deliveryCoordinates || order.customer?.deliveryCoordinates;
  const factory = DEFAULT_FACTORY_CONFIG;

  const destLat = coords?.lat;
  const destLng = coords?.lng;

  const navUrl = destLat && destLng
    ? getGoogleMapsNavigationUrl(destLat, destLng)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${order.customer.address}, ${order.customer.city} ${order.customer.pincode}`
      )}`;

  useEffect(() => {
    let isCancelled = false;

    if (!mapContainerRef.current) return;

    setIsLoading(true);
    getGoogleMapsLoader()
      .then(maps => {
        if (isCancelled || !mapContainerRef.current) return;

        const centerLat = destLat ? (factory.latitude + destLat) / 2 : factory.latitude;
        const centerLng = destLng ? (factory.longitude + destLng) / 2 : factory.longitude;

        const map = new maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: destLat ? 13 : 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          ...({ internalUsageAttributionIds: [SOLUTION_ATTRIBUTION_ID] } as any)
        });

        setMapInstance(map);

        // 1. Factory Origin Marker
        new maps.Marker({
          position: { lat: factory.latitude, lng: factory.longitude },
          map,
          title: 'HH Mineral Water Bottling Plant (Origin)',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#C5A059',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
          }
        });

        // 2. Customer Location Marker (if coordinates available)
        if (destLat && destLng) {
          const destMarker = new maps.Marker({
            position: { lat: destLat, lng: destLng },
            map,
            title: `Delivery Destination: ${order.customer.name}`,
            animation: maps.Animation.DROP
          });

          // Route Directions Line
          const directionsService = new maps.DirectionsService();
          const directionsRenderer = new maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#C5A059',
              strokeWeight: 4,
              strokeOpacity: 0.9
            }
          });

          directionsService.route(
            {
              origin: { lat: factory.latitude, lng: factory.longitude },
              destination: { lat: destLat, lng: destLng },
              travelMode: maps.TravelMode.DRIVING
            },
            (result, status) => {
              if (status === maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
                const leg = result.routes[0]?.legs[0];
                if (leg?.distance?.text) {
                  setRouteDistance(leg.distance.text);
                }
              } else {
                // Fallback: simple bounds fit
                const bounds = new maps.LatLngBounds();
                bounds.extend({ lat: factory.latitude, lng: factory.longitude });
                bounds.extend({ lat: destLat, lng: destLng });
                map.fitBounds(bounds, 40);
              }
            }
          );
        }

        setIsLoading(false);
      })
      .catch(err => {
        console.warn('Google Maps error in OrderDeliveryRouteMap:', err);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [destLat, destLng, factory.latitude, factory.longitude, order.customer.name]);

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#282828] overflow-hidden space-y-3 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#201d16] border border-[#C5A059]/40 flex items-center justify-center text-[#DFC283]">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Google Maps Delivery Navigation</span>
              {routeDistance && (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.2 rounded-full border border-emerald-800/40">
                  {routeDistance} from Bottling Plant
                </span>
              )}
            </h5>
            <p className="text-[10px] text-neutral-400">
              {destLat && destLng
                ? `Customer GPS Verified (${destLat.toFixed(4)}, ${destLng.toFixed(4)})`
                : 'Turn-by-turn navigation available for delivery drivers'}
            </p>
          </div>
        </div>

        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black text-xs font-bold shadow-xs transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </a>
      </div>

      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#111111]">
        <div ref={mapContainerRef} className="w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 bg-[#121212]/90 flex items-center justify-center gap-2 text-neutral-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
            <span>Loading Google Map Route...</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
          <span>Origin: Salt Lake Sector V Plant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Destination: {order.customer.city || 'Customer Address'}</span>
        </div>
      </div>
    </div>
  );
};
