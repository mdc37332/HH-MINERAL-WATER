import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { DEFAULT_BOTTLE_IMAGE, STUDIO_BOTTLE_SVG_FALLBACK } from '../data/bottlePresets';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Image as ImageIcon,
  AlertCircle,
  Video,
  Package,
  Calendar
} from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartItemQty,
    setCartItemQty,
    removeFromCart,
    clearCart,
    cartSubtotal,
    deliveryFee,
    cartTotal,
    adminSettings,
    setCurrentSection
  } = useStore();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const invalidCustomItems = cart.filter(item => item.isCustomDesign && item.quantity < 600);
  const hasInvalidCustomItem = invalidCustomItems.length > 0;

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-300"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-[#000000] border-l border-[#222222] shadow-2xl flex flex-col justify-between text-white">
            {/* Header */}
            <div className="p-5 border-b border-[#222222] flex items-center justify-between bg-[#121212]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                <h3 className="font-heading text-lg font-black text-white">
                  Your Shopping Bag
                </h3>
                <span className="bg-[#1c1c1c] text-[#DFC283] border border-[#C5A059]/30 text-xs font-black px-2 py-0.5 rounded-full">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0a0a]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-[#C5A059]">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-heading text-base font-bold text-white">Your bag is empty</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                      Explore our pristine 250ml, 500ml, 1L, and 2L mineral bottles or customize your own brand.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCurrentSection('products');
                    }}
                    className="mt-2 text-xs font-bold text-[#DFC283] hover:text-white bg-[#181818] border border-[#C5A059]/30 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Browse Mineral Water Catalog →
                  </button>
                </div>
              ) : (
                cart.map(item => {
                  const itemTotal = item.unitPrice * item.quantity;
                  const isCustom = item.isCustomDesign;
                  const custom = item.customDesignDetails;

                  return (
                    <div
                      key={item.cartItemId}
                      className={`relative rounded-2xl border p-4 transition-all ${
                        isCustom
                          ? 'bg-[#141414] border-[#C5A059]/40 shadow-sm'
                          : 'bg-[#121212] border-[#222222] shadow-xs'
                      }`}
                    >
                      {/* Custom Badge */}
                      {isCustom && (
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#282828]">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#DFC283] bg-[#C5A059]/15 border border-[#C5A059]/30 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3 text-[#C5A059]" />
                            CUSTOM DESIGN ORDER
                          </span>
                          <span className="text-[11px] font-semibold text-neutral-400">
                            {custom?.eventType}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-3.5">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl bg-[#181818] border border-[#2a2a2a] overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                          <img
                            src={item.product.image || DEFAULT_BOTTLE_IMAGE}
                            alt={item.product.name}
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (target.src !== DEFAULT_BOTTLE_IMAGE) {
                                target.src = DEFAULT_BOTTLE_IMAGE;
                              } else {
                                target.src = STUDIO_BOTTLE_SVG_FALLBACK;
                              }
                            }}
                            className="max-h-full max-w-full object-contain"
                          />
                          {isCustom && custom?.uploadedImages && custom.uploadedImages.length > 0 && (
                            <div
                              className={`absolute bottom-0 right-0 w-5 h-5 rounded-tl-md flex items-center justify-center text-black font-black ${
                                custom.uploadedImages.some(img => img.mediaType === 'video' || img.type?.startsWith('video/'))
                                  ? 'bg-[#DFC283]'
                                  : 'bg-[#C5A059]'
                              }`}
                              title="Custom artwork attached"
                            >
                              <ImageIcon className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-white leading-tight">
                                {item.product.name}
                              </h4>
                              <p className="text-[11px] font-semibold text-[#DFC283] mt-0.5">
                                Size: {item.product.size}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.cartItemId)}
                              className="text-neutral-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Custom Specs Preview */}
                          {isCustom && custom && (
                            <div className="mt-1.5 text-[11px] text-neutral-300 bg-[#1a1a1a] rounded-lg p-1.5 border border-[#2c2c2c] space-y-1">
                              <p className="font-bold text-white truncate">
                                Brand: {custom.businessName}
                              </p>
                              {custom.eventDate ? (
                                <p className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Event: {new Date(custom.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (1-Wk Lead Time)</span>
                                </p>
                              ) : custom.dateOrVenue ? (
                                <p className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span className="truncate">Event: {custom.dateOrVenue}</span>
                                </p>
                              ) : null}
                              {custom.finishType && (
                                <p className="text-[10px] text-neutral-400">
                                  Finish: {custom.finishType}
                                </p>
                              )}
                              {custom.uploadedImages && custom.uploadedImages.length > 0 && (
                                <div className="text-[10px] space-y-0.5">
                                  {custom.uploadedImages.filter(i => i.mediaType !== 'video' && !i.type?.startsWith('video/')).length > 0 && (
                                    <p className="text-[#DFC283] font-semibold flex items-center gap-1">
                                      <span>✓ {custom.uploadedImages.filter(i => i.mediaType !== 'video' && !i.type?.startsWith('video/')).length} Artwork File(s)</span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Price & Quantity Controls */}
                          <div className="mt-3 pt-2 border-t border-[#222222] space-y-2">
                            {isCustom && item.quantity < 600 && (
                              <div className="p-2 bg-rose-950/40 border border-rose-800/60 rounded-lg flex items-center gap-1.5 text-[11px] text-rose-300 font-bold">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                                <span>Minimum custom design order is 600 pieces.</span>
                              </div>
                            )}

                            {/* Bottle Select Option for standard bottles (12, 24, 36, 48) */}
                            {!isCustom && (
                              <div className="space-y-1 bg-[#121212] p-1.5 rounded-lg border border-[#252525]">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Package className="w-2.5 h-2.5 text-[#C5A059]" /> Select Bottles:
                                  </span>
                                  <span className="text-[#DFC283] font-bold">
                                    {item.quantity} Pieces
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                  {[12, 24, 36, 48].map(pieces => {
                                    const isSelected = item.quantity === pieces;
                                    const packPrice = pieces * item.unitPrice;
                                    return (
                                      <button
                                        key={pieces}
                                        type="button"
                                        onClick={() => setCartItemQty(item.cartItemId, pieces)}
                                        className={`py-1 px-1 rounded-md text-[10px] font-black transition-all cursor-pointer text-center border ${
                                          isSelected
                                            ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black border-[#DFC283] shadow-xs'
                                            : 'bg-[#1a1a1a] hover:bg-[#242424] text-neutral-300 border-[#2d2d2d]'
                                        }`}
                                        title={`${pieces} Bottles (₹${packPrice})`}
                                      >
                                        <span className="block leading-none font-bold">{pieces} pcs</span>
                                        <span className={`block text-[8px] mt-0.5 ${isSelected ? 'text-black/80 font-bold' : 'text-neutral-400'}`}>
                                          ₹{packPrice}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center bg-[#181818] rounded-lg p-0.5 border border-[#2a2a2a]">
                                  <button
                                    onClick={() => {
                                      if (isCustom) {
                                        if (item.quantity <= 600) {
                                          removeFromCart(item.cartItemId);
                                        } else {
                                          const step = item.quantity > 5000 ? 500 : item.quantity > 1000 ? 100 : item.quantity > 600 ? 10 : 1;
                                          updateCartItemQty(item.cartItemId, -step);
                                        }
                                      } else {
                                        if (item.quantity <= 12) {
                                          removeFromCart(item.cartItemId);
                                        } else {
                                          updateCartItemQty(item.cartItemId, -12);
                                        }
                                      }
                                    }}
                                    className="w-6 h-6 rounded bg-[#222222] text-white hover:bg-[#303030] flex items-center justify-center font-bold text-xs cursor-pointer"
                                    title={isCustom ? (item.quantity <= 600 ? "Remove from cart" : "Reduce quantity") : "Reduce 12 bottles"}
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>

                                  {isCustom ? (
                                    <input
                                      type="number"
                                      min={600}
                                      value={item.quantity === 0 ? '' : item.quantity}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val)) {
                                          setCartItemQty(item.cartItemId, val);
                                        }
                                      }}
                                      className="w-16 px-1 text-center text-xs font-black text-white bg-transparent border-0 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="px-2 text-center text-xs font-black text-[#DFC283]">
                                      {item.quantity} pcs
                                    </span>
                                  )}

                                  <button
                                    onClick={() => {
                                      const step = isCustom ? (item.quantity >= 5000 ? 500 : item.quantity >= 1000 ? 100 : 50) : 12;
                                      updateCartItemQty(item.cartItemId, step);
                                    }}
                                    className="w-6 h-6 rounded bg-[#222222] text-white hover:bg-[#303030] flex items-center justify-center font-bold text-xs cursor-pointer"
                                    title={isCustom ? "Add bottles" : "Add 12 bottles"}
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                                  {isCustom
                                    ? `${item.quantity.toLocaleString('en-IN')} Custom Bottles (Min 600 pcs)`
                                    : `${item.quantity} bottles • ₹${item.unitPrice}/bottle`}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-heading text-sm font-bold text-[#DFC283] block">
                                  ₹{itemTotal.toLocaleString('en-IN')}
                                </span>
                                {!isCustom && item.product.mrp && item.product.mrp > item.unitPrice && (
                                  <div className="flex items-center justify-end gap-1 mt-0.5">
                                    <span className="text-[10px] text-neutral-500 line-through">
                                      ₹{(item.product.mrp * item.quantity).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/70 border border-emerald-700/50 px-1 rounded">
                                      {Math.round(((item.product.mrp - item.unitPrice) / item.product.mrp) * 100)}% OFF
                                    </span>
                                  </div>
                                )}
                                <span className="text-[10px] text-neutral-400 block mt-0.5">
                                  (₹{item.unitPrice}/bottle{isCustom ? ' • 2× rate' : ''})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-[#222222] bg-[#121212] space-y-3">
                {/* Free Delivery Bar */}
                {cartSubtotal < adminSettings.freeDeliveryMinAmount ? (
                  <div className="text-xs text-neutral-300 bg-[#181818] border border-[#2a2a2a] p-2.5 rounded-xl flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#C5A059] shrink-0" />
                    <span>
                      Add <strong className="text-[#DFC283]">₹{adminSettings.freeDeliveryMinAmount - cartSubtotal}</strong> more for <strong>FREE Delivery</strong>!
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[#DFC283] bg-[#C5A059]/10 border border-[#C5A059]/30 p-2 rounded-xl flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                    <span>You qualify for complimentary White Glove Delivery.</span>
                  </div>
                )}

                {hasInvalidCustomItem && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Minimum custom design order is 600 pieces. Please increase quantity to checkout.</span>
                  </div>
                )}

                {/* Pricing Calculation */}
                <div className="space-y-1.5 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-white">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="font-bold text-white">
                      {deliveryFee === 0 ? <span className="text-[#DFC283]">FREE</span> : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[#222222] font-bold text-white">
                    <span>Grand Total</span>
                    <span className="font-heading text-xl font-black text-[#DFC283]">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  disabled={hasInvalidCustomItem}
                  onClick={() => setIsCheckoutOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm shadow-xl transition-all cursor-pointer ${
                    hasInvalidCustomItem
                      ? 'bg-[#222222] text-neutral-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black shadow-[#C5A059]/20 active:scale-95'
                  }`}
                >
                  <span>{hasInvalidCustomItem ? 'Minimum 600 Pieces Required for Custom Design' : 'Proceed to Checkout'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
          }}
        />
      )}
    </>
  );
};
