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
  const { setCurrentSection } = useStore();

  return (
    <footer className="bg-[#000000] text-white border-t border-[#222222] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#99732b] flex items-center justify-center text-black shadow-md shadow-[#C5A059]/20 font-black">
                <Droplets className="w-5 h-5 text-black fill-black" />
              </div>
              <div>
                <span className="font-heading text-lg font-black tracking-tight text-white">
                  HH <span className="text-[#C5A059]">MINERAL WATER</span>
                </span>
                <p className="text-[10px] text-[#C5A059]/80 font-bold uppercase tracking-widest">
                  Pure Pristine Hydration
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              Bottling pristine natural mineral water with 7-Stage UV & Ozonation purification and custom label branding for luxury weddings, corporate events, and daily household hydration.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={getCustomerSupportWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#141414] hover:bg-[#1e1e1e] text-[#DFC283] border border-[#C5A059]/40 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Direct WhatsApp: {OWNER_WHATSAPP_NUMBER}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-black text-white uppercase tracking-wider text-xs">
              Navigation
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#DFC283] transition-colors cursor-pointer"
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
                  className="hover:text-[#DFC283] transition-colors cursor-pointer"
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
                  className="hover:text-[#DFC283] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#C5A059]" />
                  <span>Custom Design Studio</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setCurrentSection('orders');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#DFC283] transition-colors cursor-pointer"
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
                  className="hover:text-[#DFC283] transition-colors cursor-pointer"
                >
                  HH Owner App
                </button>
              </li>
            </ul>
          </div>

          {/* Quality Seals */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-black text-white uppercase tracking-wider text-xs">
              Laboratory Certified
            </h4>
            <div className="space-y-2.5 text-neutral-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>BIS Standard Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>FSSAI Approved Plant</span>
              </div>
              <div className="flex items-center gap-2">
                <Recycle className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>100% Recyclable BPA-Free</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>7.4 pH Balanced Alkaline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-[#222222] text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HH MINERAL WATER. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-neutral-400">
            <span>Direct WhatsApp Helpline:</span>
            <span className="font-mono font-bold text-[#DFC283]">+91 {OWNER_WHATSAPP_NUMBER}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
