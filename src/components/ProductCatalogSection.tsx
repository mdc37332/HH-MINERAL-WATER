import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import {
  Sparkles,
  Package,
  Droplet,
  ShieldCheck,
  CheckCircle,
  Truck,
  Layers,
  Filter
} from 'lucide-react';

export const ProductCatalogSection: React.FC = () => {
  const { products, setCurrentSection } = useStore();
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('all');

  const filtered = products.filter(p => {
    if (selectedSizeFilter === 'all') return true;
    return p.size === selectedSizeFilter;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-200">
            <Droplet className="w-3.5 h-3.5 text-cyan-600" />
            <span>Pristine Bottled Collection</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            HH Mineral Water <span className="text-cyan-600">Product Range</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
            Choose from our 250ml event bottles, 500ml daily hydration, 1L spring bottles, and 2L family party packs.
          </p>
        </div>

        {/* Size Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Size:
          </span>
          {['all', '250ml', '500ml', '1L', '2L'].map(sz => (
            <button
              key={sz}
              onClick={() => setSelectedSizeFilter(sz)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSizeFilter === sz
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {sz === 'all' ? 'All Sizes' : sz}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {filtered.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Custom Design Callout Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-extrabold uppercase tracking-widest border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Custom Branding Service
          </span>
          <h3 className="font-heading text-2xl sm:text-3xl font-extrabold">
            Need Custom Branded Water Bottles with Your Logo?
          </h3>
          <p className="text-xs sm:text-sm text-cyan-100 leading-relaxed">
            Upload your company logo or wedding monogram. We print high-definition luxury matte & gold foil labels with zero plate charges and fast doorstep delivery.
          </p>
        </div>

        <button
          onClick={() => {
            setCurrentSection('custom-design');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-sky-300 hover:from-cyan-300 hover:to-sky-200 text-slate-950 font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>Launch Custom Design Studio</span>
        </button>
      </div>
    </section>
  );
};
