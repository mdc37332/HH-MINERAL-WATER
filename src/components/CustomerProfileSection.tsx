import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerAddress } from '../types';
import { changeCustomerPassword } from '../lib/firebase';
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
  Clock,
  ArrowRight
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
  const [addressError, setAddressError] = useState('');

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Customer Account Sign In Required</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Please sign in or create an account to view and manage your profile, saved addresses, and personal order history.
        </p>
        <button
          onClick={() => openAuthModal('login', 'Sign in to access your Customer Profile & Saved Addresses')}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
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
    setAddressPincode('');
    setAddressIsDefault(customerProfile?.addresses?.length === 0);
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
      isDefault: addressIsDefault
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
        return <Home className="w-4 h-4 text-cyan-600" />;
      case 'Office':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'Event Venue':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'Warehouse':
        return <Building className="w-4 h-4 text-slate-800" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-cyan-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-cyan-500/30 shrink-0">
              {(customerProfile?.displayName || currentUser?.displayName || currentUser?.email || 'C')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {customerProfile?.displayName || currentUser?.displayName || 'Valued Customer'}
                </h1>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                  Customer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{currentUser.email}</span>
              </p>
              {customerProfile?.phone && (
                <p className="text-xs text-cyan-200/80 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{customerProfile.phone}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentSection('orders')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Package className="w-4 h-4 text-cyan-300" />
              <span>My Orders ({myOrders.length})</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 hover:text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-600" />
                <span>Personal Information</span>
              </h3>
              {!isEditingProfile && (
                <button
                  onClick={() => {
                    setEditName(customerProfile?.displayName || currentUser?.displayName || '');
                    setEditPhone(customerProfile?.phone || '');
                    setIsEditingProfile(true);
                  }}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email || ''}
                    className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Email is linked with your secure auth identity.</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Full Name</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {customerProfile?.displayName || currentUser?.displayName || 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Email Address</span>
                  <span className="font-semibold text-slate-900">{currentUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mobile Number</span>
                  <span className="font-semibold text-slate-900">
                    {customerProfile?.phone || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account UID</span>
                  <span className="font-mono text-[10px] text-slate-500 truncate block">
                    {currentUser.uid}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Security & Password Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-600" />
                <span>Security & Password</span>
              </h3>
            </div>

            {!isChangingPassword ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Keep your account secure with a strong password.
                </p>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {passwordError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError('');
                    }}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                  <span>Saved Delivery Addresses</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage multiple addresses for doorstep bottled water dispatch & bulk event venues.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="flex items-center gap-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </div>

            {/* Address List */}
            {(!customerProfile?.addresses || customerProfile.addresses.length === 0) ? (
              <div className="py-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No saved addresses yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Add your home, office, or event venue address for one-click checkout.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
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
                        ? 'border-cyan-300 bg-cyan-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                          {getAddressIcon(addr.label)}
                          <span>{addr.label}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Default</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        <p className="font-bold text-slate-800">{addr.name}</p>
                        <p className="line-clamp-2 leading-relaxed">{addr.address}</p>
                        {addr.landmark && (
                          <p className="text-[11px] text-slate-500 italic">Landmark: {addr.landmark}</p>
                        )}
                        <p className="font-medium text-slate-700">
                          {addr.city} - {addr.pincode}
                        </p>
                        <p className="text-slate-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{addr.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          className="font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAddress(addr.id)}
                          className="font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>

                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => saveAddress({ ...addr, isDefault: true })}
                          className="text-[11px] font-semibold text-slate-500 hover:text-cyan-700 cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-600" />
                  <span>My Orders & Official GST Invoices</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  View tracking details, delivery statuses, and download compliant 18% GST tax invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentSection('orders')}
                className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Tracker</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {myOrders.length === 0 ? (
              <div className="py-8 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Package className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No orders placed yet</p>
                <p className="text-[11px] text-slate-400">
                  Your mineral water orders and GST invoices will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.slice(0, 5).map(order => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-cyan-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{order.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'Dispatched' ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                        {order.invoiceNumber && (
                          <span className="text-[10px] bg-cyan-100 text-cyan-800 font-mono font-bold px-1.5 py-0.2 rounded">
                            {order.invoiceNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        {order.items.map(i => `${i.product.name} (${i.product.size}) × ${i.quantity}`).join(', ')}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </span>
                        <span className="font-bold text-slate-700">₹{order.totalAmount} ({order.paymentMethod})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => openInvoiceForOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                        title="View & Print GST Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                        <span>GST Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTrackOrderId(order.id);
                          setCurrentSection('orders');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-heading font-bold text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddressSubmit} className="p-6 space-y-4">
              {addressError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addressError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Address Type</label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {(['Home', 'Office', 'Event Venue', 'Warehouse'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressLabel(type)}
                      className={`py-2 rounded-xl border text-center transition-all cursor-pointer ${
                        addressLabel === type
                          ? 'bg-cyan-50 border-cyan-600 text-cyan-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient / Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressRecipientName}
                    onChange={e => setAddressRecipientName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressPhone}
                    onChange={e => setAddressPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Street Address / Building / Flat <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={addressStreet}
                  onChange={e => setAddressStreet(e.target.value)}
                  placeholder="e.g. Flat 4B, Blue Bell Residency, Park Street"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Landmark</label>
                  <input
                    type="text"
                    value={addressLandmark}
                    onChange={e => setAddressLandmark(e.target.value)}
                    placeholder="Near Metro Station"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressCity}
                    onChange={e => setAddressCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressPincode}
                    onChange={e => setAddressPincode(e.target.value)}
                    placeholder="e.g. 700001"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addressIsDefault}
                  onChange={e => setAddressIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                />
                <label htmlFor="defaultAddressCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
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
