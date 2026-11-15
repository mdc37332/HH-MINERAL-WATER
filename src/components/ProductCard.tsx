import React, { useState } from 'react';
import { Product } from '../types';
import { useStore, isProductSellingPriceActive, isProductVisibleInStore } from '../context/StoreContext';
import {
  ShoppingBag,
  Zap,
  Info,
  Check,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  Droplet,
  Package,
  Pause,
  RotateCw,
  Edit3,
  Camera,
  Percent,
  Eye,
  EyeOff
} from 'lucide-react';
import { AdminBottleImageModal } from './admin/AdminBottleImageModal';
import {
  DEFAULT_BOTTLE_IMAGE,
  STUDIO_BOTTLE_SVG_FALLBACK,
  isDeadOrDoctorImage
} from '../data/bottlePresets';

interface Props {
  product: Product;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const ProductCard: React.FC<Props> = ({ product, isSelected = false, onToggleSelect }) => {
  const {
    addToCart,
    setSelectedProductForDetail,
    setSelectedProductForCustom,
    setCurrentSection,
    setIsCartOpen,
    isAdminUnlocked,
    isFactoryStaffUnlocked,
    adminSettings,
    updateProduct,
    toggleProductVisibility
  } = useStore();

  const isAdmin = Boolean(isAdminUnlocked && !isFactoryStaffUnlocked);
  const isSellingPriceActive = isProductSellingPriceActive(product, adminSettings);
  const isProductShown = isProductVisibleInStore(product, adminSettings);

  const handleAdminToggleSellingPrice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const nextActive = !isSellingPriceActive;
    const existingTags = Array.isArray(product.tags) ? [...product.tags] : [];
    let nextTags: string[];
    if (nextActive) {
      nextTags = existingTags.filter(t => t !== 'selling_price_off');
    } else {
      nextTags = existingTags.includes('selling_price_off') ? existingTags : [...existingTags, 'selling_price_off'];
    }
    await updateProduct({
      ...product,
      showSellingPrice: nextActive,
      tags: nextTags,
    });
  };

  const [isBottleModalOpen, setIsBottleModalOpen] = useState(false);

  // 12, 24, 36, and 48 are bottle piece options in 1 QTY (calculating bottle price accordingly)
  const [selectedPieces, setSelectedPieces] = useState<number>(12);
  const [qty, setQty] = useState<number>(1);
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  // Effective price per bottle: if selling price is OFF, use standard MRP
  const unitPrice = isSellingPriceActive ? (product.price || 0) : (product.mrp || product.price || 0);
  const totalBottles = selectedPieces * qty;
  const totalAmount = unitPrice * totalBottles;
  const mrpPerBottle = product.mrp || unitPrice;
  const totalMrp = mrpPerBottle * totalBottles;
  const totalSavings = Math.max(0, totalMrp - totalAmount);
  const discountPercent = (isSellingPriceActive && mrpPerBottle > unitPrice)
    ? Math.round(((mrpPerBottle - unitPrice) / mrpPerBottle) * 100)
    : 0;
  const showDiscountBadge = (adminSettings?.showDiscountPercentage !== false) && isSellingPriceActive && discountPercent > 0;

  const [imageError, setImageError] = useState(false);
  const isOutOfStock = product.inStock === false || product.stockStatus === 'Out of Stock';

  const defaultPlaceholder = DEFAULT_BOTTLE_IMAGE;
  const svgFallback = STUDIO_BOTTLE_SVG_FALLBACK;

  const productImages = React.useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const filtered = product.images.filter(img => Boolean(img && img.trim()));
      if (filtered.length > 0) return filtered;
    }
    return product.image ? [product.image] : [defaultPlaceholder];
  }, [product.images, product.image, defaultPlaceholder]);

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isSpinningReel, setIsSpinningReel] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const activeImage = productImages[activeImgIndex] || productImages[0] || defaultPlaceholder;

  // Reset image error state whenever product data or active image index updates
  React.useEffect(() => {
    setImageError(false);
  }, [product.id, product.image, activeImgIndex]);

  // Auto 360 view cycle effect when 360 spin is enabled or during card hover when multiple images exist
  React.useEffect(() => {
    if ((!isSpinningReel && !isCardHovered) || productImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % productImages.length);
    }, isSpinningReel ? 700 : 900);
    return () => clearInterval(interval);
  }, [isSpinningReel, isCardHovered, productImages.length]);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, totalBottles);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, totalBottles);
    setIsCartOpen(true);
  };

  const handleCustomDesignThisBottle = () => {
    setSelectedProductForCustom(product);
    setCurrentSection('custom-design');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`group relative bg-[#121212] rounded-3xl border ${
      isAdmin && !isProductShown
        ? 'border-rose-500/50 opacity-75 ring-1 ring-rose-500/20'
        : isSelected
        ? 'border-[#C5A059] ring-2 ring-[#C5A059]/30 shadow-xl shadow-[#C5A059]/10'
        : isOutOfStock
        ? 'border-[#222222] opacity-80'
        : 'border-[#262626] hover:border-[#C5A059]/50 shadow-xl hover:shadow-[#C5A059]/10 hover:-translate-y-1'
    } transition-all duration-300 flex flex-col overflow-hidden`}>
      {/* Top Badges & Size Tag */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="px-3 py-1 bg-[#000000]/90 backdrop-blur-md text-[#DFC283] border border-[#C5A059]/40 text-xs font-bold rounded-full shadow-md tracking-wide">
            {product.size}
          </span>
          {showDiscountBadge && (
            <span className="px-2.5 py-1 bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 text-[10px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1 backdrop-blur-md">
              <Percent className="w-2.5 h-2.5 text-emerald-400" />
              {discountPercent}% OFF
            </span>
          )}
        </div>
        {isOutOfStock ? (
          <span className="px-2.5 py-1 bg-rose-900/90 text-rose-200 border border-rose-700/60 text-[10px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
            Out of Stock
          </span>
        ) : product.badge ? (
          <span className="px-2.5 py-1 bg-[#181818]/95 text-[#DFC283] text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1 border border-[#C5A059]/40">
            <Sparkles className="w-3 h-3 text-[#C5A059]" />
            {product.badge}
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-[#181818]/95 text-neutral-300 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1 border border-[#333333]">
            <Droplet className="w-3 h-3 text-[#C5A059]" />
            Natural Mineral
          </span>
        )}
      </div>

      {/* Product Image Stage (Vertical Bottle Showcase with Video-Like Motion) */}
      <div
        onClick={() => setSelectedProductForDetail(product)}
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
        className="relative h-72 sm:h-80 w-full bg-gradient-to-b from-[#181818] via-[#141414] to-[#121212] border-b border-[#222222] flex items-center justify-center p-4 cursor-pointer overflow-hidden group-hover:bg-[#191919] transition-colors"
      >
        {/* Vertical Multiple Images Thumbnail Strip */}
        {productImages.length > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-1 bg-black/75 backdrop-blur-md rounded-xl border border-white/10 max-h-[82%] overflow-y-auto scrollbar-none shadow-xl"
          >
            {productImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImgIndex(idx)}
                onMouseEnter={() => setActiveImgIndex(idx)}
                className={`w-6 h-9 rounded-md overflow-hidden border transition-all cursor-pointer bg-[#181818] p-0.5 flex items-center justify-center shrink-0 ${
                  activeImgIndex === idx
                    ? 'border-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.6)] scale-105 ring-1 ring-[#C5A059]'
                    : 'border-[#333333] opacity-60 hover:opacity-100 hover:border-neutral-400'
                }`}
                title={`View image ${idx + 1} of ${productImages.length}`}
              >
                <img
                  src={imgUrl}
                  alt={`${product.name} view ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== defaultPlaceholder && !target.src.startsWith('data:image/svg')) {
                      target.src = defaultPlaceholder;
                    } else {
                      target.src = svgFallback;
                    }
                  }}
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}

        {/* Quick Admin Bottle Edit & Selective Visibility Controls - Visible ONLY to Owner Admin */}
        {isAdmin && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-12 left-3 z-30 flex flex-col items-start gap-1.5"
          >
            <div className="flex items-center gap-1.5">
              {onToggleSelect && (
                <button
                  type="button"
                  onClick={() => onToggleSelect(product.id)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md ${
                    isSelected
                      ? 'bg-[#C5A059] border-[#DFC283] text-black'
                      : 'bg-[#121212]/90 border-[#C5A059]/50 text-neutral-300 hover:border-[#C5A059]'
                  }`}
                  title={isSelected ? 'Deselect product for batch visibility' : 'Select product for batch visibility'}
                  aria-label={isSelected ? 'Deselect product' : 'Select product'}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsBottleModalOpen(true)}
                className="bg-[#121212]/95 hover:bg-[#C5A059] hover:text-black border border-[#C5A059] text-[#DFC283] px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
                title={`Change or upload bottle image for ${product.name} (Admin)`}
              >
                <Edit3 className="w-3 h-3 text-[#C5A059]" />
                <span>Edit Bottle</span>
              </button>
            </div>

            <button
              type="button"
              id={`catalog-toggle-visibility-${product.id}`}
              onClick={() => toggleProductVisibility(product.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black shadow-lg backdrop-blur-md flex items-center gap-1.5 border transition-all cursor-pointer ${
                isProductShown
                  ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border-emerald-500/60'
                  : 'bg-rose-950/95 hover:bg-rose-900 text-rose-200 border-rose-500/70'
              }`}
              title={isProductShown ? 'Admin: Currently SHOW to customers. Click to set NOT SHOW.' : 'Admin: Currently NOT SHOW (Hidden from customers). Click to set SHOW.'}
            >
              {isProductShown ? (
                <>
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>SHOW</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 text-rose-400" />
                  <span>NOT SHOW</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 360° Photo Turntable Toggle (if multi-angle images exist) */}
        {productImages.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSpinningReel(!isSpinningReel);
            }}
            className={`absolute top-12 right-3 z-20 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              isSpinningReel
                ? 'bg-[#C5A059] text-black border-[#DFC283] shadow-[#C5A059]/40'
                : 'bg-black/80 text-[#DFC283] border-[#C5A059]/40 hover:bg-[#1f1f1f]'
            }`}
            title={isSpinningReel ? 'Pause 360° view spin' : 'Auto 360° view spin'}
          >
            {isSpinningReel ? (
              <>
                <Pause className="w-2.5 h-2.5 text-black" />
                <span>360° Spin ON</span>
              </>
            ) : (
              <>
                <RotateCw className="w-2.5 h-2.5 text-[#DFC283]" />
                <span>360° View ({productImages.length})</span>
              </>
            )}
          </button>
        )}

        {/* Main Vertical Bottle Showcase */}
        <div className="relative w-full h-full flex items-center justify-center py-2 z-0">
          {/* Subtle Concentric Water Ripple Base */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none w-48 h-10 flex items-center justify-center opacity-40">
            <div className="absolute w-28 h-28 rounded-full border border-[#C5A059]/30" />
            <div className="w-20 h-4 bg-[#C5A059]/15 rounded-full blur-xs" />
          </div>

          <div className="relative h-full w-full flex items-center justify-center">
            <img
              src={imageError ? defaultPlaceholder : (activeImage || defaultPlaceholder)}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                setImageError(true);
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== defaultPlaceholder && !target.src.startsWith('data:image/svg')) {
                  target.src = defaultPlaceholder;
                } else {
                  target.src = svgFallback;
                }
              }}
              className="h-full w-auto max-w-[85%] object-contain filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        </div>
        
        {/* Quick View Button on Hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProductForDetail(product);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/95 backdrop-blur-md hover:bg-[#242424] text-neutral-200 hover:text-[#DFC283] text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg border border-[#C5A059]/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 cursor-pointer z-10"
        >
          <Info className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Vertical View & Specs</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Mineral pill indicators */}
          <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 bg-[#181818] px-2 py-0.5 rounded-md border border-[#C5A059]/30 text-[#DFC283]">
              <Droplet className="w-3 h-3 text-[#C5A059]" />
              pH {String(product.mineralInfo?.ph || '7.4').split(' ')[0]}
            </span>
            <span className="bg-[#181818] px-2 py-0.5 rounded-md border border-[#2a2a2a] text-neutral-300">
              TDS {String(product.mineralInfo?.tds || '120').split(' ')[0]}
            </span>
            <span className="hidden sm:inline bg-[#181818] px-2 py-0.5 rounded-md border border-[#2a2a2a] text-[#C5A059]">
              7-Stage UV
            </span>
          </div>

          <h3
            onClick={() => setSelectedProductForDetail(product)}
            className="font-heading text-base sm:text-lg font-bold text-white group-hover:text-[#DFC283] transition-colors cursor-pointer leading-snug"
          >
            {product.name}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
            {product.shortDesc}
          </p>
        </div>

        {/* Bottle Select Option: 12, 24, 36, 48 Pieces */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3 h-3 text-[#C5A059]" /> Select Bottles:
            </span>
            <span className="text-[#DFC283] font-bold">
              {selectedPieces} Pieces
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[12, 24, 36, 48].map((pieces) => {
              const isSelected = selectedPieces === pieces;
              const packPrice = pieces * unitPrice;
              return (
                <button
                  key={pieces}
                  type="button"
                  onClick={() => setSelectedPieces(pieces)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black border-[#DFC283] shadow-md shadow-[#C5A059]/25 scale-[1.02]'
                      : 'bg-[#181818] hover:bg-[#222222] text-neutral-300 border-[#282828] hover:border-[#C5A059]/40'
                  }`}
                  title={`${pieces} Bottles (₹${packPrice})`}
                >
                  <span className="block text-[11px] leading-tight font-black">{pieces} pcs</span>
                  <span className={`block text-[9px] font-semibold ${isSelected ? 'text-black/80 font-bold' : 'text-neutral-400'}`}>
                    ₹{packPrice}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing Block & Quantity Stepper */}
        <div className="pt-2 border-t border-[#222222] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-heading text-2xl font-black gold-gradient-text">
                ₹{totalAmount}
              </span>
              {isSellingPriceActive && totalMrp > totalAmount && (
                <span className="text-xs text-neutral-500 line-through">
                  ₹{totalMrp}
                </span>
              )}
              {showDiscountBadge && (
                <span className="px-1.5 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 rounded text-[10px] font-extrabold tracking-wide">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              ₹{unitPrice}/bottle • {totalBottles} bottles total {!isSellingPriceActive && <span className="text-amber-400/90 font-semibold">(MRP Standard)</span>}
            </p>
            {isAdmin && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={handleAdminToggleSellingPrice}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs ${
                    isSellingPriceActive
                      ? 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-700/70 hover:border-cyan-500'
                      : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700/70 hover:border-amber-500'
                  }`}
                  title={isSellingPriceActive ? 'Admin: Click to switch to MRP Only (Selling Price OFF)' : 'Admin: Click to switch to Selling Price ON (Discounted Offer)'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSellingPriceActive ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>Selling Price: {isSellingPriceActive ? 'ON' : 'OFF (MRP)'}</span>
                  <span className="text-[8px] opacity-75 underline">Toggle</span>
                </button>
              </div>
            )}
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 uppercase">QTY:</span>
            <div className="flex items-center bg-[#161616] rounded-xl p-1 border border-[#282828]">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-6 h-6 rounded-lg bg-[#242424] text-neutral-200 hover:text-white hover:bg-[#333333] flex items-center justify-center transition-colors shadow-2xs font-bold text-xs cursor-pointer"
                aria-label="Decrease quantity"
                title="Decrease QTY"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 text-center text-xs font-black text-[#DFC283]">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="w-6 h-6 rounded-lg bg-[#242424] text-neutral-200 hover:text-white hover:bg-[#333333] flex items-center justify-center transition-colors shadow-2xs font-bold text-xs cursor-pointer"
                aria-label="Increase quantity"
                title="Increase QTY"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 shadow-xs ${
                isOutOfStock
                  ? 'bg-[#181818] text-neutral-500 border border-[#262626] cursor-not-allowed'
                  : isAddedRecently
                  ? 'bg-emerald-600 text-white cursor-pointer'
                  : 'bg-[#181818] hover:bg-[#202020] text-[#DFC283] border border-[#C5A059]/40 hover:border-[#C5A059] active:scale-95 cursor-pointer'
              }`}
            >
              {isOutOfStock ? (
                <span>Unavailable</span>
              ) : isAddedRecently ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs shadow-md transition-all ${
                isOutOfStock
                  ? 'bg-[#181818] text-neutral-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black shadow-md shadow-[#C5A059]/20 active:scale-95 cursor-pointer'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isOutOfStock ? 'text-neutral-500' : 'text-black fill-black'}`} />
              <span>{isOutOfStock ? 'Out of Stock' : 'Buy Now'}</span>
            </button>
          </div>

          {/* Custom Bottle Design Hook */}
          <button
            onClick={handleCustomDesignThisBottle}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-[#DFC283] bg-[#161616] hover:bg-[#1e1e1e] border border-dashed border-[#C5A059]/40 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Custom Design Label (Min 600 Pcs • 2× Price)</span>
          </button>
        </div>
      </div>

      {/* Admin Bottle Image Modal */}
      {isAdmin && isBottleModalOpen && (
        <AdminBottleImageModal
          product={product}
          isOpen={isBottleModalOpen}
          onClose={() => setIsBottleModalOpen(false)}
        />
      )}
    </div>
  );
};
