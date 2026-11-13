import React, { useState } from 'react';
import { Product } from '../types';
import { useStore, isProductSellingPriceActive } from '../context/StoreContext';
import {
  X,
  ShieldCheck,
  Droplet,
  Award,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Layers,
  ThermometerSun,
  Flame,
  Zap,
  Play,
  Pause,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Package,
  Edit3,
  Percent
} from 'lucide-react';
import { AdminBottleImageModal } from './admin/AdminBottleImageModal';
import {
  DEFAULT_BOTTLE_IMAGE,
  STUDIO_BOTTLE_SVG_FALLBACK
} from '../data/bottlePresets';

interface Props {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<Props> = ({ product, onClose }) => {
  const {
    addToCart,
    setSelectedProductForCustom,
    setCurrentSection,
    setIsCartOpen,
    isAdminUnlocked,
    adminSettings,
    updateProduct
  } = useStore();

  const isAdmin = Boolean(isAdminUnlocked);

  const handleAdminToggleSellingPrice = async () => {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'minerals' | 'purification'>('overview');
  const [imageError, setImageError] = useState(false);

  const defaultPlaceholder = DEFAULT_BOTTLE_IMAGE;
  const svgFallback = STUDIO_BOTTLE_SVG_FALLBACK;

  const productImages = React.useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const filtered = product.images.filter(img => Boolean(img && img.trim()));
      if (filtered.length > 0) return filtered;
    }
    return product.image ? [product.image] : [defaultPlaceholder];
  }, [product.images, product.image, defaultPlaceholder]);

  const [activeImgIndex, setActiveImgIndex] = useState<number>(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(false);
  const [spinSpeed, setSpinSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const activeImage = productImages[activeImgIndex] || productImages[0] || defaultPlaceholder;

  // Reset image error state when product or image changes
  React.useEffect(() => {
    setImageError(false);
  }, [product.id, product.image, activeImgIndex]);

  // 360 photo turntable loop
  React.useEffect(() => {
    if (!isAutoSpinning || productImages.length <= 1) return;
    const intervalTime = spinSpeed === 'fast' ? 500 : spinSpeed === 'normal' ? 850 : 1300;
    const interval = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % productImages.length);
    }, intervalTime);
    return () => clearInterval(interval);
  }, [isAutoSpinning, spinSpeed, productImages.length]);

  const isOutOfStock = product.inStock === false || product.stockStatus === 'Out of Stock';

  const isSellingPriceActive = isProductSellingPriceActive(product, adminSettings);
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

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, totalBottles);
    onClose();
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, totalBottles);
    onClose();
    setIsCartOpen(true);
  };

  const handleCustomDesign = () => {
    setSelectedProductForCustom(product);
    onClose();
    setCurrentSection('custom-design');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative max-w-3xl w-full bg-[#141414] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#2a2a2a] my-2 sm:my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1c1c1c]/90 hover:bg-[#282828] text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-md border border-[#333333] cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Product Visual Stage */}
          <div className="bg-gradient-to-b from-[#0e0e0e] via-[#121212] to-[#181818] p-3.5 sm:p-6 md:p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-[#242424]">
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20">
              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-[11px] sm:text-xs font-black rounded-full shadow-md">
                {product.size} Edition
              </span>
            </div>

            {/* Main Stage with Vertical Gallery */}
            <div className="w-full flex items-center justify-center gap-2 sm:gap-3 my-1 sm:my-2">
              {/* Vertical Thumbnails Stack (Supports unlimited images) */}
              {productImages.length > 1 && (
                <div className="flex flex-col items-center gap-1 sm:gap-1.5 py-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveImgIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                    className="w-6 h-5 sm:w-7 sm:h-6 rounded-md bg-[#1c1c1c] hover:bg-[#282828] text-neutral-300 hover:text-[#DFC283] flex items-center justify-center border border-[#333333] transition-colors cursor-pointer"
                    title="Previous vertical angle"
                  >
                    <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>

                  <div className="flex flex-col gap-1.5 sm:gap-2 max-h-48 xs:max-h-56 sm:max-h-72 overflow-y-auto pr-0.5 sm:pr-1 scrollbar-thin">
                    {productImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImgIndex(idx)}
                        onMouseEnter={() => setActiveImgIndex(idx)}
                        className={`w-8 h-12 sm:w-9 sm:h-14 rounded-md sm:rounded-lg overflow-hidden border transition-all cursor-pointer bg-[#181818] p-0.5 sm:p-1 flex items-center justify-center relative group ${
                          activeImgIndex === idx
                            ? 'border-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.7)] ring-1 ring-[#C5A059] scale-105'
                            : 'border-[#2d2d2d] opacity-65 hover:opacity-100 hover:border-neutral-400'
                        }`}
                        title={`Angle ${idx + 1} of ${productImages.length}`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain"
                        />
                        <span className="absolute bottom-0 right-0 text-[7px] sm:text-[8px] font-bold bg-black/80 px-0.5 sm:px-1 rounded text-neutral-300">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveImgIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                    className="w-6 h-5 sm:w-7 sm:h-6 rounded-md bg-[#1c1c1c] hover:bg-[#282828] text-neutral-300 hover:text-[#DFC283] flex items-center justify-center border border-[#333333] transition-colors cursor-pointer"
                    title="Next vertical angle"
                  >
                    <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}

              {/* Central Vertical Bottle Display with 360 Turntable */}
              <div className="flex-1 h-56 xs:h-64 sm:h-80 md:h-96 min-h-[200px] flex flex-col items-center justify-center relative">
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex items-center gap-1 sm:gap-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsBottleModalOpen(true)}
                      className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border backdrop-blur-md flex items-center gap-1 sm:gap-1.5 transition-all shadow-md cursor-pointer bg-[#141414]/90 hover:bg-[#C5A059] hover:text-black text-[#DFC283] border-[#C5A059]"
                      title="Edit bottle images for this product (Admin)"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Edit Bottle (Admin)</span>
                    </button>
                  )}

                  {productImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsAutoSpinning(!isAutoSpinning)}
                        className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border backdrop-blur-md flex items-center gap-1 sm:gap-1.5 transition-all shadow-md cursor-pointer ${
                          isAutoSpinning
                            ? 'bg-[#C5A059] text-black border-[#DFC283] shadow-[#C5A059]/30'
                            : 'bg-black/80 text-[#DFC283] border-[#C5A059]/40 hover:bg-[#202020]'
                        }`}
                        title={isAutoSpinning ? 'Pause 360° spin' : 'Play 360° spin'}
                      >
                        {isAutoSpinning ? (
                          <>
                            <Pause className="w-2.5 h-2.5" />
                            <span>360° Spin</span>
                          </>
                        ) : (
                          <>
                            <RotateCw className="w-2.5 h-2.5" />
                            <span>360° View</span>
                          </>
                        )}
                      </button>
                      <span className="bg-black/80 backdrop-blur-md text-[#DFC283] text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-[#C5A059]/30 shadow-md">
                        {activeImgIndex + 1} / {productImages.length}
                      </span>
                    </>
                  )}
                </div>

                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {/* Concentric Water Ripple Base */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none w-44 sm:w-52 h-10 sm:h-12 flex items-center justify-center opacity-65">
                    <div className="absolute w-28 sm:w-36 h-28 sm:h-36 rounded-full border border-[#C5A059]/40 animate-liquid-ripple-1" />
                    <div className="w-24 sm:w-28 h-5 sm:h-6 bg-[#C5A059]/20 rounded-full blur-xs" />
                  </div>

                  {/* Bottle with Video-Like Hydro-Levitation & Light Sweep */}
                  <div className="relative h-full w-full flex items-center justify-center animate-hydro-subtle">
                    {/* Studio Specular Light Ray Sweep */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 flex items-center justify-center">
                      <div className="w-1/3 h-[180%] bg-gradient-to-r from-transparent via-white/25 to-transparent blur-xs animate-light-sweep" />
                    </div>

                    <img
                      src={imageError ? defaultPlaceholder : (activeImage || defaultPlaceholder)}
                      alt={`${product.name} - View ${activeImgIndex + 1}`}
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
                      className="h-full w-auto max-w-[90%] object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] hover:scale-105 transition-transform duration-300"
                    />

                    {/* Mirror Reflection */}
                    <div className="absolute -bottom-4 sm:-bottom-5 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-8 sm:h-10 overflow-hidden opacity-30 blur-[1.5px] pointer-events-none -scale-y-100">
                      <img
                        src={imageError ? defaultPlaceholder : (activeImage || defaultPlaceholder)}
                        alt="Reflection"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target.src !== defaultPlaceholder && !target.src.startsWith('data:image/svg')) {
                            target.src = defaultPlaceholder;
                          } else {
                            target.src = svgFallback;
                          }
                        }}
                        className="w-full h-full object-contain filter brightness-75"
                      />
                    </div>
                  </div>

                  {/* 360° Turntable Video Controls Bar */}
                  {productImages.length > 1 && (
                    <div className="absolute bottom-1 inset-x-1 sm:inset-x-2 z-20 flex items-center justify-between bg-black/85 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-[#333333] shadow-lg">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAutoSpinning(!isAutoSpinning)}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1c1c1c] hover:bg-[#282828] text-[#DFC283] flex items-center justify-center cursor-pointer border border-[#3a3a3a]"
                          title={isAutoSpinning ? 'Pause' : 'Play 360 spin'}
                        >
                          {isAutoSpinning ? <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />}
                        </button>
                        <div className="flex items-center gap-1">
                          {productImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveImgIndex(i)}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                activeImgIndex === i ? 'w-3.5 sm:w-4 bg-[#C5A059]' : 'w-1.5 bg-[#444444] hover:bg-neutral-300'
                              }`}
                              title={`Jump to angle ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Spin Speed Selector */}
                      <div className="flex items-center gap-1">
                        {(['slow', 'normal', 'fast'] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => setSpinSpeed(spd)}
                            className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                              spinSpeed === spd
                                ? 'bg-[#C5A059] text-black'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            {spd === 'slow' ? '0.75x' : spd === 'normal' ? '1x' : '1.5x'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quality Badges */}
            <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 w-full text-center">
              <div className="bg-[#121212] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-[#262626] shadow-2xs">
                <span className="block text-[9px] sm:text-[10px] text-neutral-400 font-semibold uppercase">Purity</span>
                <span className="text-[11px] sm:text-xs font-bold text-[#DFC283]">7-Stage UV</span>
              </div>
              <div className="bg-[#121212] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-[#262626] shadow-2xs">
                <span className="block text-[9px] sm:text-[10px] text-neutral-400 font-semibold uppercase">Alkaline</span>
                <span className="text-[11px] sm:text-xs font-bold text-[#DFC283]">
                  {product.mineralInfo?.ph ? product.mineralInfo.ph.split(' ')[0] : '7.4'} pH
                </span>
              </div>
              <div className="bg-[#121212] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-[#262626] shadow-2xs">
                <span className="block text-[9px] sm:text-[10px] text-neutral-400 font-semibold uppercase">Grade</span>
                <span className="text-[11px] sm:text-xs font-bold text-emerald-400">BIS Certified</span>
              </div>
            </div>
          </div>

          {/* Right: Detailed Information */}
          <div className="p-4 sm:p-6 md:p-8 flex flex-col justify-between space-y-3.5 sm:space-y-5 bg-[#141414]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-bold text-[#DFC283] uppercase tracking-wider">
                  HH Natural Mineral Water
                </span>
                {product.badge && (
                  <span className="text-[9px] sm:text-[10px] font-extrabold bg-[#C5A059]/15 text-[#DFC283] border border-[#C5A059]/30 px-2 py-0.5 rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>

              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mt-1">
                {product.name}
              </h2>

              {/* Price Display */}
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mt-2 sm:mt-3">
                <span className="font-heading text-xl sm:text-2xl font-black text-white">
                  ₹{totalAmount}
                </span>
                {isSellingPriceActive && totalMrp > totalAmount && (
                  <span className="text-xs sm:text-sm text-neutral-500 line-through">
                    ₹{totalMrp}
                  </span>
                )}
                <span className="text-[11px] sm:text-xs text-neutral-400 font-medium">
                  ₹{unitPrice}/bottle {!isSellingPriceActive && <span className="text-amber-400 font-semibold">(Standard MRP)</span>}
                </span>
                {showDiscountBadge && (
                  <span className="text-xs font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-600/70 shadow-xs flex items-center gap-1">
                    <Percent className="w-3 h-3 text-emerald-400" />
                    <span>{discountPercent}% OFF</span>
                  </span>
                )}
                {isSellingPriceActive && totalSavings > 0 && (
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                    Save ₹{totalSavings} ({discountPercent}% Discount • Incl. GST)
                  </span>
                )}
                {Boolean(isAdminUnlocked) && (
                  <button
                    type="button"
                    onClick={handleAdminToggleSellingPrice}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
                      isSellingPriceActive
                        ? 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border-cyan-700/70'
                        : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-700/70'
                    }`}
                    title="Click to toggle Selling Price ON/OFF for this product (Admin only)"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSellingPriceActive ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>Admin: Selling Price {isSellingPriceActive ? 'ON' : 'OFF (MRP)'}</span>
                    <span className="text-[9px] underline opacity-80">Toggle</span>
                  </button>
                )}
              </div>

              {/* Bottle Select Option: 12, 24, 36, 48 Pieces */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#C5A059]" /> Select Bottle Pieces:
                  </span>
                  <span className="font-black text-[#DFC283]">
                    {selectedPieces} Pieces
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 36, 48].map((pieces) => {
                    const isSelected = selectedPieces === pieces;
                    const packPrice = pieces * unitPrice;
                    return (
                      <button
                        key={pieces}
                        type="button"
                        onClick={() => setSelectedPieces(pieces)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black border-[#DFC283] shadow-md shadow-[#C5A059]/25 scale-[1.02]'
                            : 'bg-[#181818] hover:bg-[#222222] text-neutral-300 border-[#2a2a2a] hover:border-[#C5A059]/40'
                        }`}
                        title={`${pieces} Bottles (₹${packPrice})`}
                      >
                        <span className="block text-xs font-black leading-tight">{pieces} Pcs</span>
                        <span className={`block text-[10px] font-semibold ${isSelected ? 'text-black/80 font-bold' : 'text-neutral-400'}`}>
                          ₹{packPrice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#262626] mt-3 sm:mt-4 gap-3 sm:gap-4 text-xs font-semibold overflow-x-auto scrollbar-none pb-0.5 whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeTab === 'overview'
                      ? 'border-[#C5A059] text-[#DFC283] font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Overview & Features
                </button>
                <button
                  onClick={() => setActiveTab('minerals')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeTab === 'minerals'
                      ? 'border-[#C5A059] text-[#DFC283] font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Mineral Breakdown
                </button>
                <button
                  onClick={() => setActiveTab('purification')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeTab === 'purification'
                      ? 'border-[#C5A059] text-[#DFC283] font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  7-Stage Process
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-2.5 sm:mt-3 max-h-32 sm:max-h-36 overflow-y-auto pr-1">
                {activeTab === 'overview' && (
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="space-y-1 pt-1">
                      {(product.features || ['Pure Natural Mineral Water', 'UV & Ozonated Sterilization', 'BPA-Free Food Grade Packaging']).map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-neutral-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'minerals' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                      <div className="bg-[#181818] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-neutral-400 block text-[10px]">Calcium (Ca++)</span>
                        <span className="font-bold text-white">{product.mineralInfo?.calcium || '32 mg/L'}</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-neutral-400 block text-[10px]">Magnesium (Mg++)</span>
                        <span className="font-bold text-white">{product.mineralInfo?.magnesium || '14 mg/L'}</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-neutral-400 block text-[10px]">Potassium (K+)</span>
                        <span className="font-bold text-white">{product.mineralInfo?.potassium || '4.5 mg/L'}</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-neutral-400 block text-[10px]">Silica (SiO2)</span>
                        <span className="font-bold text-white">{product.mineralInfo?.silica || '18 mg/L'}</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-neutral-400 block text-[10px]">pH Balance</span>
                        <span className="font-bold text-[#DFC283]">{product.mineralInfo?.ph || '7.4 pH'}</span>
                      </div>
                      <div className="bg-[#181818] p-2 rounded-lg border border-[#2a2a2a]">
                        <span className="text-neutral-400 block text-[10px]">TDS Level</span>
                        <span className="font-bold text-white">{product.mineralInfo?.tds || '120 ppm'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'purification' && (
                  <div className="space-y-1.5 text-xs text-neutral-300">
                    <p className="font-medium text-white">
                      Purified at our state-of-the-art automated bottling plant:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-neutral-400">
                      <li>Dual Media Sand & Carbon Filtration</li>
                      <li>High Pressure Micron Demineralization</li>
                      <li>Reverse Osmosis (RO) Purification</li>
                      <li>Natural Mineral & Electrolyte Infusion</li>
                      <li>Ultraviolet (UV) Sterilization Chamber</li>
                      <li>Ozonation for Maximum Purity & Freshness</li>
                      <li>Aseptic High-Speed Clean-Room Bottling</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 sm:space-y-3 pt-2.5 sm:pt-3 border-t border-[#262626]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-300">QTY:</span>
                  <div className="flex items-center bg-[#181818] rounded-xl p-0.5 sm:p-1 border border-[#2e2e2e]">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#242424] text-neutral-200 hover:bg-[#303030] flex items-center justify-center transition-colors font-bold text-xs cursor-pointer"
                      title="Decrease QTY"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 sm:w-10 text-center text-xs font-black text-[#DFC283]">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#242424] text-neutral-200 hover:bg-[#303030] flex items-center justify-center transition-colors font-bold text-xs cursor-pointer"
                      title="Increase QTY"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">{totalBottles} bottles total</span>
                  <span className="text-base sm:text-lg font-black text-[#DFC283]">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs transition-all ${
                    isOutOfStock
                      ? 'bg-[#181818] text-neutral-500 border border-[#282828] cursor-not-allowed'
                      : 'bg-[#1e1e1e] hover:bg-[#282828] text-white border border-[#333333] hover:border-[#C5A059]/60 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C5A059]" />
                  <span>{isOutOfStock ? 'Out of Stock' : 'Add to Bag'}</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-black text-xs shadow-lg transition-all ${
                    isOutOfStock
                      ? 'bg-[#222222] text-neutral-500 shadow-none cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black shadow-[#C5A059]/20 cursor-pointer'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOutOfStock ? 'text-neutral-500' : 'text-black fill-black'}`} />
                  <span>{isOutOfStock ? 'Unavailable' : 'Buy Now'}</span>
                </button>
              </div>

              <button
                onClick={handleCustomDesign}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-[10px] sm:text-xs bg-[#181818] hover:bg-[#202020] text-[#DFC283] border border-[#C5A059]/40 hover:border-[#C5A059] transition-all cursor-pointer text-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="truncate">Create Custom Design Order (1 to Unlimited • 2× Price)</span>
              </button>
            </div>
          </div>
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
