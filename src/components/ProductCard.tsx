import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
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
  Package
} from 'lucide-react';

interface Props {
  product: Product;
}

const PACK_SIZES = [12, 24, 36, 48] as const;

export const ProductCard: React.FC<Props> = ({ product }) => {
  const {
    addToCart,
    setSelectedProductForDetail,
    setSelectedProductForCustom,
    setCurrentSection,
    setIsCartOpen
  } = useStore();

  const [selectedPackSize, setSelectedPackSize] = useState<number>(12);
  const [packQuantity, setPackQuantity] = useState<number>(1); // Number of packs
  const [isAddedRecently, setIsAddedRecently] = useState(false);

  const totalBottles = selectedPackSize * packQuantity;
  const packPrice = product.price * selectedPackSize;
  const totalAmount = product.price * totalBottles;
  const totalMrp = product.mrp * totalBottles;
  const totalSavings = totalMrp - totalAmount;

  const handleAddToCart = () => {
    addToCart(product, totalBottles);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1500);
  };

  const handleBuyNow = () => {
    addToCart(product, totalBottles);
    setIsCartOpen(true);
  };

  const handleCustomDesignThisBottle = () => {
    setSelectedProductForCustom(product);
    setCurrentSection('custom-design');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Top Badges & Size Tag */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between pointer-events-none">
        <span className="px-3 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-full shadow-md tracking-wide">
          {product.size}
        </span>
        <span className="px-2.5 py-1 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1 border border-slate-700">
          <Package className="w-3 h-3 text-cyan-400" />
          12–48 Pcs Packs Only
        </span>
      </div>

      {/* Product Image Stage */}
      <div
        onClick={() => setSelectedProductForDetail(product)}
        className="relative h-60 sm:h-64 w-full bg-gradient-to-b from-slate-50 via-cyan-50/30 to-white flex items-center justify-center p-6 cursor-pointer overflow-hidden group-hover:bg-cyan-50/50 transition-colors"
      >
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Quick View Button on Hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProductForDetail(product);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-semibold px-4 py-1.5 rounded-full shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5 text-cyan-600" />
          <span>Mineral Specs & Details</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Mineral pill indicators */}
          <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-cyan-700">
            <span className="flex items-center gap-1 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200/60">
              <Droplet className="w-3 h-3 text-cyan-600" />
              pH {product.mineralInfo?.ph ? product.mineralInfo.ph.split(' ')[0] : '7.4'}
            </span>
            <span className="bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 text-sky-800">
              TDS {product.mineralInfo?.tds ? product.mineralInfo.tds.split(' ')[0] : '120'}
            </span>
            <span className="hidden sm:inline bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-emerald-800">
              7-Stage UV
            </span>
          </div>

          <h3
            onClick={() => setSelectedProductForDetail(product)}
            className="font-heading text-base sm:text-lg font-bold text-slate-900 group-hover:text-cyan-700 transition-colors cursor-pointer leading-snug"
          >
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {product.shortDesc}
          </p>
        </div>

        {/* Pack Size Selector Tabs */}
        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-cyan-600" />
              Select Pack Size:
            </span>
            <span className="text-[10px] font-semibold text-cyan-800 bg-cyan-100/70 px-1.5 py-0.5 rounded">
              ₹{product.price}/bottle
            </span>
          </div>

          {/* 12, 24, 36, 48 Pack Options */}
          <div className="grid grid-cols-4 gap-1.5">
            {PACK_SIZES.map(size => {
              const isSelected = selectedPackSize === size;
              const currentTotal = product.price * size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedPackSize(size)}
                  className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold ring-2 ring-slate-900/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/50'
                  }`}
                >
                  <span className="block text-xs font-extrabold">{size} Pcs</span>
                  <span className={`block text-[10px] font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`}>
                    ₹{currentTotal}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
            <span className="italic text-slate-400">Single bottle not sold</span>
            <span className="font-semibold text-emerald-700">Save ₹{totalSavings} in bulk</span>
          </div>
        </div>

        {/* Pricing Block with Pack Multiplier */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-2xl font-black text-slate-900">
                ₹{totalAmount}
              </span>
              {totalMrp > totalAmount && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{totalMrp}
                </span>
              )}
            </div>
            <p className="text-[11px] text-cyan-800 font-bold mt-0.5">
              {totalBottles} bottles ({packQuantity} × {selectedPackSize}-Pack)
            </p>
          </div>

          {/* Number of Packs Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Packs:</span>
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setPackQuantity(Math.max(1, packQuantity - 1))}
                className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs font-bold text-xs"
                aria-label="Decrease packs"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-slate-900">
                {packQuantity}
              </span>
              <button
                type="button"
                onClick={() => setPackQuantity(packQuantity + 1)}
                className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-2xs font-bold text-xs"
                aria-label="Increase packs"
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
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 shadow-xs cursor-pointer ${
                isAddedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300/80 active:scale-95'
              }`}
            >
              {isAddedRecently ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added {totalBottles} Pcs!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Add {selectedPackSize}-Pack</span>
                </>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span>Buy {selectedPackSize}-Pack</span>
            </button>
          </div>

          {/* Custom Bottle Design Hook */}
          <button
            onClick={handleCustomDesignThisBottle}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-cyan-700 bg-sky-50/70 hover:bg-sky-100/80 border border-dashed border-cyan-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Custom Design Label (Min 600 Pcs • 2× Price)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
