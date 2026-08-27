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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] sm:h-[70px] flex items-center">
        <div className="flex items-center justify-between w-full h-[60px] sm:h-[70px]">
          {/* Left Corner: Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Menu Option in Left Corner */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 border border-slate-200/80 shadow-2xs transition-all cursor-pointer flex items-center justify-center"
              aria-label="Toggle Menu"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                <div className="flex items-center gap-1">
                  <span className="font-heading text-[15px] font-extrabold tracking-tight text-slate-900 leading-tight">
                    HH <span className="text-cyan-600">MINERAL WATER</span>
                  </span>
                </div>
                <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase leading-none mt-0.5">
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
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-cyan-600 text-white shadow-xs">
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
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Customer Authentication State / Profile Pill */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    currentSection === 'profile'
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    {(customerProfile?.displayName || currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {customerProfile?.displayName || currentUser.displayName || 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {customerProfile?.displayName || currentUser.displayName || 'Customer'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentSection('profile');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-600" />
                      <span>My Profile & Addresses</span>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentSection('orders');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-cyan-600" />
                        <span>My Orders</span>
                      </div>
                      {myOrders.length > 0 && (
                        <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {myOrders.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentSection('admin');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-cyan-600" />
                      <span>Owner / Admin Panel</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
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
                className="w-[88px] flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 py-2 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer text-center"
              >
                <UserIcon className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>Sign In</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartItemsCount > 0 && (
                <span className="bg-white text-cyan-700 font-extrabold text-[11px] px-1.5 py-0.2 rounded-full shadow-xs">
                  {totalCartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2">
          {currentUser ? (
            <div className="p-3 bg-cyan-50/70 border border-cyan-100 rounded-2xl mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-cyan-900">{customerProfile?.displayName || currentUser.displayName || 'Customer'}</p>
                <p className="text-[11px] text-cyan-700">{currentUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setCurrentSection('profile');
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-cyan-700 underline"
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-xl font-bold text-sm mb-2"
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

          {currentUser && (
            <button
              onClick={() => {
                setCurrentSection('profile');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserIcon className="w-5 h-5 text-cyan-600" />
              <span>My Profile & Saved Addresses</span>
            </button>
          )}

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

          {currentUser && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
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

