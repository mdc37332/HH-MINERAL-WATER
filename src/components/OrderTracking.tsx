import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  MessageCircle,
  FileDown,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { getWhatsAppDirectUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const OrderTracking: React.FC = () => {
  const { orders, trackOrderId, setTrackOrderId, triggerWhatsAppNotification, showToast } = useStore();
  const [searchInput, setSearchInput] = useState(trackOrderId || '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchFilter, setSearchFilter] = useState<'all' | 'custom'>('all');

  const statusPipeline: OrderStatus[] = [
    'New',
    'Confirmed',
    'Processing',
    'Ready',
    'Out for Delivery',
    'Delivered'
  ];

  // Auto select if trackOrderId set
  useEffect(() => {
    if (trackOrderId && orders.length > 0) {
      const match = orders.find(o => o.id.toLowerCase() === trackOrderId.toLowerCase());
      if (match) {
        setSelectedOrder(match);
        setSearchInput(trackOrderId);
      }
    } else if (orders.length > 0 && !selectedOrder) {
      setSelectedOrder(orders[0]);
    }
  }, [trackOrderId, orders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) {
      showToast('Enter Search Query', 'Please provide an Order ID or mobile number.', 'info');
      return;
    }

    const found = orders.find(
      o => o.id.toLowerCase() === query || o.customer.phone.includes(query)
    );

    if (found) {
      setSelectedOrder(found);
      setTrackOrderId(found.id);
      showToast('Order Found', `Displaying tracking details for ${found.id}.`, 'success');
    } else {
      showToast('No Order Found', `No active order matches "${searchInput}". Please check ID or phone.`, 'warning');
    }
  };

  const getStatusIndex = (current: OrderStatus) => {
    if (current === 'Cancelled' || current === 'Failed') return -1;
    return statusPipeline.indexOf(current);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Track Your <span className="text-cyan-600">Mineral Water Order</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600">
          Enter your Order ID (e.g. HH-ORD-12345) or 10-digit customer mobile number to monitor purification, custom labeling, and delivery status.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 flex gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Enter Order ID or Mobile Number..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition-all cursor-pointer shrink-0"
          >
            Track
          </button>
        </form>
      </div>

      {/* Main Grid: Orders list sidebar + Order Detail card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Orders List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-cyan-600" />
              <span>Recent Orders ({orders.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400">Live Sync</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No orders placed yet in this session.
              </div>
            ) : (
              orders.map(ord => {
                const isSelected = selectedOrder?.id === ord.id;
                return (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setSelectedOrder(ord);
                      setTrackOrderId(ord.id);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-600 bg-cyan-50/70 shadow-xs ring-1 ring-cyan-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{ord.id}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          ord.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'Cancelled' || ord.status === 'Failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span>{ord.customer.name}</span>
                      <span className="font-bold text-slate-900">₹{ord.totalAmount}</span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      {ord.isCustomOrder && (
                        <span className="text-[10px] text-cyan-700 font-bold bg-cyan-100/60 px-1.5 py-0.2 rounded">
                          Custom Design
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Order Detailed Tracking (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedOrder ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-8">
              {/* Order Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-xl text-slate-900">
                      {selectedOrder.id}
                    </span>
                    {selectedOrder.isCustomOrder && (
                      <span className="text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3 h-3" />
                        CUSTOM DESIGN ORDER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()} • Payment: {selectedOrder.paymentMethod}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Invoice</span>
                  </button>

                  <a
                    href={getWhatsAppDirectUrl(selectedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Owner (8017341130)</span>
                  </a>
                </div>
              </div>

              {/* Status Timeline Stepper */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
                  Order Progression Status
                </h4>

                {selectedOrder.status === 'Cancelled' || selectedOrder.status === 'Failed' ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-900">
                    <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    <div>
                      <h5 className="font-bold text-sm">Order Status: {selectedOrder.status}</h5>
                      <p className="text-xs mt-0.5">This order was marked as {selectedOrder.status.toLowerCase()}. Please contact HH Support at 8017341130 for assistance.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Stepper Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {statusPipeline.map((step, idx) => {
                        const currentIdx = getStatusIndex(selectedOrder.status);
                        const isPast = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;

                        return (
                          <div
                            key={step}
                            className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                              isCurrent
                                ? 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-400/40 shadow-xs'
                                : isPast
                                ? 'bg-slate-50 border-slate-200 text-slate-700'
                                : 'bg-slate-50/50 border-slate-100 opacity-50'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 shadow-2xs ${
                                isCurrent
                                  ? 'bg-cyan-600 text-white animate-pulse'
                                  : isPast
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isPast && !isCurrent ? '✓' : idx + 1}
                            </div>
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {step}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              {isCurrent ? 'Active Now' : isPast ? 'Completed' : 'Upcoming'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Ordered List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Products in this Order
                </h4>

                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        item.isCustomDesign
                          ? 'bg-cyan-50/50 border-cyan-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-slate-900">{item.product.name}</h5>
                            <span className="text-xs font-semibold text-cyan-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {item.product.size}
                            </span>
                          </div>

                          {item.isCustomDesign && item.customDesignDetails && (
                            <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-2">
                              <span className="font-bold text-cyan-900">
                                Custom Branding: "{item.customDesignDetails.businessName}"
                              </span>
                              <span>•</span>
                              <span>{item.customDesignDetails.finishType}</span>
                              {item.customDesignDetails.uploadedImages?.length > 0 && (
                                <span className="text-emerald-700 font-semibold">
                                  ({item.customDesignDetails.uploadedImages.length} Artwork file(s) attached)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 block">
                          ₹{item.unitPrice} × {item.quantity}
                        </span>
                        <span className="font-heading text-base font-bold text-slate-900">
                          ₹{item.unitPrice * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploaded Original Images Section (If custom) */}
              {selectedOrder.hasOriginalImage && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      Original Uploaded Files for Printing
                    </h5>
                    <span className="text-[10px] text-slate-400">High-Resolution Preserved</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedOrder.items.flatMap(item =>
                      (item.customDesignDetails?.uploadedImages || []).map((img, i) => (
                        <div
                          key={i}
                          className="bg-slate-800 rounded-xl p-2.5 border border-slate-700 flex flex-col items-center text-center group"
                        >
                          <div className="w-full h-24 rounded-lg bg-black/40 p-1 flex items-center justify-center overflow-hidden mb-2">
                            <img
                              src={img.url}
                              alt={img.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-200 truncate w-full">
                            {img.name}
                          </span>
                          <a
                            href={img.url}
                            download={img.name || 'hh-custom-logo.png'}
                            className="mt-2 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>Download Original</span>
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Address & Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="space-y-2 text-xs">
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider">Delivery Destination</h5>
                  <p className="text-slate-700 font-semibold">{selectedOrder.customer.name}</p>
                  <p className="text-slate-600">{selectedOrder.customer.address}</p>
                  {selectedOrder.customer.landmark && (
                    <p className="text-slate-500">Landmark: {selectedOrder.customer.landmark}</p>
                  )}
                  <p className="text-slate-600">
                    {selectedOrder.customer.city} - {selectedOrder.customer.pincode}
                  </p>
                  <p className="text-slate-800 font-bold mt-1">Phone: {selectedOrder.customer.phone}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">₹{selectedOrder.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedOrder.deliveryCharge === 0 ? 'FREE' : `₹${selectedOrder.deliveryCharge}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                    <span>Total Amount:</span>
                    <span className="font-heading text-lg font-black text-cyan-800">
                      ₹{selectedOrder.totalAmount}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold pt-1">
                    Payment Status: {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">No Order Selected</h4>
              <p className="text-xs max-w-sm mx-auto">
                Select an order from the list or search using your Order ID to see real-time updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
