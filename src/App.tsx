/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component } from 'react';
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
import { CustomerProfileSection } from './components/CustomerProfileSection';
import { AuthModal } from './components/AuthModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { GstInvoiceModal } from './components/GstInvoiceModal';
import { ToastContainer } from './components/ToastContainer';
import { Footer } from './components/Footer';
import { CustomerSupportAiModal } from './components/CustomerSupportAiModal';
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare setState: (
    state: ErrorBoundaryState | ((prev: ErrorBoundaryState) => ErrorBoundaryState)
  ) => void;
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected display error occurred.'
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121212] border border-[#C5A059]/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#DFC283]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-xl font-black text-white">
              Something Interrupted This View
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {this.state.message}
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-black text-xs cursor-pointer hover:brightness-110 transition-all"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] text-neutral-200 border border-[#333333] font-bold text-xs cursor-pointer transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MainContent: React.FC = () => {
  const {
    products,
    currentSection,
    setCurrentSection,
    selectedProductForDetail,
    setSelectedProductForDetail,
    recentCreatedOrder,
    setRecentCreatedOrder,
    activeInvoice,
    setActiveInvoice,
    activeInvoiceAutoPrint,
    setActiveInvoiceAutoPrint
  } = useStore();

  const liveSelectedProductForDetail = React.useMemo(() => {
    if (!selectedProductForDetail) return null;
    return products.find(p => p.id === selectedProductForDetail.id) || selectedProductForDetail;
  }, [products, selectedProductForDetail]);

  const [hydrationAdvisorGoal, setHydrationAdvisorGoal] = React.useState<'events' | 'corporate' | 'household' | 'dining'>('events');

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-[#000000] text-neutral-100 selection:bg-[#C5A059] selection:text-black">
      {/* Navigation Header */}
      <Navbar />

      {/* Dynamic View Switching */}
      <main className="flex-1">
        {currentSection === 'home' && (
          <div className="space-y-6">
            <HeroSection />

            {/* Quality & Filtration Features Banner */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#121212] p-5 rounded-2xl border border-[#242424] hover:border-[#C5A059]/40 shadow-sm flex items-center gap-4 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#DFC283] flex items-center justify-center shrink-0">
                    <Droplets className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">7-Stage UV & Ozonated</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Dual micro-filtered pristine purity</p>
                  </div>
                </div>

                <div className="bg-[#121212] p-5 rounded-2xl border border-[#242424] hover:border-[#C5A059]/40 shadow-sm flex items-center gap-4 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#DFC283] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">7.4 pH Balanced Alkaline</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Enriched with Calcium & Magnesium</p>
                  </div>
                </div>

                <div className="bg-[#121212] p-5 rounded-2xl border border-[#242424] hover:border-[#C5A059]/40 shadow-sm flex items-center gap-4 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#DFC283] flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Bespoke Label Atelier</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">For luxury weddings & corporate galas</p>
                  </div>
                </div>

                <div className="bg-[#121212] p-5 rounded-2xl border border-[#242424] hover:border-[#C5A059]/40 shadow-sm flex items-center gap-4 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#DFC283] flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Express Fleet Dispatch</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Direct from HH bottling facility</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Product Catalog Section */}
            <ProductCatalogSection />

            {/* Purity & Mineral Breakdown Infographic */}
            <section className="bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#0a0a0a] py-16 px-4 sm:px-6 lg:px-8 border-y border-[#222222]">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center max-w-2xl mx-auto space-y-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#C5A059] px-3.5 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 inline-block">
                    Laboratory Certified Composition
                  </span>
                  <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                    Why Choose <span className="text-[#DFC283]">HH Mineral Water</span>?
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    Every bottle meets stringent BIS and international health standards with essential mineral electrolytes for deep cellular hydration.
                  </p>
                </div>

                {/* Mineral Metric Cards in Graphite & Gold */}
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
                      className="bg-[#141414] rounded-2xl p-4 border border-[#262626] hover:border-[#C5A059]/50 shadow-sm flex flex-col justify-between space-y-2 transition-all hover:-translate-y-0.5"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{stat.label}</span>
                      <span className="font-heading text-xl sm:text-2xl font-black text-[#DFC283]">{stat.val}</span>
                      <span className="text-[10px] text-neutral-500">{stat.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Quality & Hydration Advisor Interactive Widget */}
                <div className="mt-8 bg-[#121212] border border-[#282828] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2 text-[#C5A059] text-xs font-bold uppercase tracking-wider">
                        <Award className="w-4 h-4" />
                        <span>Interactive Volume & Event Advisor</span>
                      </div>
                      <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">
                        Curated Bottling for Every Setting
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Select your occasion to view our certified packaging recommendations, custom foil stamping options, and volume discounts.
                      </p>
                    </div>

                    {/* Occasion Selector Pills */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'events', label: 'Weddings & Galas', bottle: '250ml / 500ml', hint: 'Gold Foil Custom Labels' },
                        { id: 'corporate', label: 'Executive Boardrooms', bottle: '500ml / 1L', hint: 'Minimal Matte Finishes' },
                        { id: 'dining', label: 'Luxury Hospitality', bottle: '250ml / 1L', hint: 'Artisan Table Water' },
                        { id: 'household', label: 'Home Hydration', bottle: '1L / 2L Packs', hint: 'Daily Mineral Balance' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setHydrationAdvisorGoal(tab.id as any)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            hydrationAdvisorGoal === tab.id
                              ? 'bg-[#C5A059] text-black shadow-md shadow-[#C5A059]/20'
                              : 'bg-[#181818] text-neutral-300 hover:bg-[#222222] border border-[#2a2a2a]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Advisor Details Bar */}
                  <div className="mt-6 pt-6 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-[#161616] p-4 rounded-xl border border-[#262626]">
                      <span className="text-neutral-500 uppercase text-[10px] font-bold block">Recommended Sizes</span>
                      <p className="text-white font-bold text-sm mt-1">
                        {hydrationAdvisorGoal === 'events' && '250ml Pocket & 500ml Signature Bottles'}
                        {hydrationAdvisorGoal === 'corporate' && '500ml Executive & 1L Boardroom Bottles'}
                        {hydrationAdvisorGoal === 'dining' && '250ml Banquet & 1L Premium Spring Bottles'}
                        {hydrationAdvisorGoal === 'household' && '1L Family Packs & 2L Hydration Bottles'}
                      </p>
                    </div>
                    <div className="bg-[#161616] p-4 rounded-xl border border-[#262626]">
                      <span className="text-neutral-500 uppercase text-[10px] font-bold block">Customization Feature</span>
                      <p className="text-[#DFC283] font-bold text-sm mt-1">
                        {hydrationAdvisorGoal === 'events' && 'Gold / Silver Embossed Custom Monogram'}
                        {hydrationAdvisorGoal === 'corporate' && 'High-Res Corporate Brand & QR Code Sync'}
                        {hydrationAdvisorGoal === 'dining' && 'Table Numbering & Restaurant Branding'}
                        {hydrationAdvisorGoal === 'household' && 'Direct Weekly Bottling Subscription'}
                      </p>
                    </div>
                    <div className="bg-[#161616] p-4 rounded-xl border border-[#262626] flex items-center justify-between">
                      <div>
                        <span className="text-neutral-500 uppercase text-[10px] font-bold block">Next Step</span>
                        <p className="text-white font-bold text-sm mt-1">Explore Options</p>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentSection(hydrationAdvisorGoal === 'events' || hydrationAdvisorGoal === 'corporate' ? 'custom-design' : 'products');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 bg-[#222222] hover:bg-[#C5A059] hover:text-black text-[#DFC283] rounded-lg text-xs font-bold border border-[#C5A059]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{hydrationAdvisorGoal === 'events' || hydrationAdvisorGoal === 'corporate' ? 'Design Labels' : 'View Catalog'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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

        {currentSection === 'profile' && (
          <div className="py-6">
            <CustomerProfileSection />
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
      {liveSelectedProductForDetail && (
        <ProductDetailModal
          product={liveSelectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {/* Cart Slide-Over Drawer */}
      <CartDrawer />

      {/* Global Auth Modal */}
      <AuthModal />

      {/* Order Success Popup */}
      {recentCreatedOrder && (
        <OrderSuccessModal
          order={recentCreatedOrder}
          onClose={() => setRecentCreatedOrder(null)}
        />
      )}

      {/* Official GST Tax Invoice Modal */}
      {activeInvoice && (
        <div className="gst-invoice-modal-root">
          <GstInvoiceModal
            invoice={activeInvoice}
            isOpen={!!activeInvoice}
            onClose={() => {
              setActiveInvoice(null);
              setActiveInvoiceAutoPrint(false);
            }}
            initialAutoPrint={activeInvoiceAutoPrint}
          />
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Customer-Isolated Support AI Assistant (AGENT_03_SUPPORT) */}
      <CustomerSupportAiModal />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <StoreProvider>
        <MainContent />
      </StoreProvider>
    </AppErrorBoundary>
  );
}
