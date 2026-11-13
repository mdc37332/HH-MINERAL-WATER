import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerInfo, CustomerAddress, DeliveryCoordinates } from '../types';
import { normalizePhoneNumber } from '../lib/whatsapp';
import { LocationPickerMap } from './LocationPickerMap';
import { geocodeAddressText, reverseGeocodeCoords, getGoogleMapsNavigationUrl } from '../lib/googleMaps';
import {
  checkDeliveryEligibility,
  DEFAULT_FACTORY_CONFIG,
  calculateHaversineDistanceKm,
  LOCAL_PINCODE_DISTANCES
} from '../lib/factoryLocation';
import {
  X,
  ShieldCheck,
  Truck,
  CreditCard,
  QrCode,
  Banknote,
  Lock,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Phone,
  MapPin,
  User,
  Info,
  Building,
  Home,
  Briefcase,
  LogIn,
  Calendar,
  Store,
  Clock,
  AlertTriangle,
  Compass,
  ExternalLink,
  Navigation,
  RotateCcw
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const {
    cart,
    cartSubtotal,
    deliveryFee,
    cartTotal,
    createOrder,
    recentCreatedOrder,
    currentUser,
    customerProfile,
    adminSettings,
    openAuthModal,
    showToast
  } = useStore();

  // Delivery method: 'doorstep' (strictly under 5 Km) vs 'self_pickup' (factory counter, free)
  const [deliveryType, setDeliveryType] = useState<'doorstep' | 'self_pickup'>('doorstep');
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<DeliveryCoordinates | null>(null);
  const [gateNote, setGateNote] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [pickupSlot, setPickupSlot] = useState('Standard Factory Dispatch (Ready in 30 Mins)');

  // Find default address if available
  const defaultAddr = customerProfile?.addresses?.find(a => a.isDefault) || customerProfile?.addresses?.[0];

  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | 'new'>(
    defaultAddr ? defaultAddr.id : 'new'
  );

  const [name, setName] = useState(
    defaultAddr?.name || customerProfile?.displayName || currentUser?.displayName || ''
  );
  const [phone, setPhone] = useState(
    defaultAddr?.phone || customerProfile?.phone || ''
  );
  const [address, setAddress] = useState(defaultAddr?.address || '');
  const [landmark, setLandmark] = useState(defaultAddr?.landmark || '');
  const [city, setCity] = useState(defaultAddr?.city || 'Kolkata');
  const [pincode, setPincode] = useState(defaultAddr?.pincode || '700091');

  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card'
  >('Cash on Delivery (COD)');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check delivery eligibility (default 7 km radius)
  const maxRadiusKm = adminSettings?.maxDeliveryRadiusKm || 7.0;

  const eligibility = useMemo(() => {
    return checkDeliveryEligibility({
      userCoords,
      pincode,
      address,
      factoryLat: adminSettings.factoryLatitude || DEFAULT_FACTORY_CONFIG.latitude,
      factoryLng: adminSettings.factoryLongitude || DEFAULT_FACTORY_CONFIG.longitude,
      maxRadiusKm
    });
  }, [userCoords, pincode, address, adminSettings, maxRadiusKm]);

  // Pricing based on delivery mode
  const effectiveDeliveryFee = deliveryType === 'self_pickup' ? 0 : deliveryFee;
  const effectiveTotal = cartSubtotal + effectiveDeliveryFee;

  // Sync when address selection changes
  const handleSelectAddress = (addrId: string) => {
    setSelectedSavedAddressId(addrId);
    if (addrId === 'new') {
      setAddress('');
      setLandmark('');
      setPincode('700091');
      setUserCoords(null);
      setDeliveryCoordinates(null);
    } else {
      const match = customerProfile?.addresses?.find(a => a.id === addrId);
      if (match) {
        setName(match.name);
        setPhone(match.phone);
        setAddress(match.address);
        setLandmark(match.landmark || '');
        setCity(match.city);
        setPincode(match.pincode);

        if (match.latitude && match.longitude) {
          setUserCoords({ latitude: match.latitude, longitude: match.longitude });
          setDeliveryCoordinates({
            lat: match.latitude,
            lng: match.longitude,
            accuracy: match.accuracy,
            addressText: match.address,
            navigationUrl: match.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${match.latitude},${match.longitude}`,
            gateNote: match.gateNote || '',
            capturedAt: new Date().toISOString()
          });
          if (match.gateNote) setGateNote(match.gateNote);
          showToast('Map Pin Loaded', `Pinned to saved ${match.label} address coordinates.`, 'info');
        } else {
          // Forward geocode address to drop map pin automatically
          geocodeAddressText(`${match.address}, ${match.landmark || ''}, ${match.city} ${match.pincode}`).then(res => {
            if (res) {
              setUserCoords({ latitude: res.lat, longitude: res.lng });
              setDeliveryCoordinates({
                lat: res.lat,
                lng: res.lng,
                addressText: res.formattedAddress,
                navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${res.lat},${res.lng}`,
                gateNote: match.gateNote || '',
                capturedAt: new Date().toISOString()
              });
            }
          });
        }
      }
    }
  };

  // Restore map pin from default address on mount if coordinates exist
  useEffect(() => {
    if (defaultAddr && defaultAddr.latitude && defaultAddr.longitude) {
      setUserCoords({ latitude: defaultAddr.latitude, longitude: defaultAddr.longitude });
      setDeliveryCoordinates({
        lat: defaultAddr.latitude,
        lng: defaultAddr.longitude,
        accuracy: defaultAddr.accuracy,
        addressText: defaultAddr.address,
        navigationUrl: defaultAddr.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${defaultAddr.latitude},${defaultAddr.longitude}`,
        gateNote: defaultAddr.gateNote || '',
        capturedAt: new Date().toISOString()
      });
      if (defaultAddr.gateNote) setGateNote(defaultAddr.gateNote);
    }
  }, []);

  const [isPinningAddress, setIsPinningAddress] = useState(false);
  const handlePinTypedAddress = async () => {
    const fullAddr = [address, landmark, city, pincode].filter(Boolean).join(', ');
    if (!fullAddr.trim()) {
      showToast('Enter Address First', 'Please enter your street address or society name first.', 'warning');
      return;
    }
    setIsPinningAddress(true);
    try {
      const res = await geocodeAddressText(fullAddr);
      if (res) {
        setUserCoords({ latitude: res.lat, longitude: res.lng });
        setDeliveryCoordinates({
          lat: res.lat,
          lng: res.lng,
          addressText: res.formattedAddress,
          navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${res.lat},${res.lng}`,
          gateNote,
          capturedAt: new Date().toISOString()
        });
        showToast('Map Pin Dropped', `Customer address pinned on map at: ${res.formattedAddress.split(',').slice(0, 2).join(', ')}`, 'success');
      } else {
        showToast('Address Not Found', 'Could not find exact location on Google Maps. Please check spelling or drag pin manually.', 'warning');
      }
    } catch {
      showToast('Pinning Error', 'Could not locate address. You can drag the red pin manually on the map.', 'warning');
    } finally {
      setIsPinningAddress(false);
    }
  };

  // GPS Location detector with reverse-geocoding and instant address autofill
  const handleDetectGPSLocation = () => {
    if (!navigator.geolocation) {
      showToast('GPS Not Supported', 'Geolocation is not supported by your browser.', 'warning');
      return;
    }

    setIsLocating(true);

    const onPosSuccess = async (pos: GeolocationPosition) => {
      setIsLocating(false);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const coords = { latitude: lat, longitude: lng };
      setUserCoords(coords);

      const dist = calculateHaversineDistanceKm(
        adminSettings.factoryLatitude || DEFAULT_FACTORY_CONFIG.latitude,
        adminSettings.factoryLongitude || DEFAULT_FACTORY_CONFIG.longitude,
        lat,
        lng
      );

      const navUrl = getGoogleMapsNavigationUrl(lat, lng);

      try {
        const geoRes = await reverseGeocodeCoords(lat, lng);
        setDeliveryCoordinates({
          lat,
          lng,
          accuracy: pos.coords.accuracy,
          addressText: geoRes.formattedAddress,
          navigationUrl: navUrl,
          gateNote,
          capturedAt: new Date().toISOString(),
          distanceKm: dist
        });

        // Autofill form if user hasn't typed an address yet
        if (!address || address.length < 5) {
          const street = geoRes.formattedAddress.split(',').slice(0, 2).join(', ').trim();
          setAddress(street || geoRes.formattedAddress);
        }
        if (geoRes.locality) setCity(geoRes.locality);
        if (geoRes.postalCode) setPincode(geoRes.postalCode);
        if (geoRes.sublocality && !landmark) setLandmark(geoRes.sublocality);
      } catch {
        setDeliveryCoordinates({
          lat,
          lng,
          accuracy: pos.coords.accuracy,
          addressText: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          navigationUrl: navUrl,
          gateNote,
          capturedAt: new Date().toISOString(),
          distanceKm: dist
        });
      }

      const maxRad = adminSettings.maxDeliveryRadiusKm || DEFAULT_FACTORY_CONFIG.maxDeliveryRadiusKm;
      if (dist <= maxRad) {
        showToast('Delivery Eligible', `Location detected ~${dist} km from plant (within ${maxRad} km radius).`, 'success');
      } else {
        showToast(
          'Location Captured',
          `GPS location is ~${dist} km from plant. If ordering for a Salt Lake address, our system will verify your delivery address.`,
          'info'
        );
      }
    };

    const onPosError = (geoErr: GeolocationPositionError) => {
      setIsLocating(false);
      if (geoErr.code === 1) {
        showToast('Location Blocked', 'Location access was denied. You can search or select a Salt Lake preset.', 'info');
      } else {
        showToast('GPS Signal Notice', 'Could not detect device GPS. Delivery is verified via your PIN code or address.', 'info');
      }
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      onPosError,
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  const handleResetLocationToPincode = () => {
    setUserCoords(null);
    setDeliveryCoordinates(null);
    showToast('Location Reset', `Using delivery PIN code ${pincode || '700091'} to verify eligibility.`, 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Enforce authentication
    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create an account to proceed with checkout.');
      return;
    }

    // Check custom design minimum quantity constraint
    const invalidCustom = cart.find(i => i.isCustomDesign && i.quantity < 600);
    if (invalidCustom) {
      showToast(
        'Minimum Order 600 Pieces',
        'Minimum custom design order is 600 pieces. Please increase quantity to proceed.',
        'warning'
      );
      return;
    }

    if (!name.trim()) {
      showToast('Name Required', 'Please provide your full name.', 'warning');
      return;
    }

    const phoneValidation = normalizePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      showToast('Valid Phone Required', phoneValidation.error || 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    // Validation specific to Doorstep Delivery
    if (deliveryType === 'doorstep') {
      if (!address.trim()) {
        showToast('Address Required', 'Please enter your street address / delivery location.', 'warning');
        return;
      }

      if (!pincode.trim() || pincode.replace(/\D/g, '').length !== 6) {
        showToast('PIN Code Required', 'Please enter a valid 6-digit area PIN code.', 'warning');
        return;
      }

      // Enforce strict delivery radius limit!
      if (!eligibility.isEligible) {
        showToast(
          `Delivery Restricted to Under ${maxRadiusKm} Km`,
          `Your delivery location is ${eligibility.distanceKm} km away. Factory delivery is only allowed under ${maxRadiusKm} km. Please choose Self Pickup to collect directly from our factory!`,
          'warning'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const isPickup = deliveryType === 'self_pickup';
      const finalCoords: DeliveryCoordinates | undefined = !isPickup && (deliveryCoordinates || userCoords)
        ? {
            lat: deliveryCoordinates?.lat || userCoords!.latitude,
            lng: deliveryCoordinates?.lng || userCoords!.longitude,
            accuracy: deliveryCoordinates?.accuracy,
            addressText: deliveryCoordinates?.addressText || address.trim(),
            navigationUrl: deliveryCoordinates?.navigationUrl || `https://www.google.com/maps/dir/?api=1&destination=${deliveryCoordinates?.lat || userCoords!.latitude},${deliveryCoordinates?.lng || userCoords!.longitude}`,
            gateNote: gateNote.trim() || deliveryCoordinates?.gateNote,
            capturedAt: deliveryCoordinates?.capturedAt || new Date().toISOString()
          }
        : undefined;

      const customerInfo: CustomerInfo = {
        name: name.trim(),
        phone: phone.trim(),
        address: isPickup
          ? (adminSettings.selfPickupAddress || DEFAULT_FACTORY_CONFIG.selfPickupAddress)
          : address.trim(),
        landmark: isPickup ? 'Factory Dispatch Counter #1' : landmark.trim(),
        city: isPickup ? (adminSettings.state || 'Kolkata') : city.trim(),
        pincode: isPickup ? '700091' : pincode.trim(),
        email: currentUser?.email || undefined,
        deliveryCoordinates: finalCoords
      };

      const order = await createOrder(
        customerInfo,
        paymentMethod,
        orderNotes.trim(),
        {
          deliveryType,
          deliveryDistanceKm: isPickup ? 0 : eligibility.distanceKm,
          pickupSlot: isPickup ? pickupSlot : undefined,
          deliveryCoordinates: finalCoords
        }
      );

      setIsSubmitting(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      showToast('Checkout Error', 'There was an issue processing your order. Please try again.', 'error');
    }
  };

  const isCustom = cart.some(i => i.isCustomDesign);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative max-w-2xl w-full bg-[#0e0e0e] rounded-3xl shadow-2xl overflow-hidden border border-[#2a2a2a] my-6 animate-in fade-in zoom-in-95 duration-200 text-white">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#222222] flex items-center justify-between bg-[#141414] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c1c] border border-[#C5A059]/40 flex items-center justify-center text-[#DFC283]">
              <ShieldCheck className="w-6 h-6 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-white">
                Complete Your Order
              </h3>
              <p className="text-xs text-[#DFC283] mt-0.5">
                HH Mineral Water Direct Bottling & Doorstep Delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Authentication Notice if not logged in */}
        {!currentUser ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#C5A059]/30 text-[#DFC283] flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-[#C5A059]" />
            </div>
            <h4 className="font-heading text-xl font-bold text-white">
              Customer Sign In Required for Checkout
            </h4>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              To ensure order tracking, delivery notifications, saved addresses, and secure high-res artwork printing, please sign in or create an account.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuthModal('login', 'Sign in to complete your order')}
                className="w-full sm:w-auto bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-sm px-6 py-3 rounded-xl shadow-md cursor-pointer"
              >
                Sign In to Account
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup', 'Register customer account for fast checkout')}
                className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#252525] text-[#DFC283] border border-[#C5A059]/30 font-bold text-sm px-6 py-3 rounded-xl cursor-pointer"
              >
                Create New Account
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Order Snapshot & Items Review */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-[#242424]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Order Summary ({cart.length} item{cart.length !== 1 ? 's' : ''})
                    </span>
                    {isCustom && (
                      <span className="text-[10px] font-black bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C5A059]" />
                        Includes Custom Design
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Account: <span className="font-semibold text-neutral-200">{currentUser.email}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-neutral-500 block font-semibold uppercase">Total Due</span>
                  <span className="font-heading text-xl font-black text-[#DFC283]">₹{effectiveTotal.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-neutral-400 block">
                    {deliveryType === 'self_pickup' ? 'Self Pickup (₹0 Delivery)' : (deliveryFee === 0 ? 'Free Delivery' : `+₹${deliveryFee} Delivery`)}
                  </span>
                </div>
              </div>

              {/* Items List Preview */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.cartItemId} className="flex items-center justify-between text-xs bg-[#1a1a1a] p-2.5 rounded-xl border border-[#2a2a2a]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-8 h-10 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">
                          {item.product.name} ({item.product.size})
                        </p>
                        {item.isCustomDesign && item.customDesignDetails ? (
                          <>
                            <p className="text-[10px] text-[#DFC283] font-semibold truncate">
                              Brand: {item.customDesignDetails.businessName} • {item.customDesignDetails.finishType}
                              {item.customDesignDetails.uploadedImages?.length ? ` (${item.customDesignDetails.uploadedImages.length} Logo Attached)` : ''}
                            </p>
                            {(item.customDesignDetails.eventDate || item.customDesignDetails.dateOrVenue) && (
                              <p className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 truncate">
                                <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Event Date: {item.customDesignDetails.eventDate ? new Date(item.customDesignDetails.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : item.customDesignDetails.dateOrVenue} (Booked &gt; 1 Wk Ahead)</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] text-[#DFC283] font-semibold">
                            Bottle Option: {item.quantity} Pieces @ ₹{item.unitPrice}/bottle
                          </p>
                        )}
                        <span className="text-[10px] font-bold text-neutral-300">
                          {item.isCustomDesign
                            ? `${item.quantity.toLocaleString('en-IN')} Custom Pieces @ ₹${item.unitPrice}/pc`
                            : `${item.quantity.toLocaleString('en-IN')} Total Bottles (₹${item.unitPrice * item.quantity})`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="font-bold text-[#DFC283]">
                        ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Method Selection: Doorstep (Under 7 Km) vs Self Pickup */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#C5A059]" />
                  <span>Choose Fulfillment Method</span>
                </span>
                <span className="text-[10px] text-[#DFC283] font-medium">
                  Factory: Salt Lake Sector V
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Doorstep Delivery (Under 7 Km Only) */}
                <button
                  type="button"
                  onClick={() => setDeliveryType('doorstep')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    deliveryType === 'doorstep'
                      ? 'border-[#C5A059] bg-[#C5A059]/15 ring-2 ring-[#C5A059]/80 shadow-md'
                      : 'border-[#2e2e2e] bg-[#141414] hover:border-[#444444]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        deliveryType === 'doorstep' ? 'bg-[#C5A059] text-black font-bold' : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">Doorstep Delivery</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Direct to your doorstep</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Under {maxRadiusKm} Km Only
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#292929] flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      {deliveryFee === 0 ? 'Free Delivery' : `Delivery Fee: ₹${deliveryFee}`}
                    </span>
                    <span className="text-[#DFC283] font-semibold">
                      Max {maxRadiusKm.toFixed(1)} Km Radius
                    </span>
                  </div>
                </button>

                {/* Option 2: Self Pickup (Free at Factory Counter) */}
                <button
                  type="button"
                  onClick={() => setDeliveryType('self_pickup')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    deliveryType === 'self_pickup'
                      ? 'border-[#C5A059] bg-[#C5A059]/15 ring-2 ring-[#C5A059]/80 shadow-md'
                      : 'border-[#2e2e2e] bg-[#141414] hover:border-[#444444]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        deliveryType === 'self_pickup' ? 'bg-[#C5A059] text-black font-bold' : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">Self Pickup</span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            FREE
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Collect at Bottling Plant</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Zero Distance Limit
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#292929] flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">
                      ₹0 Delivery Charge
                    </span>
                    <span className="text-neutral-400">
                      Ready in 30 mins
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Customer Details Section */}
            <div className="space-y-4 pt-2 border-t border-[#222222]">
              <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <User className="w-4 h-4 text-[#C5A059]" />
                <span>1. Contact & Recipient Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Mobile Number (for Delivery & Automated WhatsApp Confirmation) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-[#181818] text-white text-sm focus:outline-none focus:ring-2 ${
                      phone.trim().length > 0 && !normalizePhoneNumber(phone).isValid
                        ? 'border-amber-500/80 focus:ring-amber-500 bg-amber-950/20'
                        : 'border-[#2e2e2e] focus:ring-[#C5A059]'
                    }`}
                  />
                  {phone.trim().length > 0 && (
                    <p className={`text-[11px] mt-1 ${
                      normalizePhoneNumber(phone).isValid ? 'text-emerald-400 font-medium' : 'text-amber-400'
                    }`}>
                      {normalizePhoneNumber(phone).isValid
                        ? `✓ WhatsApp confirmation will be sent automatically to ${normalizePhoneNumber(phone).display}`
                        : normalizePhoneNumber(phone).error}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Condition A: DOORSTEP DELIVERY (Under 7 Km Policy & Distance Validation) */}
            {deliveryType === 'doorstep' ? (
              <div className="space-y-4 pt-2 border-t border-[#222222]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#C5A059]" />
                    <span>2. Delivery Address (Under {maxRadiusKm} Km Radius Only)</span>
                  </h4>

                  {/* GPS Locator Button */}
                  <button
                    type="button"
                    onClick={handleDetectGPSLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DFC283] bg-[#C5A059]/15 hover:bg-[#C5A059]/25 border border-[#C5A059]/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer w-fit"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                    ) : (
                      <Compass className="w-3.5 h-3.5 text-[#C5A059]" />
                    )}
                    <span>{isLocating ? 'Detecting GPS...' : 'Detect My Live Location'}</span>
                  </button>
                </div>

                {/* Distance Check Status Banner */}
                <div className={`p-3.5 rounded-xl border text-xs transition-all ${
                  eligibility.isEligible
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {eligibility.isEligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {eligibility.isEligible
                            ? `✓ Within ${maxRadiusKm} Km Factory Delivery Zone (~${eligibility.distanceKm} km from plant)`
                            : `⚠️ Delivery Unavailable: Distance is ~${eligibility.distanceKm} km (Limit: ${maxRadiusKm.toFixed(1)} km)`}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-neutral-300">
                          Plant: Salt Lake Sector V
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {eligibility.message}
                      </p>

                      {!eligibility.isEligible && (
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryType('self_pickup')}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-black text-xs px-3.5 py-1.5 rounded-lg shadow-sm hover:brightness-110 cursor-pointer"
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>Switch to Free Self Pickup at Factory</span>
                          </button>
                          {(userCoords || deliveryCoordinates) && (
                            <button
                              type="button"
                              onClick={handleResetLocationToPincode}
                              className="inline-flex items-center gap-1.5 bg-[#1f222e] hover:bg-[#2a2e3d] text-neutral-200 border border-neutral-700 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3 text-[#C5A059]" />
                              <span>Use Pincode {pincode || '700091'} Instead</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Google Maps Customer Location Pinning & Live GPS Integration */}
                <div className="pt-1">
                  <LocationPickerMap
                    addressTextToPin={[address, landmark, city, pincode].filter(Boolean).join(', ')}
                    initialCoords={
                      deliveryCoordinates
                        ? { lat: deliveryCoordinates.lat, lng: deliveryCoordinates.lng }
                        : userCoords
                        ? { lat: userCoords.latitude, lng: userCoords.longitude }
                        : null
                    }
                    gateNote={gateNote}
                    onGateNoteChange={setGateNote}
                    onLocationChange={loc => {
                      setUserCoords({ latitude: loc.lat, longitude: loc.lng });
                      setDeliveryCoordinates({
                        lat: loc.lat,
                        lng: loc.lng,
                        accuracy: loc.accuracy,
                        addressText: loc.addressText,
                        navigationUrl: loc.navigationUrl,
                        gateNote: gateNote,
                        capturedAt: new Date().toISOString()
                      });
                    }}
                    onAddressAutofill={autofill => {
                      if (autofill.address && (!address || address.length < 5)) {
                        setAddress(autofill.address);
                      }
                      if (autofill.city) setCity(autofill.city);
                      if (autofill.pincode) setPincode(autofill.pincode);
                      if (autofill.landmark && !landmark) setLandmark(autofill.landmark);
                    }}
                    factoryCoords={{
                      lat: adminSettings.factoryLatitude || DEFAULT_FACTORY_CONFIG.latitude,
                      lng: adminSettings.factoryLongitude || DEFAULT_FACTORY_CONFIG.longitude
                    }}
                  />
                </div>

                {/* Saved Addresses Picker (if available) */}
                {customerProfile?.addresses && customerProfile.addresses.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-neutral-300">
                      Saved Delivery Addresses
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {customerProfile.addresses.map(addr => (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs space-y-1 ${
                            selectedSavedAddressId === addr.id
                              ? 'border-[#C5A059] bg-[#C5A059]/15 ring-2 ring-[#C5A059]'
                              : 'border-[#262626] hover:border-[#333333] bg-[#161616]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-white">
                            <span>{addr.label}</span>
                            {addr.isDefault && (
                              <span className="text-[9px] bg-[#C5A059]/20 text-[#DFC283] px-1.5 py-0.2 rounded font-bold">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-400 line-clamp-1">{addr.address}, {addr.city} - {addr.pincode}</p>
                        </div>
                      ))}
                      <div
                        onClick={() => handleSelectAddress('new')}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-center cursor-pointer transition-all ${
                          selectedSavedAddressId === 'new'
                            ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#DFC283] font-bold'
                            : 'border-dashed border-[#333333] text-neutral-400 hover:border-[#C5A059]/40'
                        }`}
                      >
                        <span>+ Enter Custom Address</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-bold text-neutral-300">
                      Full Street Address / Building / Flat No. *
                    </label>
                    <button
                      type="button"
                      onClick={handlePinTypedAddress}
                      disabled={isPinningAddress}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/70 border border-cyan-700/60 hover:border-cyan-500 px-2.5 py-0.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      title="Geocodes this street address and drops the map pin directly"
                    >
                      {isPinningAddress ? (
                        <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                      ) : (
                        <MapPin className="w-3 h-3 text-cyan-400" />
                      )}
                      <span>Drop Map Pin at Address</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Flat 4B, Silver Oak Heights, Salt Lake Sector 5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                  {deliveryCoordinates && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Map Pin Dropped for Delivery: {deliveryCoordinates.lat.toFixed(4)}, {deliveryCoordinates.lng.toFixed(4)}</span>
                      </span>
                      {deliveryCoordinates.navigationUrl && (
                        <a
                          href={deliveryCoordinates.navigationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-0.5"
                        >
                          <span>View on Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={e => setLandmark(e.target.value)}
                      placeholder="Near City Centre / RDB Cinema"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      City / Area *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Kolkata"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      Area PIN Code (6 Digits) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={e => setPincode(e.target.value)}
                      placeholder="700091"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Condition B: SELF PICKUP AT FACTORY COUNTER */
              <div className="space-y-4 pt-2 border-t border-[#222222]">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#C5A059]" />
                  <span>2. Factory Dispatch & Pickup Location</span>
                </h4>

                {/* Factory Details Showcase Card */}
                <div className="bg-[#141414] border border-[#C5A059]/40 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#DFC283] block">
                        Direct Factory Collection
                      </span>
                      <h5 className="text-sm font-bold text-white">
                        {adminSettings.factoryLocationName || DEFAULT_FACTORY_CONFIG.name}
                      </h5>
                    </div>
                    <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full">
                      ✓ ₹0 Delivery Charge
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-neutral-300 pt-1 border-t border-[#242424]">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">
                          {adminSettings.selfPickupAddress || DEFAULT_FACTORY_CONFIG.selfPickupAddress}
                        </p>
                        <p className="text-[11px] text-neutral-400">Landmark: Near Webel Bhavan & RDB Cinema, Salt Lake Sector V</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-2 text-neutral-300 bg-[#1c1c1c] p-2 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                        <span>Hours: {adminSettings.selfPickupTimings || DEFAULT_FACTORY_CONFIG.selfPickupTimings}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-300 bg-[#1c1c1c] p-2 rounded-lg">
                        <Phone className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                        <span>Dispatch Desk: {adminSettings.selfPickupContact || DEFAULT_FACTORY_CONFIG.selfPickupContact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Google Maps link */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#242424] text-xs">
                    <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bottles packed fresh & ready in 30 minutes</span>
                    </span>
                    <a
                      href="https://maps.google.com/?q=Sector+V+Salt+Lake+Kolkata"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DFC283] hover:underline"
                    >
                      <span>View in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Pickup Slot preference */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Estimated Pickup Timing Preference
                  </label>
                  <select
                    value={pickupSlot}
                    onChange={e => setPickupSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  >
                    <option value="Ready in 30 Mins (Standard Factory Dispatch)">Ready in 30 Mins (Standard Dispatch)</option>
                    <option value="Today Evening (5:00 PM – 8:00 PM)">Today Evening (5:00 PM – 8:00 PM)</option>
                    <option value="Tomorrow Morning (9:00 AM – 12:00 PM)">Tomorrow Morning (9:00 AM – 12:00 PM)</option>
                    <option value="Tomorrow Afternoon (1:00 PM – 4:00 PM)">Tomorrow Afternoon (1:00 PM – 4:00 PM)</option>
                    <option value="Weekend Collection (Saturday / Sunday)">Weekend Collection (Saturday / Sunday)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Payment Method - Cash Only */}
            <div className="space-y-3 pt-2 border-t border-[#222222]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#C5A059]" />
                  <span>3. Payment Method</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Cash Payment Only</span>
                </span>
              </div>

              {/* Cash on Delivery / Counter Option */}
              <div className="p-4 rounded-2xl border border-[#C5A059] bg-[#C5A059]/10 text-[#DFC283] ring-1 ring-[#C5A059]/50 shadow-sm transition-all">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center shrink-0 text-[#DFC283]">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {deliveryType === 'self_pickup' ? 'Cash at Factory Counter' : 'Cash on Delivery (COD)'}
                        </p>
                        <span className="text-[10px] font-extrabold bg-[#C5A059] text-black px-1.5 py-0.2 rounded font-mono">
                          DEFAULT
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-0.5">
                        {deliveryType === 'self_pickup'
                          ? 'Pay cash upon collecting your packaged drinking water directly at our factory dispatch counter.'
                          : 'Pay cash directly to our delivery personnel when your mineral water is delivered to your doorstep.'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-black text-[#DFC283] bg-black/50 px-2.5 py-1 rounded-lg border border-[#C5A059]/30">
                      ₹{effectiveTotal} Due
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#C5A059]/20 flex items-center gap-2 text-[11px] text-neutral-400">
                  <Info className="w-3.5 h-3.5 text-[#DFC283] shrink-0" />
                  <span>
                    {deliveryType === 'self_pickup'
                      ? `Zero delivery fee applied. Please keep exact cash of ₹${effectiveTotal} ready at the factory counter.`
                      : `Online payment modes are currently disabled. Please keep exact cash of ₹${effectiveTotal} ready at delivery.`}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery / Order Notes */}
            <div className="pt-2 border-t border-[#222222]">
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                {deliveryType === 'self_pickup' ? 'Special Instructions / Pickup Note (Optional)' : 'Order Notes / Delivery Time Preference (Optional)'}
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder={deliveryType === 'self_pickup' ? 'e.g. Bringing car to load bottles, will arrive around 4 PM' : 'e.g. Please deliver between 10 AM - 1 PM, ring bell 2 times'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#181818] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#C5A059]" />
                <span>
                  {deliveryType === 'self_pickup'
                    ? '100% Free Self Pickup • Direct Factory Dispatch'
                    : `Factory Delivery • Verified Under ${maxRadiusKm} Km Radius`}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (deliveryType === 'doorstep' && !eligibility.isEligible)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 font-black text-sm px-8 py-3.5 rounded-xl shadow-xl active:scale-95 transition-all cursor-pointer ${
                  deliveryType === 'doorstep' && !eligibility.isEligible
                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black shadow-[#C5A059]/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Processing Order...</span>
                  </>
                ) : deliveryType === 'doorstep' && !eligibility.isEligible ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Delivery Beyond {maxRadiusKm} Km (Select Self Pickup)</span>
                  </>
                ) : (
                  <>
                    <span>
                      {deliveryType === 'self_pickup'
                        ? `Confirm Self Pickup Order (₹${effectiveTotal})`
                        : `Place Delivery Order (₹${effectiveTotal})`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
