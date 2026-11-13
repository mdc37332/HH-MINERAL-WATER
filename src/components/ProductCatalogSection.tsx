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
  X,
  Percent,
  Zap,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { isProductSellingPriceActive } from '../context/StoreContext';

export const ProductCatalogSection: React.FC = () => {
  const {
    products,
    adminSettings,
    setCurrentSection,
    resetProductsToDefault,
    isAdminUnlocked,
    toggleAllProductsVisibility,
    toggleAllProductsSellingPrice
  } = useStore();
  const isAllProductsShown = adminSettings?.showAllProducts !== false;
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
          const is1LMatch = (filterSize === '1l' || filterSize === '1 litre') && (prodSize === '1l' || prodSize === '1 litre');
          if (prodSize !== filterSize && !is1LMatch) {
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
          const is1LQuery = q === '1l' || q === '1 litre' || q === '1 liter' || q === '1000ml' || q.includes('1 litre') || q.includes('1 liter') || q.includes('1l');
          const is1LProd = (p.size || '').toLowerCase() === '1l' || (p.size || '').toLowerCase() === '1 litre';
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchSize = (p.size || '').toLowerCase().includes(q) || (is1LQuery && is1LProd);
          const matchDesc = (p.description || '').toLowerCase().includes(q) || (p.shortDesc || '').toLowerCase().includes(q);
          const matchTags = Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q));
          const matchBadge = (p.badge || '').toLowerCase().includes(q);
          return Boolean(matchName || matchSize || matchDesc || matchTags || matchBadge);
        }
        return true;
      })
      .sort((a, b) => {
        const effA = isProductSellingPriceActive(a, adminSettings) ? (a.price || 0) : (a.mrp || a.price || 0);
        const effB = isProductSellingPriceActive(b, adminSettings) ? (b.price || 0) : (b.mrp || b.price || 0);
        if (sortBy === 'price-asc') return effA - effB;
        if (sortBy === 'price-desc') return effB - effA;
        if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'popular') return (b.mrp || 0) - (a.mrp || 0);
        return 0;
      });
  }, [products, selectedSizeFilter, selectedCategory, searchQuery, sortBy, adminSettings]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSizeFilter('all');
    setSortBy('price-asc');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#222222]">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181818] text-[#DFC283] text-xs font-bold uppercase tracking-wider border border-[#C5A059]/30">
            <Droplet className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Pristine Bottled Collection</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight">
            HH Mineral Water <span className="gold-gradient-text">Product Catalog</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
            Laboratory-certified 7.4 pH alkaline mineral water in 250ml pocket bottles, 500ml daily hydration, 1L restaurant editions, and 2L family party packs. Available exclusively in 12, 24, 36 & 48-bottle sealed packs.
          </p>
        </div>
      </div>

      {/* Admin Master Controller (Visible ONLY to verified Owner Admin — never customers or Factory Staff) */}
      {isAdminUnlocked && (
        <div className="bg-gradient-to-r from-neutral-900 via-[#1a1710] to-neutral-900 border-2 border-[#C5A059]/60 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#DFC283] shrink-0">
                {isAllProductsShown ? (
                  <Eye className="w-6 h-6 text-[#C5A059]" />
                ) : (
                  <EyeOff className="w-6 h-6 text-rose-400" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40">
                    Admin Only Controller
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    All Products Visibility &amp; Selling Price
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Catalog Visibility:{' '}
                  <span className={`font-black ${isAllProductsShown ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isAllProductsShown ? '● SHOW (Visible to All)' : '○ NOT SHOW (Hidden from Customers & Staff)'}
                  </span>
                  {' '}• Selling Price:{' '}
                  <span className={`font-black ${adminSettings?.showSellingPrice !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {adminSettings?.showSellingPrice !== false ? 'ON (Offers Active)' : 'OFF (MRP Only)'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Admin-Only All Products SHOW / NOT SHOW Button */}
              <button
                type="button"
                id="catalog-all-products-visibility-toggle-btn"
                onClick={() => toggleAllProductsVisibility(!isAllProductsShown)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer shadow-lg active:scale-95 border ${
                  isAllProductsShown
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 text-white border-rose-400 ring-2 ring-rose-500/30'
                }`}
                title={isAllProductsShown ? 'Click to set All Products to NOT SHOW (Hide from storefront)' : 'Click to SHOW All Products on storefront'}
              >
                {isAllProductsShown ? (
                  <Eye className="w-4 h-4 text-white shrink-0" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white shrink-0" />
                )}
                <span>All Products: {isAllProductsShown ? 'SHOW' : 'NOT SHOW'}</span>
              </button>

              {/* ONE Consolidated Master Selling Price ON/OFF Button (Admin Only) */}
              <button
                type="button"
                id="catalog-master-selling-price-toggle-btn"
                onClick={() => {
                  const isCurrentlyOn = adminSettings?.showSellingPrice !== false;
                  toggleAllProductsSellingPrice(!isCurrentlyOn);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-3 cursor-pointer shadow-lg active:scale-95 border ${
                  adminSettings?.showSellingPrice !== false
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 ring-2 ring-emerald-400/40'
                    : 'bg-[#1e1e1e] hover:bg-[#282828] text-amber-300 border-amber-500/50 ring-2 ring-amber-500/20'
                }`}
                title={adminSettings?.showSellingPrice !== false ? 'Click to Turn OFF Selling Price for all products (sell at MRP)' : 'Click to Turn ON Selling Price for all products (enable discounts)'}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${adminSettings?.showSellingPrice !== false ? 'bg-white animate-pulse' : 'bg-amber-400'}`} />
                  <span>Selling Price: {adminSettings?.showSellingPrice !== false ? 'ON' : 'OFF'}</span>
                  <span className="text-[10px] font-bold opacity-80 hidden sm:inline">
                    {adminSettings?.showSellingPrice !== false ? '(Offers Active)' : '(MRP Only)'}
                  </span>
                </div>
                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                  adminSettings?.showSellingPrice !== false ? 'bg-white/30 justify-end' : 'bg-black/60 justify-start'
                }`}>
                  <div className={`w-4 h-4 rounded-full shadow-sm transform ${
                    adminSettings?.showSellingPrice !== false ? 'bg-white' : 'bg-amber-400'
                  }`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentSection('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                title="Open Admin Dashboard"
              >
                <Settings className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Admin Panel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAllProductsShown ? (
        <div className="bg-[#121212] border border-dashed border-[#C5A059]/40 rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#181818] border border-[#C5A059]/30 text-[#DFC283] mx-auto flex items-center justify-center">
            <EyeOff className="w-8 h-8 text-[#C5A059]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading text-xl font-bold text-white">
              Product Catalog Currently Hidden
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              The bottled water catalog is temporarily set to <strong className="text-[#DFC283]">Not Show</strong> by the store administrator. You can still design custom branded bottles or contact us directly for bulk bookings.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {isAdminUnlocked && (
              <button
                type="button"
                onClick={() => toggleAllProductsVisibility(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Show All Products (Admin)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCurrentSection('custom-design')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Custom Design Studio</span>
            </button>
          </div>
        </div>
      ) : (
        <>

      {/* Search, Filter Bar & Sorting */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-[#262626] shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by bottle size (250ml, 500ml, 1L, 2L), name, or mineral..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-9 py-2.5 rounded-2xl bg-[#181818] border border-[#2a2a2a] text-xs font-medium text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#C5A059]" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3.5 py-2 rounded-2xl bg-[#181818] border border-[#2a2a2a] text-xs font-bold text-[#DFC283] focus:outline-none focus:ring-2 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="price-asc" className="bg-[#121212] text-white">Price: Low to High</option>
              <option value="price-desc" className="bg-[#121212] text-white">Price: High to Low</option>
              <option value="name-asc" className="bg-[#121212] text-white">Bottle Name (A-Z)</option>
              <option value="popular" className="bg-[#121212] text-white">Best Value & Popular</option>
            </select>
          </div>
        </div>

        {/* Filter Pills: Categories & Sizes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#222222]">
          {/* Size Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#C5A059]" /> Size:
            </span>
            {availableSizes.map(({ size, count }) => (
              <button
                key={size}
                onClick={() => setSelectedSizeFilter(size)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSizeFilter === size
                    ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black shadow-md'
                    : 'bg-[#181818] hover:bg-[#202020] text-neutral-300 border border-[#282828] hover:border-[#C5A059]/40'
                }`}
              >
                <span>{size === 'all' ? 'All Sizes' : (size === '1L' || size === '1 Litre') ? '1 Litre (1L)' : size}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedSizeFilter === size ? 'bg-black text-[#DFC283]' : 'bg-[#262626] text-neutral-400'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Category Filter Pills (if multiple categories exist) */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-neutral-400 mr-1">Category:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#C5A059] text-black shadow-2xs font-black'
                      : 'bg-[#181818] hover:bg-[#202020] text-neutral-300 border border-[#282828]'
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
      <div className="bg-[#0d0d0d] border border-[#C5A059]/30 rounded-2xl p-4 flex items-center gap-3.5 text-white shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[#C5A059]/40 text-[#DFC283] flex items-center justify-center shrink-0 shadow-xs font-black">
          <Package className="w-5 h-5 text-[#C5A059]" />
        </div>
        <div className="flex-1 text-xs">
          <span className="font-black text-[#DFC283] block sm:inline">
            Factory Sealed Packs Only (12, 24, 36 & 48 Pcs):
          </span>{' '}
          <span className="text-neutral-300">
            For maximum purity and tamper assurance, all mineral bottles are dispatched exclusively in wholesale bundles of 12, 24, 36, or 48 bottles. Single loose bottle sales are not permitted.
          </span>
        </div>
      </div>

      {/* Results Count & Clear Filter Indicator */}
      {(searchQuery || selectedSizeFilter !== 'all' || selectedCategory !== 'all') && (
        <div className="flex items-center justify-between text-xs text-neutral-300 bg-[#161616] px-4 py-2 rounded-xl border border-[#C5A059]/30">
          <span>
            Showing <strong className="text-[#DFC283]">{filteredProducts.length}</strong> of <strong>{products.length}</strong> products matching filters
          </span>
          <button
            onClick={clearAllFilters}
            className="text-[#DFC283] hover:underline font-bold cursor-pointer"
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
        <div className="bg-[#121212] border border-dashed border-[#333333] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#181818] border border-[#C5A059]/30 text-[#DFC283] mx-auto flex items-center justify-center">
            <Droplet className="w-8 h-8 text-[#C5A059]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-white">
              {products.length === 0 ? 'No Products in Catalog' : 'No Matching Bottle Variants'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {products.length === 0
                ? 'Your bottle product list is currently empty.'
                : 'No products match your current search or size filter. Try clearing filters or searching for another term.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {products.length === 0 ? (
              <button
                onClick={() => resetProductsToDefault()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>Restore Default Catalog (4 Bottles)</span>
              </button>
            ) : (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-[#181818] border border-[#2a2a2a] text-white text-xs font-bold hover:bg-[#222222] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
            <button
              onClick={() => setCurrentSection('custom-design')}
              className="px-4 py-2 rounded-xl bg-[#181818] text-[#DFC283] text-xs font-bold hover:bg-[#222222] border border-[#C5A059]/40 transition-colors cursor-pointer"
            >
              Custom Design Studio
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Custom Design Callout Banner */}
      <div className="bg-gradient-to-r from-[#0d0d0d] via-[#161616] to-[#0d0d0d] border border-[#C5A059]/40 rounded-3xl p-8 sm:p-10 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A059]/15 text-[#DFC283] text-xs font-bold uppercase tracking-widest border border-[#C5A059]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            Custom Branding Service
          </span>
          <h3 className="font-heading text-2xl sm:text-3xl font-black">
            Need Custom Branded Water Bottles with Your Logo?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Upload your company logo or wedding monogram. We print high-definition luxury matte & gold foil labels with zero plate charges and fast doorstep delivery.
          </p>
        </div>

        <button
          onClick={() => {
            setCurrentSection('custom-design');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>Launch Custom Design Studio</span>
        </button>
      </div>
    </section>
  );
};

