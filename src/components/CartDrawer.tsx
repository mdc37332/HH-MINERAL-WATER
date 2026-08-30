import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
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
  AlertCircle
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
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-cyan-600" />
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Your Shopping Bag
                </h3>
                <span className="bg-cyan-100 text-cyan-800 text-xs font-extrabold px-2 py-0.5 rounded-full">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-heading text-base font-bold text-slate-700">Your bag is empty</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Explore our pristine 250ml, 500ml, 1L, and 2L mineral bottles or customize your own brand.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCurrentSection('products');
                    }}
                    className="mt-2 text-xs font-bold text-cyan-600 hover:text-cyan-800 bg-cyan-50 px-4 py-2 rounded-xl"
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
                          ? 'bg-sky-50/50 border-cyan-300 shadow-xs'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Custom Badge */}
                      {isCustom && (
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-200/60">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-800 bg-cyan-100/90 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3 text-cyan-600" />
                            CUSTOM DESIGN ORDER
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {custom?.eventType}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-3.5">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                          {isCustom && custom?.uploadedImages && custom.uploadedImages.length > 0 && (
                            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-md bg-cyan-600 flex items-center justify-center text-white" title="Custom artwork attached">
                              <ImageIcon className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                {item.product.name}
                              </h4>
                              <p className="text-[11px] font-semibold text-cyan-700 mt-0.5">
                                Size: {item.product.size}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.cartItemId)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Custom Specs Preview */}
                          {isCustom && custom && (
                            <div className="mt-1.5 text-[11px] text-slate-600 bg-white/70 rounded-lg p-1.5 border border-cyan-200/50 space-y-0.5">
                              <p className="font-bold text-slate-800 truncate">
                                Brand: {custom.businessName}
                              </p>
                              {custom.finishType && (
                                <p className="text-[10px] text-slate-500">
                                  Finish: {custom.finishType}
                                </p>
                              )}
                              {custom.uploadedImages && custom.uploadedImages.length > 0 && (
                                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                  <span>✓ {custom.uploadedImages.length} Original Image(s) Attached</span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Price & Quantity Controls */}
                          <div className="mt-3 pt-2 border-t border-slate-100 space-y-2">
                            {isCustom && item.quantity < 600 && (
                              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-[11px] text-rose-700 font-bold">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                <span>Minimum custom design order is 600 pieces.</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
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
                                    className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    title={isCustom ? (item.quantity <= 600 ? "Remove from cart" : "Reduce quantity") : "Reduce 12 bottles (1 pack)"}
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
                                      className="w-16 px-1 text-center text-xs font-black text-slate-900 bg-transparent border-0 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="px-2 text-center text-xs font-black text-slate-900">
                                      {item.quantity.toLocaleString('en-IN')} pcs
                                    </span>
                                  )}

                                  <button
                                    onClick={() => {
                                      const step = isCustom ? (item.quantity >= 5000 ? 500 : item.quantity >= 1000 ? 100 : 50) : 12;
                                      updateCartItemQty(item.cartItemId, step);
                                    }}
                                    className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
                                    title={isCustom ? "Add bottles" : "Add 12 bottles (1 pack)"}
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-cyan-800 font-semibold block mt-0.5">
                                  {isCustom
                                    ? `${item.quantity.toLocaleString('en-IN')} Custom Bottles (Min 600 pcs)`
                                    : `${Math.ceil(item.quantity / 12)} × 12-pack bundle`}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-heading text-sm font-bold text-slate-900">
                                  ₹{itemTotal.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
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
              <div className="p-5 border-t border-slate-200 bg-slate-50/80 space-y-3">
                {/* Free Delivery Bar */}
                {cartSubtotal < adminSettings.freeDeliveryMinAmount ? (
                  <div className="text-xs text-slate-600 bg-cyan-50 border border-cyan-200 p-2.5 rounded-xl flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>
                      Add <strong>₹{adminSettings.freeDeliveryMinAmount - cartSubtotal}</strong> more for <strong>FREE Local Delivery</strong>!
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Congratulations! You qualify for FREE Delivery.</span>
                  </div>
                )}

                {hasInvalidCustomItem && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Minimum custom design order is 600 pieces. Please increase quantity to checkout.</span>
                  </div>
                )}

                {/* Pricing Calculation */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800">₹{cartSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="font-bold text-slate-800">
                      {deliveryFee === 0 ? <span className="text-emerald-600">FREE</span> : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Grand Total</span>
                    <span className="font-heading text-xl font-black text-cyan-700">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  disabled={hasInvalidCustomItem}
                  onClick={() => setIsCheckoutOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg transition-all ${
                    hasInvalidCustomItem
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-cyan-600/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  <span>{hasInvalidCustomItem ? 'Minimum 600 Pieces Required for Custom Design' : 'Proceed to Checkout'}</span>
                  <ArrowRight className="w-4 h-4" />
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
