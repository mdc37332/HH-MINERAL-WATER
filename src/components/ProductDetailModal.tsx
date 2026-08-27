import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
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
  Package
} from 'lucide-react';

interface Props {
  product: Product;
  onClose: () => void;
}

const PACK_SIZES = [12, 24, 36, 48] as const;

export const ProductDetailModal: React.FC<Props> = ({ product, onClose }) => {
  const {
    addToCart,
    setSelectedProductForCustom,
    setCurrentSection,
    setIsCartOpen
  } = useStore();

  const [selectedPackSize, setSelectedPackSize] = useState<number>(12);
  const [packQuantity, setPackQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'minerals' | 'purification'>('overview');

  const totalBottles = selectedPackSize * packQuantity;
  const packPrice = product.price * selectedPackSize;
  const totalAmount = product.price * totalBottles;
  const totalMrp = product.mrp * totalBottles;
  const totalSavings = totalMrp - totalAmount;

  const handleAddToCart = () => {
    addToCart(product, totalBottles);
    onClose();
  };

  const handleBuyNow = () => {
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-xs"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Product Visual Stage */}
          <div className="bg-gradient-to-b from-cyan-50 via-sky-50 to-slate-100 p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-200">
            <span className="absolute top-4 left-4 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full shadow-md">
              {product.size} Edition
            </span>
            <div className="w-64 h-72 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Pack Announcement Badge */}
            <div className="mt-2 bg-slate-950 border border-slate-800 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sold in 12, 24, 36 & 48-bottle wholesale packs</span>
            </div>

            {/* Quality Badges */}
            <div className="mt-4 grid grid-cols-3 gap-2 w-full text-center">
              <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Purity</span>
                <span className="text-xs font-bold text-cyan-700">7-Stage UV</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Alkaline</span>
                <span className="text-xs font-bold text-sky-700">{product.mineralInfo.ph.split(' ')[0]} pH</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="block text-[10px] text-slate-400 font-semibold uppercase">Grade</span>
                <span className="text-xs font-bold text-emerald-700">BIS Certified</span>
              </div>
            </div>
          </div>

          {/* Right: Detailed Information */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                  HH Natural Mineral Water
                </span>
                {product.badge && (
                  <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>

              <h2 className="font-heading text-2xl font-bold text-slate-900 mt-1">
                {product.name}
              </h2>

              {/* Pack Selector Section */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-cyan-600" />
                    Select Factory Pack Size:
                  </span>
                  <span className="text-[11px] font-semibold text-cyan-700">
                    ₹{product.price} / bottle
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {PACK_SIZES.map(size => {
                    const isSelected = selectedPackSize === size;
                    const cPrice = product.price * size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedPackSize(size)}
                        className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-bold ring-2 ring-slate-900/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/50'
                        }`}
                      >
                        <span className="block text-xs font-extrabold">{size} Pcs</span>
                        <span className={`block text-[11px] font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`}>
                          ₹{cPrice}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  Note: Single loose bottles are not available for direct retail. All shipments are sealed in 12, 24, 36, or 48-piece master packs.
                </p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="font-heading text-2xl font-black text-slate-900">
                  ₹{totalAmount}
                </span>
                {totalMrp > totalAmount && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{totalMrp}
                  </span>
                )}
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Save ₹{totalSavings} (Inclusive of GST)
                </span>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 mt-4 gap-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Overview & Features
                </button>
                <button
                  onClick={() => setActiveTab('minerals')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'minerals'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Mineral Breakdown
                </button>
                <button
                  onClick={() => setActiveTab('purification')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'purification'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  7-Stage Process
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-3 max-h-36 overflow-y-auto pr-1">
                {activeTab === 'overview' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="space-y-1 pt-1">
                      {product.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'minerals' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Calcium (Ca++)</span>
                        <span className="font-bold text-slate-800">{product.mineralInfo.calcium}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Magnesium (Mg++)</span>
                        <span className="font-bold text-slate-800">{product.mineralInfo.magnesium}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Potassium (K+)</span>
                        <span className="font-bold text-slate-800">{product.mineralInfo.potassium}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Silica (SiO2)</span>
                        <span className="font-bold text-slate-800">{product.mineralInfo.silica}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">pH Balance</span>
                        <span className="font-bold text-cyan-700">{product.mineralInfo.ph}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">TDS Level</span>
                        <span className="font-bold text-slate-800">{product.mineralInfo.tds}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'purification' && (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">
                      Purified at our state-of-the-art automated bottling plant:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
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
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-700">Number of Packs:</span>
                  <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={() => setPackQuantity(Math.max(1, packQuantity - 1))}
                      className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors font-bold text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900">
                      {packQuantity}
                    </span>
                    <button
                      onClick={() => setPackQuantity(packQuantity + 1)}
                      className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors font-bold text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total ({totalBottles} bottles)</span>
                  <span className="text-lg font-bold text-slate-900">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-cyan-600" />
                  <span>Add {selectedPackSize}-Pack to Bag</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                  <span>Buy {selectedPackSize}-Pack</span>
                </button>
              </div>

              <button
                onClick={handleCustomDesign}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-50 to-cyan-50 hover:from-sky-100 hover:to-cyan-100 text-cyan-800 border border-dashed border-cyan-400 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>Create Custom Design Order (Min 600 Pcs • 2× Price)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
