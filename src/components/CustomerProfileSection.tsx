import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerAddress } from '../types';
import { normalizePhoneNumber } from '../lib/whatsapp';
import { changeCustomerPassword } from '../lib/firebase';
import { LocationPickerMap } from './LocationPickerMap';
import { createCustomerAddressMapUrl } from '../lib/googleMaps';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ShieldCheck,
  Package,
  Sparkles,
  Building,
  Home,
  Briefcase,
  AlertCircle,
  Save,
  X,
  Receipt,
  FileText,
  Printer,
  Clock,
  ArrowRight,
  ExternalLink,
  Compass
} from 'lucide-react';

export const CustomerProfileSection: React.FC = () => {
  const {
    currentUser,
    customerProfile,
    updateProfileData,
    saveAddress,
    deleteAddress,
    logout,
    myOrders,
    setCurrentSection,
    setTrackOrderId,
    openInvoiceForOrder,
    showToast,
    openAuthModal
  } = useStore();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(customerProfile?.displayName || currentUser?.displayName || '');
  const [editPhone, setEditPhone] = useState(customerProfile?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Address Manager State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Event Venue' | 'Warehouse' | 'Other'>('Home');
  const [addressRecipientName, setAddressRecipientName] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');
  const [addressCity, setAddressCity] = useState('Kolkata');
  const [addressPincode, setAddressPincode] = useState('');
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressLatitude, setAddressLatitude] = useState<number | undefined>(undefined);
  const [addressLongitude, setAddressLongitude] = useState<number | undefined>(undefined);
  const [addressAccuracy, setAddressAccuracy] = useState<number | undefined>(undefined);
  const [addressGateNote, setAddressGateNote] = useState<string>('');
  const [addressGoogleMapsUrl, setAddressGoogleMapsUrl] = useState<string>('');
  const [addressError, setAddressError] = useState('');

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-[#C5A059]/40 text-[#DFC283] flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Customer Account Sign In Required</h2>
        <p className="text-sm text-neutral-400 max-w-md mx-auto">
          Please sign in or create an account to view and manage your profile, saved addresses, and personal order history.
        </p>
        <button
          onClick={() => openAuthModal('login', 'Sign in to access your Customer Profile & Saved Addresses')}
          className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-bold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Validation', 'Name cannot be empty.', 'warning');
      return;
    }
    if (editPhone.trim()) {
      const phoneVal = normalizePhoneNumber(editPhone);
      if (!phoneVal.isValid) {
        showToast('Invalid Phone', phoneVal.error || 'Please enter a valid 10-digit mobile number.', 'warning');
        return;
      }
    }
    setProfileSaving(true);
    try {
      await updateProfileData({
        displayName: editName.trim(),
        phone: editPhone.trim()
      });
      setIsEditingProfile(false);
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Failed to update profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changeCustomerPassword(newPassword);
      showToast('Password Updated', 'Your security credentials have been updated.', 'success');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. You may need to sign in again first.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Open Address Modal
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressLabel('Home');
    setAddressRecipientName(customerProfile?.displayName || currentUser?.displayName || '');
    setAddressPhone(customerProfile?.phone || '');
    setAddressStreet('');
    setAddressLandmark('');
    setAddressCity('Kolkata');
    setAddressPincode('700091');
    setAddressIsDefault(customerProfile?.addresses?.length === 0);
    setAddressLatitude(undefined);
    setAddressLongitude(undefined);
    setAddressAccuracy(undefined);
    setAddressGateNote('');
    setAddressGoogleMapsUrl('');
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddressLabel(addr.label);
    setAddressRecipientName(addr.name);
    setAddressPhone(addr.phone);
    setAddressStreet(addr.address);
    setAddressLandmark(addr.landmark || '');
    setAddressCity(addr.city);
    setAddressPincode(addr.pincode);
    setAddressIsDefault(addr.isDefault);
    setAddressLatitude(addr.latitude);
    setAddressLongitude(addr.longitude);
    setAddressAccuracy(addr.accuracy);
    setAddressGateNote(addr.gateNote || '');
    setAddressGoogleMapsUrl(addr.googleMapsUrl || '');
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  // Save Address
  const handleSaveAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');

    if (!addressRecipientName.trim() || !addressPhone.trim() || !addressStreet.trim() || !addressPincode.trim()) {
      setAddressError('Please fill in all required address fields.');
      return;
    }

    const phoneVal = normalizePhoneNumber(addressPhone);
    if (!phoneVal.isValid) {
      setAddressError(phoneVal.error || 'Please provide a valid 10-digit mobile number.');
      return;
    }

    const cleanPin = addressPincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setAddressError('Please provide a valid 6-digit postal pincode.');
      return;
    }

    const newAddr: CustomerAddress = {
      id: editingAddressId || `addr-${Date.now()}`,
      label: addressLabel,
      name: addressRecipientName.trim(),
      phone: addressPhone.trim(),
      address: addressStreet.trim(),
      landmark: addressLandmark.trim() || undefined,
      city: addressCity.trim(),
      pincode: cleanPin,
      isDefault: addressIsDefault,
      latitude: addressLatitude,
      longitude: addressLongitude,
      accuracy: addressAccuracy,
      gateNote: addressGateNote.trim() || undefined,
      googleMapsUrl: addressLatitude && addressLongitude
        ? `https://www.google.com/maps/search/?api=1&query=${addressLatitude},${addressLongitude}`
        : addressGoogleMapsUrl || undefined
    };

    try {
      await saveAddress(newAddr);
      setIsAddressModalOpen(false);
    } catch (err: any) {
      setAddressError(err.message || 'Failed to save address.');
    }
  };

  // Helper for address label icons
  const getAddressIcon = (label: string) => {
    switch (label) {
      case 'Home':
        return <Home className="w-4 h-4 text-[#C5A059]" />;
      case 'Office':
        return <Briefcase className="w-4 h-4 text-[#DFC283]" />;
      case 'Event Venue':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'Warehouse':
        return <Building className="w-4 h-4 text-neutral-300" />;
      default:
        return <MapPin className="w-4 h-4 text-[#C5A059]" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Overview */}
      <div className="bg-[#121212] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#282828] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#C5A059] to-[#D4AF37] flex items-center justify-center text-black text-2xl sm:text-3xl font-black shadow-lg shadow-[#C5A059]/20 shrink-0">
              {(customerProfile?.displayName || currentUser?.displayName || currentUser?.email || 'C')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {customerProfile?.displayName || currentUser?.displayName || 'Valued Customer'}
                </h1>
                <span className="bg-[#C5A059]/15 text-[#DFC283] border border-[#C5A059]/40 text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full">
                  Customer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{currentUser.email}</span>
              </p>
              {customerProfile?.phone && (
                <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>{customerProfile.phone}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentSection('orders')}
              className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#252525] border border-[#333333] hover:border-[#C5A059]/50 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#C5A059]" />
              <span>My Orders ({myOrders.length})</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 hover:text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Details & Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Information & Password Security (1 col) */}
        <div className="space-y-6">
          {/* Profile Details Card */}
          <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#C5A059]" />
                <span>Personal Information</span>
              </h3>
              {!isEditingProfile && (
                <button
                  onClick={() => {
                    setEditName(customerProfile?.displayName || currentUser?.displayName || '');
                    setEditPhone(customerProfile?.phone || '');
                    setIsEditingProfile(true);
                  }}
                  className="text-xs font-bold text-[#DFC283] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white focus:border-[#C5A059] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white placeholder:text-neutral-500 focus:border-[#C5A059] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email || ''}
                    className="w-full px-3.5 py-2 text-sm bg-[#181818]/60 border border-[#282828] text-neutral-400 rounded-xl cursor-not-allowed"
                  />
                  <span className="text-[10px] text-neutral-500">Email is linked with your secure auth identity.</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-[#222222] rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-neutral-400 block">Full Name</span>
                  <span className="font-semibold text-white text-sm">
                    {customerProfile?.displayName || currentUser?.displayName || 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Email Address</span>
                  <span className="font-semibold text-white">{currentUser.email}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Mobile Number</span>
                  <span className="font-semibold text-white">
                    {customerProfile?.phone || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Account UID</span>
                  <span className="font-mono text-[10px] text-neutral-500 truncate block">
                    {currentUser.uid}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Security & Password Card */}
          <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C5A059]" />
                <span>Security & Password</span>
              </h3>
            </div>

            {!isChangingPassword ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-400">
                  Keep your account secure with a strong password.
                </p>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full bg-[#1c1c1c] hover:bg-[#242424] text-neutral-200 border border-[#333333] hover:border-[#C5A059]/40 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {passwordError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white focus:border-[#C5A059] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-type new password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white focus:border-[#C5A059] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError('');
                    }}
                    className="px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-[#222222] rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Saved Delivery Addresses (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C5A059]" />
                  <span>Saved Delivery Addresses</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Manage multiple addresses for doorstep bottled water dispatch & bulk event venues.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222222] text-[#DFC283] border border-[#C5A059]/40 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Add Address</span>
              </button>
            </div>

            {/* Address List */}
            {(!customerProfile?.addresses || customerProfile.addresses.length === 0) ? (
              <div className="py-12 text-center space-y-3 bg-[#161616] rounded-2xl border border-dashed border-[#2e2e2e]">
                <MapPin className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs font-bold text-neutral-300">No saved addresses yet</p>
                <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                  Add your home, office, or event venue address for one-click checkout.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="mt-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors"
                >
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customerProfile.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${
                      addr.isDefault
                        ? 'border-[#C5A059]/60 bg-[#171510] shadow-sm'
                        : 'border-[#262626] bg-[#161616] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-xs text-white">
                          {getAddressIcon(addr.label)}
                          <span>{addr.label}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Default</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-1 text-neutral-300">
                        <p className="font-bold text-white">{addr.name}</p>
                        <p className="line-clamp-2 leading-relaxed">{addr.address}</p>
                        {addr.landmark && (
                          <p className="text-[11px] text-neutral-400 italic">Landmark: {addr.landmark}</p>
                        )}
                        <p className="font-medium text-[#DFC283]">
                          {addr.city} - {addr.pincode}
                        </p>
                        <p className="text-neutral-400 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          <span>{addr.phone}</span>
                        </p>

                        {/* Customer Address Map Pin Indicator */}
                        <div className="pt-2 flex items-center justify-between border-t border-[#222222] mt-2">
                          {addr.latitude && addr.longitude ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>Map Pin Pinned ({addr.latitude.toFixed(3)}, {addr.longitude.toFixed(3)})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                              <MapPin className="w-3 h-3 text-neutral-500" />
                              <span>Postal Address</span>
                            </span>
                          )}

                          <a
                            href={createCustomerAddressMapUrl(
                              `${addr.address}, ${addr.city} ${addr.pincode}`,
                              addr.latitude && addr.longitude ? { lat: addr.latitude, lng: addr.longitude } : undefined
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium ml-auto"
                            title="View address pin on Google Maps"
                          >
                            <span>Open Pin</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          className="font-bold text-[#DFC283] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-[#C5A059]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAddress(addr.id)}
                          className="font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>

                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => saveAddress({ ...addr, isDefault: true })}
                          className="text-[11px] font-semibold text-neutral-400 hover:text-[#DFC283] cursor-pointer transition-colors"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders History & GST Invoices Card */}
          <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#C5A059]" />
                  <span>My Orders & Official GST Invoices</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  View tracking details, delivery statuses, and download compliant 18% GST tax invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSection('orders')}
                className="text-xs font-bold text-[#DFC283] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Full Tracker</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {myOrders.length === 0 ? (
              <div className="py-8 text-center space-y-2 bg-[#161616] rounded-2xl border border-dashed border-[#2a2a2a]">
                <Package className="w-7 h-7 text-neutral-600 mx-auto" />
                <p className="text-xs font-bold text-neutral-300">No orders placed yet</p>
                <p className="text-[11px] text-neutral-500">
                  Your mineral water orders and GST invoices will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.slice(0, 5).map(order => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl border border-[#262626] bg-[#161616] hover:bg-[#1a1a1a] hover:border-[#C5A059]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">{order.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          order.status === 'Delivered' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' :
                          order.status === 'Dispatched' ? 'bg-purple-950 text-purple-300 border border-purple-800/50' :
                          'bg-amber-950 text-amber-300 border border-amber-800/50'
                        }`}>
                          {order.status}
                        </span>
                        {order.invoiceNumber && (
                          <span className="text-[10px] bg-[#C5A059]/15 text-[#DFC283] border border-[#C5A059]/30 font-mono font-bold px-1.5 py-0.2 rounded">
                            {order.invoiceNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-300">
                        {order.items.map(i => `${i.product.name} (${i.product.size}) × ${i.quantity}`).join(', ')}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#C5A059]" />
                          <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </span>
                        <span className="font-bold text-[#DFC283]">₹{order.totalAmount} ({order.paymentMethod})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        id={`btn-profile-print-invoice-${order.id}`}
                        onClick={() => openInvoiceForOrder(order, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black text-xs font-black shadow-2xs transition-colors cursor-pointer"
                        title="Print Official GST Tax Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 text-black" />
                        <span>Print</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-profile-view-invoice-${order.id}`}
                        onClick={() => openInvoiceForOrder(order, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] border border-[#383838] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        title="View & Print GST Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTrackOrderId(order.id);
                          setCurrentSection('orders');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#333333] hover:bg-[#222222] text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>Track</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Address */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141414] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#2a2a2a] animate-in zoom-in-95">
            <div className="bg-[#101010] px-6 py-4 text-white flex items-center justify-between border-b border-[#242424] shrink-0">
              <h3 className="font-heading font-bold text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C5A059]" />
                <span>{editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddressSubmit} className="p-6 space-y-4 overflow-y-auto">
              {addressError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addressError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">Address Type</label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {(['Home', 'Office', 'Event Venue', 'Warehouse'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressLabel(type)}
                      className={`py-2 rounded-xl border text-center transition-all cursor-pointer ${
                        addressLabel === type
                          ? 'bg-[#C5A059]/15 border-[#C5A059] text-[#DFC283] font-black'
                          : 'bg-[#181818] border-[#2e2e2e] text-neutral-400 hover:bg-[#202020] hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Recipient / Contact Name <span className="text-[#C5A059]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressRecipientName}
                    onChange={e => setAddressRecipientName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white placeholder:text-neutral-500 focus:border-[#C5A059] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Mobile Number <span className="text-[#C5A059]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressPhone}
                    onChange={e => setAddressPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white placeholder:text-neutral-500 focus:border-[#C5A059] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Full Street Address / Building / Flat <span className="text-[#C5A059]">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={addressStreet}
                  onChange={e => setAddressStreet(e.target.value)}
                  placeholder="e.g. Flat 4B, Blue Bell Residency, Park Street"
                  className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white placeholder:text-neutral-500 focus:border-[#C5A059] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">Landmark</label>
                  <input
                    type="text"
                    value={addressLandmark}
                    onChange={e => setAddressLandmark(e.target.value)}
                    placeholder="Near Metro Station"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white placeholder:text-neutral-500 focus:border-[#C5A059] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    City <span className="text-[#C5A059]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressCity}
                    onChange={e => setAddressCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white focus:border-[#C5A059] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Pincode <span className="text-[#C5A059]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressPincode}
                    onChange={e => setAddressPincode(e.target.value)}
                    placeholder="e.g. 700001"
                    className="w-full px-3.5 py-2 text-sm bg-[#181818] border border-[#333333] rounded-xl text-white placeholder:text-neutral-500 focus:border-[#C5A059] outline-none"
                  />
                </div>
              </div>

              {/* Customer Address Google Maps Pinning */}
              <div className="pt-2 border-t border-[#262626]">
                <LocationPickerMap
                  customTitle="Pin Exact Delivery Point / House"
                  addressTextToPin={[addressStreet, addressLandmark, addressCity, addressPincode].filter(Boolean).join(', ')}
                  initialCoords={
                    addressLatitude && addressLongitude
                      ? { lat: addressLatitude, lng: addressLongitude }
                      : null
                  }
                  gateNote={addressGateNote}
                  onGateNoteChange={setAddressGateNote}
                  onLocationChange={loc => {
                    setAddressLatitude(loc.lat);
                    setAddressLongitude(loc.lng);
                    setAddressAccuracy(loc.accuracy);
                    if (loc.navigationUrl) setAddressGoogleMapsUrl(loc.navigationUrl);
                  }}
                  onAddressAutofill={autofill => {
                    if (autofill.address && (!addressStreet || addressStreet.length < 5)) {
                      setAddressStreet(autofill.address);
                    }
                    if (autofill.city) setAddressCity(autofill.city);
                    if (autofill.pincode) setAddressPincode(autofill.pincode);
                    if (autofill.landmark && !addressLandmark) setAddressLandmark(autofill.landmark);
                  }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addressIsDefault}
                  onChange={e => setAddressIsDefault(e.target.checked)}
                  className="rounded border-[#333333] bg-[#181818] text-[#C5A059] focus:ring-[#C5A059] h-4 w-4"
                />
                <label htmlFor="defaultAddressCheckbox" className="text-xs font-medium text-neutral-300 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242424]">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white hover:bg-[#222222] rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
