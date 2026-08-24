import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  Droplets,
  ShieldCheck,
  Award,
  Recycle,
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Heart
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const Footer: React.FC = () => {
  const { setCurrentSection, adminSettings } = useStore();

  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="font-heading text-lg font-extrabold tracking-tight text-white">
                  HH <span className="text-cyan-400">MINERAL WATER</span>
                </span>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Pure Pristine Hydration
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Bottling pristine natural mineral water with 7-Stage UV & Ozonation purification and custom label branding for luxury weddings, corporate events, and daily household hydration.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={getCustomerSupportWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp: {OWNER_WHATSAPP_NUMBER}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Navigation
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('products');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Product Catalog (250ml - 2L)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('custom-design');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Custom Design Studio</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('orders');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Track Order
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 transition-colors"
                >
                  HH Owner App
                </button>
              </li>
            </ul>
          </div>

          {/* Bottle Sizes */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Bottle Variants
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex justify-between max-w-[140px]">
                <span>250ml Pocket</span>
                <span className="font-bold text-white">₹5</span>
              </li>
              <li className="flex justify-between max-w-[140px]">
                <span>500ml Daily</span>
                <span className="font-bold text-white">₹8</span>
              </li>
              <li className="flex justify-between max-w-[140px]">
                <span>1L Spring</span>
                <span className="font-bold text-white">₹10</span>
              </li>
              <li className="flex justify-between max-w-[140px]">
                <span>2L Family</span>
                <span className="font-bold text-white">₹25</span>
              </li>
            </ul>
          </div>

          {/* Quality Seals */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Laboratory Certified
            </h4>
            <div className="space-y-2 text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>BIS Standard Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>FSSAI Approved Plant</span>
              </div>
              <div className="flex items-center gap-2">
                <Recycle className="w-4 h-4 text-sky-400 shrink-0" />
                <span>100% Recyclable BPA-Free</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                <span>7.4 pH Balanced Alkaline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HH MINERAL WATER. All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            <span>Direct WhatsApp Helpline:</span>
            <span className="font-mono font-bold text-cyan-400">+91 {OWNER_WHATSAPP_NUMBER}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
