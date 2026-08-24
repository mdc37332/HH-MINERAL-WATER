import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Droplets,
  ShoppingBag,
  Sparkles,
  Search,
  Phone,
  ShieldCheck,
  Menu,
  X,
  Package,
  Layers,
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const Navbar: React.FC = () => {
  const {
    currentSection,
    setCurrentSection,
    totalCartItemsCount,
    setIsCartOpen,
    isAdminUnlocked,
    setIsAdminUnlocked,
    adminSettings
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  interface NavLinkItem {
    id: any;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  const navLinks: NavLinkItem[] = [
    { id: 'home', label: 'Home', icon: Droplets },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'custom-design', label: 'Custom Design', icon: Sparkles, badge: 'Hot' },
    { id: 'orders', label: 'Track Order', icon: Search },
    { id: 'contact', label: 'Contact', icon: HelpCircle }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-sky-900 to-blue-900 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="hidden sm:inline">100% Pure Natural Mineral Water • 7-Stage UV & Ozonated Filtration</span>
            <span className="sm:hidden">HH Mineral Water • Free Local Delivery</span>
          </div>
          <div className="flex items-center gap-4 text-cyan-200">
            <a
              href={`tel:${adminSettings.helplinePhone}`}
              className="hidden md:flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call: +91 {OWNER_WHATSAPP_NUMBER}</span>
            </a>
            <a
              href={getCustomerSupportWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>WhatsApp: {OWNER_WHATSAPP_NUMBER}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setCurrentSection('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
              <Droplets className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-xl font-extrabold tracking-tight text-slate-900">
                  HH <span className="text-cyan-600">MINERAL WATER</span>
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                Pure Pristine Hydration
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = currentSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setCurrentSection(link.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-600 text-white shadow-xs">
                      {link.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-cyan-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Admin Portal Button */}
            <button
              onClick={() => {
                setCurrentSection('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                currentSection === 'admin'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
              }`}
              title="HH Owner / Admin Panel"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-600" />
              <span className="hidden sm:inline">Owner App</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartItemsCount > 0 && (
                <span className="bg-white text-cyan-700 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-xs">
                  {totalCartItemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = currentSection === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setCurrentSection(link.id);
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-600 text-white">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => {
              setCurrentSection('admin');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white"
          >
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <span>HH Owner / Admin Panel</span>
          </button>
        </div>
      )}
    </header>
  );
};
