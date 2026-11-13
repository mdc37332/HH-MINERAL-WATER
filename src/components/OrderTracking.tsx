import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  FileDown,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  User,
  Eye,
  X,
  Copy,
  Check,
  Receipt,
  FileText,
  Video,
  Play,
  Search
} from 'lucide-react';
import { OrderDeliveryRouteMap } from './OrderDeliveryRouteMap';

export const OrderTracking: React.FC = () => {
  const {
    orders,
    myOrders,
    currentUser,
    openAuthModal,
    trackOrderId,
    setTrackOrderId,
    showToast,
    openInvoiceForOrder
  } = useStore();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const statusPipeline: OrderStatus[] = [
    'New',
    'Confirmed',
    'Processing',
    'Ready',
    'Out for Delivery',
    'Delivered'
  ];

  const [searchQuery, setSearchQuery] = useState('');

  // List of orders to display in the sidebar
  const sourceOrders = currentUser ? myOrders : orders;
  const displayedOrders = sourceOrders.filter(ord => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      ord.id.toLowerCase().includes(q) ||
      (ord.customer?.name || '').toLowerCase().includes(q) ||
      (ord.customer?.phone || '').includes(q) ||
      (ord.invoiceNumber || '').toLowerCase().includes(q)
    );
  });

  // Auto select if trackOrderId set or default to first
  useEffect(() => {
    if (trackOrderId && orders.length > 0) {
      const match = orders.find(o => o.id.toLowerCase() === trackOrderId.toLowerCase());
      if (match) {
        setSelectedOrder(match);
      }
    } else if (displayedOrders.length > 0 && !selectedOrder) {
      setSelectedOrder(displayedOrders[0]);
    }
  }, [trackOrderId, orders, displayedOrders]);

  const getStatusIndex = (current: OrderStatus) => {
    if (current === 'Cancelled' || current === 'Failed') return -1;
    return statusPipeline.indexOf(current);
  };

  const handlePrintReceipt = () => {
    if (selectedOrder) {
      openInvoiceForOrder(selectedOrder);
    }
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    showToast('Copied', `Order ID ${id} copied to clipboard.`, 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {currentUser ? 'My Orders & ' : 'Track Your '}
          <span className="gold-gradient-text">Water Order</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400">
          Monitor your water bottles dispatch status, custom label printing, and live fulfillment in real-time.
        </p>

        {/* Not Logged In Banner */}
        {!currentUser && (
          <div className="mt-4 p-3 bg-[#161616] border border-[#C5A059]/30 rounded-2xl flex items-center justify-between text-xs text-neutral-300 max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>Sign in to view your complete personal order history.</span>
            </div>
            <button
              onClick={() => openAuthModal('login', 'Sign in to access your complete personal order history.')}
              className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black px-3.5 py-1.5 rounded-xl cursor-pointer shrink-0 ml-2"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Active View Indicator */}
        {currentUser && (
          <div className="mt-6 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#161616] rounded-2xl border border-[#2a2a2a] text-xs font-bold text-[#DFC283]">
              <Package className="w-4 h-4 text-[#C5A059]" />
              <span>My Orders ({myOrders.length})</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Orders list sidebar + Order Detail card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Orders List (4 cols) */}
        <div className="lg:col-span-4 bg-[#121212] rounded-3xl border border-[#262626] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <h3 className="font-heading text-sm font-bold text-white flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#C5A059]" />
              <span>
                {currentUser ? 'My Order History' : 'All Recent Orders'} ({displayedOrders.length})
              </span>
            </h3>
            <span className="text-[10px] text-[#DFC283]">Live Sync</span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, name, or phone..."
              className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#C5A059] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedOrders.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs space-y-2">
                <Package className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="font-semibold text-neutral-400">No orders found.</p>
                {currentUser && (
                  <p className="text-[11px] text-neutral-500">
                    Place your first bottled water or custom label order!
                  </p>
                )}
              </div>
            ) : (
              displayedOrders.map(ord => {
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
                        ? 'border-[#C5A059] bg-[#1a1710] shadow-sm ring-1 ring-[#C5A059]/40'
                        : 'border-[#262626] hover:border-[#383838] bg-[#161616]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">{ord.id}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          ord.status === 'Delivered'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                            : ord.status === 'Cancelled' || ord.status === 'Failed'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                            : 'bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-300">
                      <span className="font-semibold truncate max-w-[140px]">{ord.customer.name}</span>
                      <span className="font-bold text-[#DFC283]">₹{ord.totalAmount}</span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1.5">
                        {ord.hasOriginalImage && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" />
                            Image
                          </span>
                        )}
                        {ord.isCustomOrder && (
                          <span className="text-[10px] text-[#DFC283] font-bold bg-[#C5A059]/15 border border-[#C5A059]/30 px-1.5 py-0.2 rounded">
                            Custom
                          </span>
                        )}
                      </div>
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
            <div className="bg-[#121212] rounded-3xl border border-[#262626] shadow-xl overflow-hidden p-6 sm:p-8 space-y-8">
              {/* Order Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-xl text-white flex items-center gap-2">
                      <span>{selectedOrder.id}</span>
                      <button
                        onClick={() => handleCopyOrderId(selectedOrder.id)}
                        className="text-neutral-400 hover:text-white cursor-pointer"
                        title="Copy Order ID"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </span>
                    {selectedOrder.isCustomOrder && (
                      <span className="text-xs font-black bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-black" />
                        CUSTOM DESIGN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()} • Payment: {selectedOrder.paymentMethod}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id={`btn-track-print-invoice-${selectedOrder.id}`}
                    onClick={() => openInvoiceForOrder(selectedOrder, true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black text-xs font-black shadow-xs transition-colors cursor-pointer"
                    title="Print Official GST Tax Invoice"
                  >
                    <Printer className="w-3.5 h-3.5 text-black" />
                    <span>Print Invoice</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-track-view-invoice-${selectedOrder.id}`}
                    onClick={() => openInvoiceForOrder(selectedOrder, false)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e1e1e] hover:bg-[#282828] border border-[#383838] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>View GST Tax Invoice</span>
                  </button>
                </div>
              </div>

              {/* Status Timeline Stepper */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-6">
                  Order Progression Status
                </h4>

                {selectedOrder.status === 'Cancelled' || selectedOrder.status === 'Failed' ? (
                  <div className="bg-rose-950/40 border border-rose-800/50 rounded-2xl p-4 flex items-center gap-3 text-rose-300">
                    <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    <div>
                      <h5 className="font-bold text-sm">Order Status: {selectedOrder.status}</h5>
                      <p className="text-xs mt-0.5 text-rose-300/80">This order was marked as {selectedOrder.status.toLowerCase()}. Please contact HH Support at 8017341130 for assistance.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
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
                                ? 'bg-[#1b1812] border-[#C5A059] ring-2 ring-[#C5A059]/40 shadow-xs'
                                : isPast
                                ? 'bg-[#161616] border-[#2e2e2e] text-neutral-200'
                                : 'bg-[#141414] border-[#222222] opacity-40'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 shadow-2xs ${
                                isCurrent
                                  ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-black animate-pulse'
                                  : isPast
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#222222] text-neutral-500'
                              }`}
                            >
                              {isPast && !isCurrent ? '✓' : idx + 1}
                            </div>
                            <span className="text-xs font-bold text-white leading-tight">
                              {step}
                            </span>
                            <span className="text-[10px] text-neutral-400 mt-1">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Products in this Order
                </h4>

                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        item.isCustomDesign
                          ? 'bg-[#171510] border-[#C5A059]/40'
                          : 'bg-[#161616] border-[#262626]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl bg-[#1b1b1b] border border-[#333333] p-1 flex items-center justify-center shrink-0">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-white">{item.product.name}</h5>
                            <span className="text-xs font-semibold text-[#DFC283] bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333333]">
                              {item.product.size}
                            </span>
                          </div>

                          {item.isCustomDesign && item.customDesignDetails && (
                            <div className="mt-1 text-xs text-neutral-300 flex flex-wrap items-center gap-2">
                              <span className="font-bold text-[#DFC283]">
                                Custom Branding: "{item.customDesignDetails.businessName}"
                              </span>
                              <span>•</span>
                              <span>{item.customDesignDetails.finishType}</span>
                              {item.customDesignDetails.uploadedImages?.length > 0 && (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                                  {item.customDesignDetails.uploadedImages.length} Artwork file(s) attached
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-neutral-400 block">
                          ₹{item.unitPrice} × {item.quantity.toLocaleString('en-IN')} Pieces
                        </span>
                        <span className="font-heading text-base font-bold gold-gradient-text">
                          ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploaded Original Images & Video Files Section (If custom) */}
              {(selectedOrder.hasOriginalImage || selectedOrder.hasUploadedVideo || selectedOrder.items.some(i => i.customDesignDetails?.uploadedImages && i.customDesignDetails.uploadedImages.length > 0)) && (
                <div className="bg-[#141414] text-white rounded-2xl p-5 border border-[#282828] space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#DFC283] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#C5A059]" />
                      Original Uploaded Customer Artwork & Video Files
                    </h5>
                    <span className="text-[10px] text-neutral-400">High-Resolution Preserved for Factory Production</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedOrder.items.flatMap(item =>
                      (item.customDesignDetails?.uploadedImages || []).map((media, i) => {
                        const isVideo = media.mediaType === 'video' || media.type?.startsWith('video/');
                        return (
                          <div
                            key={i}
                            className={`rounded-xl p-2.5 border flex flex-col items-center text-center group ${
                              isVideo ? 'bg-purple-950/40 border-purple-800/80' : 'bg-[#181818] border-[#2e2e2e]'
                            }`}
                          >
                            <div
                              onClick={() => {
                                if (isVideo) {
                                  setPreviewVideo({ url: media.url, name: media.name });
                                } else {
                                  setPreviewImage({ url: media.url, name: media.name });
                                }
                              }}
                              className="w-full h-24 rounded-lg bg-black/60 p-1 flex items-center justify-center overflow-hidden mb-2 cursor-pointer hover:opacity-90 relative"
                            >
                              {isVideo ? (
                                media.thumbnailUrl ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={media.thumbnailUrl}
                                      alt={media.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
                                      <Play className="w-6 h-6 text-white fill-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-purple-300">
                                    <Video className="w-8 h-8" />
                                    <span className="text-[9px] uppercase font-bold tracking-wider mt-1">Play Video</span>
                                  </div>
                                )
                              ) : (
                                <img
                                  src={media.url}
                                  alt={media.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                {isVideo ? <Play className="w-5 h-5 text-white fill-white" /> : <Eye className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-neutral-200 truncate w-full">
                              {media.name}
                            </span>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isVideo) {
                                    setPreviewVideo({ url: media.url, name: media.name });
                                  } else {
                                    setPreviewImage({ url: media.url, name: media.name });
                                  }
                                }}
                                className={`text-[10px] font-bold flex items-center gap-0.5 cursor-pointer ${
                                  isVideo ? 'text-purple-300 hover:text-white' : 'text-[#DFC283] hover:text-white'
                                }`}
                              >
                                {isVideo ? <Play className="w-3 h-3 fill-current" /> : <Eye className="w-3 h-3" />}
                                <span>{isVideo ? 'Play' : 'View'}</span>
                              </button>
                              <span className="text-neutral-600">•</span>
                              <a
                                href={media.url}
                                download={media.name || (isVideo ? 'bottle-custom-video.mp4' : 'hh-custom-logo.png')}
                                className="text-[10px] font-bold text-[#DFC283] hover:text-white flex items-center gap-0.5"
                              >
                                <FileDown className="w-3 h-3" />
                                <span>Save</span>
                              </a>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Address & Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#262626]">
                <div className="space-y-2 text-xs">
                  <h5 className="font-bold text-[#DFC283] uppercase tracking-wider">Delivery Destination</h5>
                  <p className="text-white font-semibold">{selectedOrder.customer.name}</p>
                  <p className="text-neutral-300">{selectedOrder.customer.address}</p>
                  {selectedOrder.customer.landmark && (
                    <p className="text-neutral-400">Landmark: {selectedOrder.customer.landmark}</p>
                  )}
                  <p className="text-neutral-300">
                    {selectedOrder.customer.city} - {selectedOrder.customer.pincode}
                  </p>
                  <p className="text-[#DFC283] font-bold mt-1">Phone: {selectedOrder.customer.phone}</p>
                  {selectedOrder.customer.email && (
                    <p className="text-neutral-400">Email: {selectedOrder.customer.email}</p>
                  )}
                </div>

                <div className="bg-[#161616] rounded-2xl p-4 border border-[#282828] space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold text-neutral-200">₹{selectedOrder.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Delivery Fee:</span>
                    <span className="font-semibold text-neutral-200">
                      {selectedOrder.deliveryCharge === 0 ? 'FREE' : `₹${selectedOrder.deliveryCharge}`}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#262626] font-bold text-white text-sm">
                    <div>
                      <span>Total Amount:</span>
                      <span className="block text-[10px] text-neutral-400 font-normal">Incl. 18% GST</span>
                    </div>
                    <span className="font-heading text-lg font-black gold-gradient-text">
                      ₹{selectedOrder.totalAmount}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                    Payment: {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})
                  </div>
                </div>
              </div>

              {/* Google Maps Route to Customer Location */}
              <OrderDeliveryRouteMap order={selectedOrder} />
            </div>
          ) : (
            <div className="bg-[#121212] rounded-3xl border border-[#262626] p-12 text-center text-neutral-500 space-y-3">
              <Package className="w-12 h-12 text-neutral-600 mx-auto" />
              <h4 className="font-bold text-white">No Order Selected</h4>
              <p className="text-xs max-w-sm mx-auto text-neutral-400">
                Select an order from the list or search using your Order ID to see real-time updates.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Original Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-[#141414] rounded-3xl overflow-hidden border border-[#2a2a2a] shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between text-white border-b border-[#262626] pb-3">
              <span className="text-xs font-bold truncate max-w-md">{previewImage.name}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-hidden flex items-center justify-center bg-black/50 rounded-2xl p-2">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <a
                href={previewImage.url}
                download={previewImage.name}
                className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-black" />
                <span>Download High-Res Original</span>
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Original Video Preview */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-[#141414] rounded-3xl overflow-hidden border border-[#2a2a2a] shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between text-white border-b border-[#262626] pb-3">
              <div className="flex items-center gap-2 truncate max-w-md">
                <Video className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold truncate">{previewVideo.name}</span>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-hidden flex items-center justify-center bg-black rounded-2xl p-2">
              <video
                src={previewVideo.url}
                controls
                autoPlay
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <a
                href={previewVideo.url}
                download={previewVideo.name || 'custom-bottle-video.mp4'}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                <span>Download Video Clip</span>
              </a>
              <button
                onClick={() => setPreviewVideo(null)}
                className="bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Close Video Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
