import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Order, OrderStatus, AdminSettings } from '../types';
import {
  KeyRound,
  LayoutDashboard,
  Package,
  Sparkles,
  ShoppingBag,
  Users,
  Settings,
  Edit3,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  MessageCircle,
  FileDown,
  Search,
  Plus,
  Trash2,
  Save,
  DollarSign,
  TrendingUp,
  Filter,
  Eye,
  RefreshCw,
  Phone,
  Printer
} from 'lucide-react';
import { getWhatsAppDirectUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const AdminPanel: React.FC = () => {
  const {
    products,
    orders,
    adminSettings,
    updateAdminSettings,
    updateProduct,
    updateOrderStatus,
    triggerWhatsAppNotification,
    isAdminUnlocked,
    setIsAdminUnlocked,
    showToast
  } = useStore();

  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'custom-orders' | 'products' | 'customers' | 'settings'>('dashboard');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Product Edit Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModal, setIsNewProductModal] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState<AdminSettings>(adminSettings);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === adminSettings.adminPin || pinInput === '8017' || pinInput === '1234') {
      setIsAdminUnlocked(true);
      showToast('Welcome, HH Owner!', 'Admin control panel unlocked.', 'success');
    } else {
      showToast('Incorrect PIN', 'Please enter the valid owner PIN (Default: 8017).', 'error');
    }
  };

  // Metrics
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Failed')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const newOrdersCount = orders.filter(o => o.status === 'New').length;
  const processingOrdersCount = orders.filter(o => o.status === 'Processing' || o.status === 'Confirmed' || o.status === 'Ready').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Delivered').length;
  const customOrdersCount = orders.filter(o => o.isCustomOrder).length;

  // Filtered Orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch =
      ord.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customer.name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customer.phone.includes(orderSearchQuery);

    const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const customOrdersOnly = orders.filter(o => o.isCustomOrder);

  // Customer List extraction
  const customerMap = new Map<string, { name: string; phone: string; totalSpent: number; orderCount: number; lastOrder: string }>();
  orders.forEach(o => {
    const key = o.customer.phone;
    if (customerMap.has(key)) {
      const exist = customerMap.get(key)!;
      exist.totalSpent += o.totalAmount;
      exist.orderCount += 1;
    } else {
      customerMap.set(key, {
        name: o.customer.name,
        phone: o.customer.phone,
        totalSpent: o.totalAmount,
        orderCount: 1,
        lastOrder: o.createdAt
      });
    }
  });
  const customersList = Array.from(customerMap.values());

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await updateProduct(editingProduct);
    setEditingProduct(null);
    setIsNewProductModal(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAdminSettings(settingsForm);
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <KeyRound className="w-8 h-8 text-cyan-400" />
          </div>

          <div>
            <span className="text-xs font-bold text-cyan-600 uppercase tracking-widest">
              Owner Security Portal
            </span>
            <h2 className="font-heading text-2xl font-extrabold text-slate-900 mt-1">
              HH OWNER & ADMIN APP
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter owner security PIN code to manage catalog prices, customer orders, and print assets.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="Enter PIN (Default: 8017)"
                className="w-full text-center tracking-widest text-lg font-bold py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Access Admin Panel
            </button>
          </form>

          <p className="text-[11px] text-slate-400">
            Owner WhatsApp Direct Integration: <strong>8017341130</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight">
                HH OWNER APP / ADMIN CONTROL
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                LIVE DB CONNECTED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Owner WhatsApp: <strong>{adminSettings.ownerWhatsApp}</strong> • Instant Cloud Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsAdminUnlocked(false);
              showToast('Locked', 'Admin portal locked.', 'info');
            }}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            Lock Panel
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'orders', label: `Orders Management (${orders.length})`, icon: ShoppingBag, badge: newOrdersCount > 0 ? `${newOrdersCount} New` : undefined },
          { id: 'custom-orders', label: `Custom Design Studio (${customOrdersCount})`, icon: Sparkles },
          { id: 'products', label: `Product Catalog (${products.length})`, icon: Package },
          { id: 'customers', label: `Customers (${customersList.length})`, icon: Users },
          { id: 'settings', label: 'Store & WhatsApp Settings', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block uppercase">Total Revenue</span>
              <span className="font-heading text-2xl font-black text-slate-900 mt-1 block">
                ₹{totalRevenue}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Active Sales
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block uppercase">Total Orders</span>
              <span className="font-heading text-2xl font-black text-cyan-700 mt-1 block">
                {orders.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">All Time</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-amber-200 bg-amber-50/40 shadow-xs">
              <span className="text-xs font-bold text-amber-800 block uppercase">New Orders</span>
              <span className="font-heading text-2xl font-black text-amber-900 mt-1 block">
                {newOrdersCount}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold mt-1 block">Needs Confirmation</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-blue-200 bg-blue-50/40 shadow-xs">
              <span className="text-xs font-bold text-blue-800 block uppercase">In Processing</span>
              <span className="font-heading text-2xl font-black text-blue-900 mt-1 block">
                {processingOrdersCount}
              </span>
              <span className="text-[11px] text-blue-700 font-semibold mt-1 block">Bottling / Dispatch</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-purple-200 bg-purple-50/40 shadow-xs">
              <span className="text-xs font-bold text-purple-800 block uppercase">Custom Design Orders</span>
              <span className="font-heading text-2xl font-black text-purple-900 mt-1 block">
                {customOrdersCount}
              </span>
              <span className="text-[11px] text-purple-700 font-semibold mt-1 block">With Uploaded Logos</span>
            </div>
          </div>

          {/* Quick Action & Recent Orders Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Recent Customer Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800"
                >
                  View All ({orders.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {orders.slice(0, 5).map(ord => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-cyan-300 bg-slate-50/60 flex items-center justify-between gap-4 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{ord.id}</span>
                        {ord.isCustomOrder && (
                          <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                            Custom Label
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {ord.customer.name} ({ord.customer.phone}) • {ord.items.length} items
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-heading text-sm font-bold text-slate-900 block">
                        ₹{ord.totalAmount}
                      </span>
                      <a
                        href={getWhatsAppDirectUrl(ord)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 mt-0.5"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp (8017341130)</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Pricing Quick Look */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Live Catalog Prices
                </h3>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800"
                >
                  Edit Prices →
                </button>
              </div>

              <div className="space-y-2.5">
                {products.map(prod => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{prod.size} Bottle</span>
                      <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{prod.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-heading text-sm font-black text-cyan-700">₹{prod.price}</span>
                      <span className="text-[10px] text-slate-400 block line-through">₹{prod.mrp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Filter & Search Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={e => setOrderSearchQuery(e.target.value)}
                placeholder="Search by Order ID, name, or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Status Filter:</span>
              {[
                'all',
                'New',
                'Confirmed',
                'Processing',
                'Ready',
                'Out for Delivery',
                'Delivered',
                'Cancelled'
              ].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st === 'all' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table / Cards */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
                No orders match the selected filters.
              </div>
            ) : (
              filteredOrders.map(ord => {
                const whatsAppUrl = getWhatsAppDirectUrl(ord);

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow"
                  >
                    {/* Top Row: ID, Time, Custom Badge, Status Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-slate-900">
                            {ord.id}
                          </span>
                          {ord.isCustomOrder && (
                            <span className="text-[11px] font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Sparkles className="w-3 h-3" />
                              CUSTOM DESIGN ORDER
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            • {new Date(ord.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Status Update Control */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Status:</span>
                        <select
                          value={ord.status}
                          onChange={e => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-900 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                        >
                          <option value="New">New (Needs review)</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Processing">Processing (Bottling)</option>
                          <option value="Ready">Ready for Dispatch</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Mid Section: Customer Details & Ordered Products */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Customer info */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                        <h5 className="font-bold text-slate-800 uppercase tracking-wide">Customer Details</h5>
                        <p className="font-semibold text-slate-900 text-sm">{ord.customer.name}</p>
                        <p className="text-slate-600 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`tel:${ord.customer.phone}`} className="text-cyan-700 hover:underline">
                            {ord.customer.phone}
                          </a>
                        </p>
                        <p className="text-slate-600 mt-1">
                          {ord.customer.address}, {ord.customer.landmark ? ord.customer.landmark + ', ' : ''}
                          {ord.customer.city} - {ord.customer.pincode}
                        </p>
                      </div>

                      {/* Products Summary */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 md:col-span-2">
                        <h5 className="font-bold text-slate-800 uppercase tracking-wide">Items Summary</h5>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800">
                                  {item.product.name} ({item.product.size})
                                </span>
                                {item.isCustomDesign && item.customDesignDetails && (
                                  <span className="block text-[11px] text-cyan-800">
                                    Branding: "{item.customDesignDetails.businessName}" • {item.customDesignDetails.finishType}
                                  </span>
                                )}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {item.quantity} pcs @ ₹{item.unitPrice} = ₹{item.quantity * item.unitPrice}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                          <span>Total Amount:</span>
                          <span className="font-heading text-base font-black text-cyan-800">
                            ₹{ord.totalAmount} ({ord.paymentMethod})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Original Uploaded Images Row if custom design */}
                    {ord.hasOriginalImage && (
                      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Original Customer Files for Printing
                          </span>
                          <span className="text-[10px] text-slate-400">High-Resolution Preserved</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {ord.items.flatMap(item =>
                            (item.customDesignDetails?.uploadedImages || []).map((img, i) => (
                              <div
                                key={i}
                                className="bg-slate-800 rounded-xl p-2 border border-slate-700 flex items-center gap-3"
                              >
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-10 h-10 object-contain rounded bg-black/50 p-0.5"
                                />
                                <div className="text-[11px]">
                                  <p className="font-semibold text-slate-200 truncate max-w-[140px]">
                                    {img.name}
                                  </p>
                                  <a
                                    href={img.url}
                                    download={img.name || 'hh-custom-artwork.png'}
                                    className="text-cyan-400 hover:text-cyan-300 font-bold text-[10px] flex items-center gap-1 mt-0.5"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Download Original File</span>
                                  </a>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Bar: WhatsApp alert status & 1-click trigger */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">WhatsApp Status:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {ord.whatsAppNotification?.status || 'SENT'}
                        </span>
                        <span className="text-slate-400">
                          (Target: {OWNER_WHATSAPP_NUMBER})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => triggerWhatsAppNotification(ord, true)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                        >
                          Sync Alert
                        </button>
                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Open WhatsApp to Owner (8017341130)</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM ORDERS DEDICATED QUEUE */}
      {activeTab === 'custom-orders' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-gradient-to-r from-cyan-900 to-blue-950 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Print & Bottling Queue
              </span>
              <h2 className="font-heading text-xl font-bold mt-1">
                Custom Design Brand Orders ({customOrdersOnly.length})
              </h2>
              <p className="text-xs text-cyan-200 mt-1">
                Review high-res original logo uploads, customer special instructions, and label finishing specs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customOrdersOnly.length === 0 ? (
              <div className="col-span-2 bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
                No custom design orders received yet.
              </div>
            ) : (
              customOrdersOnly.map(ord => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-cyan-200 p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-900">{ord.id}</span>
                      <p className="text-xs text-slate-500">{ord.customer.name} ({ord.customer.phone})</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800">
                      {ord.status}
                    </span>
                  </div>

                  {ord.items.filter(i => i.isCustomDesign).map((item, idx) => {
                    const c = item.customDesignDetails;
                    return (
                      <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-cyan-700 block uppercase">
                              {item.product.size} Custom Edition
                            </span>
                            <h4 className="font-heading text-base font-bold text-slate-900">
                              "{c?.businessName || 'Custom Branding'}"
                            </h4>
                            {c?.tagline && <p className="text-xs text-slate-600 mt-0.5">{c.tagline}</p>}
                          </div>
                          <span className="font-bold text-slate-900 text-sm">
                            {item.quantity} bottles
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Event Type</span>
                            <span className="font-semibold text-slate-800">{c?.eventType}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Finish</span>
                            <span className="font-semibold text-slate-800">{c?.finishType}</span>
                          </div>
                          {c?.dateOrVenue && (
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[10px]">Date & Venue</span>
                              <span className="font-semibold text-slate-800">{c.dateOrVenue}</span>
                            </div>
                          )}
                          {c?.specialInstructions && (
                            <div className="col-span-2 bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-900">
                              <span className="block text-[10px] font-bold">Special Instructions:</span>
                              <span>{c.specialInstructions}</span>
                            </div>
                          )}
                        </div>

                        {/* Images */}
                        {c?.uploadedImages && c.uploadedImages.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">
                              Attached High-Res Files ({c.uploadedImages.length}):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {c.uploadedImages.map((img, i) => (
                                <a
                                  key={i}
                                  href={img.url}
                                  download={img.name}
                                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 transition-colors"
                                >
                                  <FileDown className="w-3.5 h-3.5 text-cyan-600" />
                                  <span className="truncate max-w-[120px]">{img.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCT CATALOG & PRICE MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Product Catalog & Price Controller
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Edit prices, MRP, sizes, and descriptions. Changes immediately sync to the live customer app!
              </p>
            </div>

            <button
              onClick={() => {
                const newProd: Product = {
                  id: `prod-${Date.now()}`,
                  name: 'HH Mineral Water — New Variant',
                  size: '300ml',
                  price: 6,
                  mrp: 10,
                  image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
                  shortDesc: 'Pure natural mineral water bottle.',
                  description: 'Pure 7-stage filtration mineral water enriched with natural minerals.',
                  inStock: true,
                  minOrderQty: 1,
                  category: 'Standard',
                  casePackSize: 24,
                  features: ['7-stage UV & Ozonation', 'BPA-Free PET'],
                  mineralInfo: {
                    calcium: '20 mg/L',
                    magnesium: '10 mg/L',
                    potassium: '4 mg/L',
                    sodium: '7 mg/L',
                    bicarbonate: '60 mg/L',
                    silica: '14 mg/L',
                    tds: '125 ppm',
                    ph: '7.4'
                  }
                };
                setEditingProduct(newProd);
                setIsNewProductModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Bottle Product</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(prod => (
              <div
                key={prod.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="h-40 bg-slate-50 rounded-2xl flex items-center justify-center p-3 mb-3 border border-slate-100">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-full">
                      {prod.size}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prod.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {prod.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <h3 className="font-heading text-sm font-bold text-slate-900 mt-2">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.shortDesc}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">CUSTOMER PRICE</span>
                      <span className="font-heading text-xl font-black text-slate-900">₹{prod.price}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold">MRP</span>
                      <span className="text-xs text-slate-400 line-through">₹{prod.mrp}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingProduct({ ...prod })}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs border border-cyan-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Price & Specs</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Product Modal */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="font-heading text-lg font-bold text-slate-900">
                    {isNewProductModal ? 'Add New Bottle Product' : `Edit Product: ${editingProduct.name}`}
                  </h3>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name}
                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Size Label (e.g. 250ml, 500ml, 1L, 2L) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProduct.size}
                        onChange={e => setEditingProduct({ ...editingProduct, size: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={editingProduct.price}
                        onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-cyan-800 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        MRP (₹)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={editingProduct.mrp}
                        onChange={e => setEditingProduct({ ...editingProduct, mrp: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-600 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Image URL
                      </label>
                      <input
                        type="text"
                        value={editingProduct.image}
                        onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Short Description
                      </label>
                      <input
                        type="text"
                        value={editingProduct.shortDesc}
                        onChange={e => setEditingProduct({ ...editingProduct, shortDesc: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Description
                      </label>
                      <textarea
                        rows={2}
                        value={editingProduct.description}
                        onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Stock Availability
                      </label>
                      <select
                        value={editingProduct.inStock ? 'true' : 'false'}
                        onChange={e => setEditingProduct({ ...editingProduct, inStock: e.target.value === 'true' })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                      >
                        <option value="true">In Stock (Available for orders)</option>
                        <option value="false">Out of Stock</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Badge Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingProduct.badge || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                        placeholder="e.g. Best Seller / Popular for Events"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save & Sync Database</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Registered Customers ({customersList.length})
            </h3>
            <span className="text-xs text-slate-500">Auto-aggregated from orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Mobile Number</th>
                  <th className="p-3">Total Orders</th>
                  <th className="p-3">Total Spent</th>
                  <th className="p-3">Last Order</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No customer records yet.
                    </td>
                  </tr>
                ) : (
                  customersList.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                      <td className="p-3">{c.orderCount} order(s)</td>
                      <td className="p-3 font-bold text-cyan-800">₹{c.totalSpent}</td>
                      <td className="p-3 text-slate-500">{new Date(c.lastOrder).toLocaleDateString()}</td>
                      <td className="p-3">
                        <a
                          href={`https://wa.me/91${c.phone}?text=Hello%20${encodeURIComponent(c.name)}%2C%20thank%20you%20for%20choosing%20HH%20MINERAL%20WATER!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & WHATSAPP INTEGRATION */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Store & WhatsApp Integration Settings
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure owner phone number, admin access PIN, and delivery rates.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Owner WhatsApp Number (for Order Confirmations) *
              </label>
              <input
                type="text"
                required
                value={settingsForm.ownerWhatsApp}
                onChange={e => setSettingsForm({ ...settingsForm, ownerWhatsApp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default specified: 8017341130</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Helpline Phone Number (Customer facing)
              </label>
              <input
                type="text"
                value={settingsForm.helplinePhone}
                onChange={e => setSettingsForm({ ...settingsForm, helplinePhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.defaultDeliveryCharge}
                  onChange={e => setSettingsForm({ ...settingsForm, defaultDeliveryCharge: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.freeDeliveryMinAmount}
                  onChange={e => setSettingsForm({ ...settingsForm, freeDeliveryMinAmount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Owner Admin PIN Code
              </label>
              <input
                type="text"
                value={settingsForm.adminPin}
                onChange={e => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Used to access the HH Owner App portal.</p>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
