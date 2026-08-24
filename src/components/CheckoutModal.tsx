import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerInfo } from '../types';
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
  Info
} from 'lucide-react';
import { OrderSuccessModal } from './OrderSuccessModal';

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
    showToast
  } = useStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Kolkata & Surrounding');
  const [pincode, setPincode] = useState('700001');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash on Delivery (COD)' | 'UPI / QR Code' | 'Online NetBanking / Card'
  >('Cash on Delivery (COD)');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Name Required', 'Please provide your full name.', 'warning');
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      showToast('Valid Phone Required', 'Please enter a 10-digit mobile number for order delivery coordination.', 'warning');
      return;
    }

    if (!address.trim()) {
      showToast('Address Required', 'Please enter your street address / delivery location.', 'warning');
      return;
    }

    if (!pincode.trim()) {
      showToast('PIN Code Required', 'Please enter your area PIN code.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerInfo: CustomerInfo = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        pincode: pincode.trim()
      };

      const order = await createOrder(customerInfo, paymentMethod, orderNotes.trim());
      setIsSubmitting(false);
      setShowSuccessModal(true);
      onSuccess();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      showToast('Checkout Error', 'There was an issue processing your order. Please try again.', 'error');
    }
  };

  if (showSuccessModal && recentCreatedOrder) {
    return (
      <OrderSuccessModal
        order={recentCreatedOrder}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
      />
    );
  }

  const isCustom = cart.some(i => i.isCustomDesign);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-cyan-900 to-sky-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold">
                Complete Your Order
              </h3>
              <p className="text-xs text-cyan-200 mt-0.5">
                HH Mineral Water Direct Bottling & Home Delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Order Snapshot Pill */}
          <div className="bg-cyan-50/80 border border-cyan-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} in Bag
                </span>
                {isCustom && (
                  <span className="text-[10px] font-extrabold bg-cyan-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Includes Custom Design
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Immediate WhatsApp Confirmation will be dispatched to HH Owner (8017341130).
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Due</span>
              <span className="font-heading text-xl font-black text-cyan-800">₹{cartTotal}</span>
            </div>
          </div>

          {/* Customer Details Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-600" />
              <span>1. Customer & Contact Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (for Delivery & WhatsApp updates) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span>2. Delivery Address</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Street Address / Building / Flat No. *
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. Flat 4B, Silver Oak Heights, Salt Lake Sector 5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Near City Centre"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City / Area *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Kolkata"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  placeholder="700001"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyan-600" />
              <span>3. Payment Method</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'Cash on Delivery (COD)',
                  icon: Banknote,
                  title: 'Cash on Delivery',
                  desc: 'Pay cash when bottles arrive'
                },
                {
                  id: 'UPI / QR Code',
                  icon: QrCode,
                  title: 'UPI / Scan QR',
                  desc: 'Google Pay, PhonePe, Paytm'
                },
                {
                  id: 'Online NetBanking / Card',
                  icon: CreditCard,
                  title: 'Net Banking / Card',
                  desc: 'Instant online settlement'
                }
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-900 ring-1 ring-cyan-600 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                      {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-600"></span>}
                    </div>
                    <p className="text-xs font-bold mt-2">{opt.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* UPI QR Code Preview if selected */}
            {paymentMethod === 'UPI / QR Code' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in">
                <div className="w-20 h-20 bg-white p-2 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center shrink-0">
                  <div className="text-center font-mono text-[9px] text-slate-700">
                    <QrCode className="w-12 h-12 text-cyan-700 mx-auto" />
                    <span>HH MINERAL</span>
                  </div>
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-800">Scan & Pay ₹{cartTotal} via any UPI App</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    UPI ID: <span className="font-mono font-bold text-cyan-700">8017341130@upi</span> (HH Mineral Water)
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                    ✓ Instant payment verification upon delivery
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Notes */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Order Notes / Delivery Time Preference (Optional)
            </label>
            <input
              type="text"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="e.g. Please deliver between 10 AM - 1 PM, ring bell 2 times"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>100% Secure & Verified Order Placement</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-cyan-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Order...</span>
                </>
              ) : (
                <>
                  <span>Place Order (₹{cartTotal})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
