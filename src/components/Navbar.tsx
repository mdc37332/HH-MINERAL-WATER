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
  KeyRound,
  User as UserIcon,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const Navbar: React.FC = () => {
  const {
    currentSection,
    setCurrentSection,
    totalCartItemsCount,
    setIsCartOpen,
    currentUser,
    customerProfile,
    openAuthModal,
    logout,
    myOrders,
    adminSettings
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
    { id: 'orders', label: currentUser ? 'My Orders' : 'Track Order', icon: Search, badge: currentUser && myOrders.length > 0 ? `${myOrders.length}` : undefined },
    { id: 'contact', label: 'Contact', icon: HelpCircle },
    { id: 'admin', label: 'Owner App', icon: KeyRound }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#000000]/95 backdrop-blur-md border-b border-[#222222] shadow-xl">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[64px] sm:h-[72px] flex items-center">
        <div className="flex items-center justify-between w-full h-[64px] sm:h-[72px]">
          {/* Left Corner: Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Menu Option in Left Corner */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-neutral-300 hover:text-[#DFC283] bg-[#121212] hover:bg-[#181818] border border-[#282828] hover:border-[#C5A059]/40 shadow-xs transition-all cursor-pointer flex items-center justify-center"
              aria-label="Toggle Menu"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#C5A059]" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo */}
            <button
              onClick={() => {
                setCurrentSection('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center text-left group cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading text-[16px] sm:text-[17px] font-black tracking-tight text-white leading-tight">
                    HH <span className="text-[#C5A059]">MINERAL WATER</span>
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-semibold tracking-widest text-[#C5A059]/80 uppercase leading-none mt-0.5">
                  Pure Pristine Hydration
                </p>
              </div>
            </button>
          </div>

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
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#181818] text-[#DFC283] font-semibold border border-[#C5A059]/30 shadow-xs'
                      : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-neutral-400'}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.2 rounded-full bg-[#C5A059] text-black shadow-xs">
                      {link.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C5A059] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Customer Authentication State / Profile Pill */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    currentSection === 'profile'
                      ? 'bg-[#1c1c1c] border-[#C5A059]/50 text-[#DFC283]'
                      : 'bg-[#121212] hover:bg-[#181818] border-[#282828] text-neutral-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#C5A059] to-[#DFC283] text-black flex items-center justify-center text-xs font-black shadow-xs">
                    {(customerProfile?.displayName || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {customerProfile?.displayName || currentUser.displayName || 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-[#121212] rounded-2xl shadow-2xl border border-[#282828] py-2 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-[#222222]">
                      <p className="text-xs font-bold text-white truncate">
                        {customerProfile?.displayName || currentUser.displayName || 'Customer'}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentSection('profile');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-300 hover:bg-[#1a1a1a] hover:text-[#DFC283] flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-[#C5A059]" />
                      <span>My Profile & Addresses</span>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentSection('orders');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-300 hover:bg-[#1a1a1a] hover:text-[#DFC283] flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#C5A059]" />
                        <span>My Orders</span>
                      </div>
                      {myOrders.length > 0 && (
                        <span className="bg-[#C5A059] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                          {myOrders.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentSection('admin');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-neutral-300 hover:bg-[#1a1a1a] hover:text-[#DFC283] flex items-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-[#C5A059]" />
                      <span>Owner / Admin Panel</span>
                    </button>

                    <div className="border-t border-[#222222] my-1" />

                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login', 'Sign in to place orders, save designs & track delivery.')}
                className="flex items-center justify-center gap-1 sm:gap-1.5 bg-[#121212] hover:bg-[#181818] text-[#DFC283] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold border border-[#C5A059]/30 hover:border-[#C5A059] transition-all cursor-pointer text-center whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="text-[11px] sm:text-xs">Sign In</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-[#C5A059]/20 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartItemsCount > 0 && (
                <span className="bg-black text-[#DFC283] font-black text-[11px] px-1.5 py-0.2 rounded-full border border-[#C5A059]/30 shadow-xs">
                  {totalCartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#222222] bg-[#0a0a0a] px-4 sm:px-6 py-4 space-y-2 shadow-2xl animate-in slide-in-from-top-2">
          {currentUser ? (
            <div className="p-3 bg-[#141414] border border-[#282828] rounded-2xl mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{customerProfile?.displayName || currentUser.displayName || 'Customer'}</p>
                <p className="text-[11px] text-neutral-400">{currentUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setCurrentSection('profile');
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-[#DFC283] underline cursor-pointer"
              >
                Profile
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthModal('login', 'Sign in to access your orders & checkout');
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black py-3 rounded-xl font-bold text-sm mb-2 cursor-pointer shadow-md"
            >
              <UserIcon className="w-4 h-4" />
              <span>Customer Sign In / Register</span>
            </button>
          )}

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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-[#181818] text-[#DFC283] font-bold border border-[#C5A059]/30' : 'text-neutral-300 hover:bg-[#141414]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#C5A059]' : 'text-neutral-400'}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C5A059] text-black">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}

          {currentUser && (
            <button
              onClick={() => {
                setCurrentSection('profile');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-neutral-300 hover:bg-[#141414] cursor-pointer"
            >
              <UserIcon className="w-5 h-5 text-[#C5A059]" />
              <span>My Profile & Saved Addresses</span>
            </button>
          )}

          <button
            onClick={() => {
              setCurrentSection('admin');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-[#161616] text-[#DFC283] border border-[#2a2a2a] cursor-pointer"
          >
            <KeyRound className="w-5 h-5 text-[#C5A059]" />
            <span>HH Owner / Admin Panel</span>
          </button>

          {currentUser && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};

