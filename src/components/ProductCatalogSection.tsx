import React, { useState, useMemo } from 'react';
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
  Filter,
  Search,
  ArrowUpDown,
  X
} from 'lucide-react';

export const ProductCatalogSection: React.FC = () => {
  const { products, setCurrentSection, resetProductsToDefault } = useStore();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name-asc' | 'popular'>('price-asc');

  // Available Sizes with counts - ordered logically (250ml -> 500ml -> 1L -> 2L)
  const availableSizes = useMemo(() => {
    const sizeMap = new Map<string, number>();
    products.forEach(p => {
      if (p.size) {
        const s = p.size.trim();
        sizeMap.set(s, (sizeMap.get(s) || 0) + 1);
      }
    });

    const standardOrder = ['250ml', '500ml', '1L', '2L'];
    const entries = Array.from(sizeMap.entries()).sort(([a], [b]) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return [
      { size: 'all', count: products.length },
      ...entries.map(([size, count]) => ({ size, count }))
    ];
  }, [products]);

  // Categories
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) catSet.add(p.category.trim());
    });
    return ['all', ...Array.from(catSet)];
  }, [products]);

  // Filtered and Sorted products with safe null/undefined handling
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Size Filter
        if (selectedSizeFilter !== 'all') {
          const prodSize = (p.size || '').trim().toLowerCase();
          const filterSize = selectedSizeFilter.trim().toLowerCase();
          if (prodSize !== filterSize) {
            return false;
          }
        }
        // Category Filter
        if (selectedCategory !== 'all') {
          const prodCat = (p.category || '').trim().toLowerCase();
          const filterCat = selectedCategory.trim().toLowerCase();
          if (prodCat !== filterCat) {
            return false;
          }
        }
        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchSize = (p.size || '').toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q) || (p.shortDesc || '').toLowerCase().includes(q);
          const matchTags = Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q));
          const matchBadge = (p.badge || '').toLowerCase().includes(q);
          return Boolean(matchName || matchSize || matchDesc || matchTags || matchBadge);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'popular') return (b.mrp || 0) - (a.mrp || 0);
        return 0;
      });
  }, [products, selectedSizeFilter, selectedCategory, searchQuery, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSizeFilter('all');
    setSortBy('price-asc');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold uppercase tracking-wider border border-cyan-200">
            <Droplet className="w-3.5 h-3.5 text-cyan-600" />
            <span>Pristine Bottled Collection</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            HH Mineral Water <span className="text-cyan-600">Product Catalog</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Laboratory-certified 7.4 pH alkaline mineral water in 250ml pocket bottles, 500ml daily hydration, 1L restaurant editions, and 2L family party packs. Available exclusively in 12, 24, 36 & 48-bottle sealed packs.
          </p>
        </div>
      </div>

      {/* Search, Filter Bar & Sorting */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by bottle size (250ml, 500ml, 1L, 2L), name, or mineral..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Bottle Name (A-Z)</option>
              <option value="popular">Best Value & Popular</option>
            </select>
          </div>
        </div>

        {/* Filter Pills: Categories & Sizes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Size Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Size:
            </span>
            {availableSizes.map(({ size, count }) => (
              <button
                key={size}
                onClick={() => setSelectedSizeFilter(size)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSizeFilter === size
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{size === 'all' ? 'All Sizes' : size}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  selectedSizeFilter === size ? 'bg-cyan-500 text-slate-950' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Category Filter Pills (if multiple categories exist) */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Category:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-700 text-white shadow-2xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pack Selling Quality Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 text-white shadow-lg">
        <div className="w-10 h-10 rounded-xl bg-black border border-slate-700 text-cyan-400 flex items-center justify-center shrink-0 shadow-xs font-black">
          <Package className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 text-xs">
          <span className="font-bold text-white block sm:inline">
            Factory Sealed Packs Only (12, 24, 36 & 48 Pcs):
          </span>{' '}
          <span className="text-slate-300">
            For maximum purity and tamper assurance, all mineral bottles are dispatched exclusively in wholesale bundles of 12, 24, 36, or 48 bottles. Single loose bottle sales are not permitted.
          </span>
        </div>
      </div>

      {/* Results Count & Clear Filter Indicator */}
      {(searchQuery || selectedSizeFilter !== 'all' || selectedCategory !== 'all') && (
        <div className="flex items-center justify-between text-xs text-slate-500 bg-cyan-50/60 px-4 py-2 rounded-xl border border-cyan-200/70">
          <span>
            Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products matching filters
          </span>
          <button
            onClick={clearAllFilters}
            className="text-cyan-700 hover:text-cyan-900 font-bold underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Product Cards Grid or Empty State */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-700 mx-auto flex items-center justify-center">
            <Droplet className="w-8 h-8 text-cyan-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              {products.length === 0 ? 'No Products in Catalog' : 'No Matching Bottle Variants'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {products.length === 0
                ? 'Your bottle product list is currently empty.'
                : 'No products match your current search or size filter. Try clearing filters or searching for another term.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {products.length === 0 ? (
              <button
                onClick={() => resetProductsToDefault()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold hover:from-cyan-500 hover:to-blue-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>Restore Default Catalog (4 Bottles)</span>
              </button>
            ) : (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
            <button
              onClick={() => setCurrentSection('custom-design')}
              className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-800 text-xs font-bold hover:bg-cyan-100 border border-cyan-200 transition-colors cursor-pointer"
            >
              Custom Design Studio
            </button>
          </div>
        </div>
      )}

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

