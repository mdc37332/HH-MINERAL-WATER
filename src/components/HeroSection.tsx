import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  Droplets,
  Sparkles,
  ShieldCheck,
  Award,
  ArrowRight,
  Truck,
  CheckCircle2,
  Phone,
  Layers,
  Heart,
  Edit3,
  Camera
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const HeroSection: React.FC = () => {
  const { setCurrentSection, adminSettings, isAdminUnlocked } = useStore();

  const heroImage = adminSettings.heroBannerImage || 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-cyan-500/15 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-extrabold uppercase tracking-widest shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Certified Pristine Natural Mineral Water</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Purity in Every Drop. <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent">
                Crafted for Every Occasion.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Experience ultra-pure mineral water purified through our signature <strong>7-Stage UV & Ozonated</strong> filtration with balanced <strong>7.4 pH alkaline</strong> minerals. Available in 250ml, 500ml, 1L, and 2L, starting at just <strong>₹5</strong>.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={() => {
                  setCurrentSection('products');
                  window.scrollTo({ top: 500, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm px-8 py-4 rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Shop Mineral Bottles (From ₹5)</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              <button
                onClick={() => {
                  setCurrentSection('custom-design');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-6 py-4 rounded-2xl border border-white/25 backdrop-blur-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Custom Label Design for Events</span>
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <span className="font-heading text-xl sm:text-2xl font-extrabold text-cyan-400">7.4 pH</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Alkaline Balance</span>
              </div>
              <div className="text-center lg:text-left">
                <span className="font-heading text-xl sm:text-2xl font-extrabold text-cyan-400">7-Stage</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">UV & Ozonation</span>
              </div>
              <div className="text-center lg:text-left">
                <span className="font-heading text-xl sm:text-2xl font-extrabold text-cyan-400">₹5 Only</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Starting Price</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center group">
            {/* Spotlight Glow */}
            <div className="relative w-full max-w-md aspect-square bg-gradient-to-b from-cyan-500/20 via-blue-600/10 to-transparent rounded-full p-8 flex items-center justify-center border border-cyan-400/20 shadow-2xl">
              <img
                src={heroImage}
                alt="HH Mineral Water Premium Bottle"
                className="max-h-[85%] object-contain filter drop-shadow-[0_20px_35px_rgba(6,182,212,0.35)] animate-water-pulse transition-all duration-300"
              />

              {/* Quick Admin Image Edit Button */}
              <button
                onClick={() => {
                  setCurrentSection('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="absolute inset-x-auto top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-slate-900/90 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer z-30"
                title="Change bottle image in Admin Panel"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Change Image (Admin)</span>
              </button>

              {/* Floating feature pills */}
              <div className="absolute top-6 left-2 bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Natural Minerals</p>
                  <p className="text-xs font-bold text-white">Magnesium & Calcium</p>
                </div>
              </div>

              <div className="absolute bottom-6 right-2 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">BIS & FSSAI</p>
                  <p className="text-xs font-bold text-emerald-300">100% Laboratory Certified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
