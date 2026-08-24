/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProductCatalogSection } from './components/ProductCatalogSection';
import { CustomDesignStudio } from './components/CustomDesignStudio';
import { OrderTracking } from './components/OrderTracking';
import { AdminPanel } from './components/AdminPanel';
import { ContactSection } from './components/ContactSection';
import { CartDrawer } from './components/CartDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ToastContainer } from './components/ToastContainer';
import { Footer } from './components/Footer';
import {
  Sparkles,
  Droplets,
  ShieldCheck,
  Award,
  Truck,
  Phone,
  Heart,
  ChevronRight,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from './lib/whatsapp';

const MainContent: React.FC = () => {
  const {
    currentSection,
    setCurrentSection,
    selectedProductForDetail,
    setSelectedProductForDetail
  } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-cyan-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Dynamic View Switching */}
      <main className="flex-1">
        {currentSection === 'home' && (
          <div className="space-y-4">
            <HeroSection />

            {/* Quality & Filtration Features Banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">7-Stage UV & Ozonated</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Dual micro-filtered purification</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">7.4 pH Balanced Alkaline</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Enriched with Calcium & Magnesium</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Custom Label Design</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">For weddings & corporate events</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Fast Doorstep Delivery</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Direct from HH bottling plant</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Product Catalog Section */}
            <ProductCatalogSection />

            {/* Purity & Mineral Breakdown Infographic */}
            <section className="bg-gradient-to-b from-white via-cyan-50/40 to-white py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-600">
                    Laboratory Certified Composition
                  </span>
                  <h2 className="font-heading text-3xl font-extrabold text-slate-900">
                    Why Choose <span className="text-cyan-600">HH Mineral Water</span>?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Every bottle meets stringent BIS and international health standards with essential mineral electrolytes for deep cellular hydration.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 text-center">
                  {[
                    { label: 'Calcium (Ca++)', val: '22 mg/L', desc: 'Strengthens bones & teeth' },
                    { label: 'Magnesium (Mg++)', val: '11 mg/L', desc: 'Sustained muscle vitality' },
                    { label: 'Potassium (K+)', val: '4.1 mg/L', desc: 'Electrolyte balance' },
                    { label: 'Silica (SiO2)', val: '14 mg/L', desc: 'Promotes radiant skin' },
                    { label: 'Alkaline pH', val: '7.4 pH', desc: 'Reduces body acidity' },
                    { label: 'Optimal TDS', val: '125 ppm', desc: 'Pure velvety taste' }
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-4 border border-cyan-200/80 shadow-2xs flex flex-col justify-between space-y-2"
                    >
                      <span className="text-[11px] font-bold text-slate-500 uppercase">{stat.label}</span>
                      <span className="font-heading text-xl font-black text-cyan-700">{stat.val}</span>
                      <span className="text-[10px] text-slate-400">{stat.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Contact & Enquiry */}
            <ContactSection />
          </div>
        )}

        {currentSection === 'products' && (
          <div className="py-6">
            <ProductCatalogSection />
          </div>
        )}

        {currentSection === 'custom-design' && (
          <div className="py-6">
            <CustomDesignStudio />
          </div>
        )}

        {currentSection === 'orders' && (
          <div className="py-6">
            <OrderTracking />
          </div>
        )}

        {currentSection === 'admin' && (
          <div className="py-6">
            <AdminPanel />
          </div>
        )}

        {currentSection === 'contact' && (
          <div className="py-6">
            <ContactSection />
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {/* Cart Slide-Over Drawer */}
      <CartDrawer />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}
