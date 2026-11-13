import React, { useState } from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Send,
  Sliders,
  DollarSign,
  Phone,
  Building2,
  Trash2,
  Edit2,
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { RawMaterialStockItem, Product, LowStockAlertItem, PurchaseExpenseCategory } from '../../types';
import { OWNER_WHATSAPP_NUMBER } from '../../lib/whatsapp';
import { getLowStockWhatsAppDirectUrl, formatLowStockWhatsAppMessage } from '../../lib/inventoryMonitor';

interface InventoryStockTabProps {
  onNavigateToExpenses?: () => void;
}

export const InventoryStockTab: React.FC<InventoryStockTabProps> = ({ onNavigateToExpenses }) => {
  const {
    products,
    updateProduct,
    rawMaterials,
    updateRawMaterialStock,
    addRawMaterialStock,
    deleteRawMaterialStock,
    resetRawMaterialsToDefault,
    lowStockSummary,
    runStockAudit,
    sendLowStockAlertToWhatsApp,
    adminSettings,
    updateAdminSettings,
    showToast,
    isFactoryStaffUnlocked,
    isAdminUnlocked
  } = useStore();

  const isStaffOnly = isFactoryStaffUnlocked && !isAdminUnlocked;

  // Filter & Search states
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'warning' | 'bottles' | 'raw_materials'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [isDispatchingAlert, setIsDispatchingAlert] = useState(false);

  // Modals
  const [isAddRawModalOpen, setIsAddRawModalOpen] = useState(false);
  const [editingRawItem, setEditingRawItem] = useState<RawMaterialStockItem | null>(null);
  const [editingProductThreshold, setEditingProductThreshold] = useState<Product | null>(null);
  const [quickRestockItem, setQuickRestockItem] = useState<RawMaterialStockItem | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState<number>(100);
  const [isThresholdSettingsOpen, setIsThresholdSettingsOpen] = useState(false);

  // Form for New / Edit Raw Material
  const [rawForm, setRawForm] = useState<Partial<RawMaterialStockItem>>({
    name: '',
    category: 'PET Preforms & Caps',
    hsnCode: '3923',
    currentStock: 500,
    unit: 'pcs',
    criticalThreshold: 1000,
    reorderLevel: 2500,
    costPerUnit: 1.85,
    standardVendorName: 'Apex Polymers India Ltd.',
    standardVendorPhone: '+91 98305 12345',
    notes: ''
  });

  // Settings form for global thresholds
  const [thresholdSettingsForm, setThresholdSettingsForm] = useState({
    defaultBottleCriticalThreshold: adminSettings.defaultBottleCriticalThreshold ?? 50,
    defaultBottleReorderLevel: adminSettings.defaultBottleReorderLevel ?? 100,
    lowStockAlertsEnabled: adminSettings.lowStockAlertsEnabled ?? true,
    autoSendWhatsAppOnCriticalStock: adminSettings.autoSendWhatsAppOnCriticalStock ?? true
  });

  // Trigger automated stock audit
  const handleTriggerAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      runStockAudit();
      setIsAuditing(false);
    }, 600);
  };

  // Dispatch WhatsApp low-stock alert
  const handleSendWhatsAppAlert = async () => {
    setIsDispatchingAlert(true);
    try {
      const res = await sendLowStockAlertToWhatsApp();
      if (res.directWhatsAppUrl) {
        // Also provide direct link option
        window.open(res.directWhatsAppUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsDispatchingAlert(false);
    }
  };

  // Quick bottle stock inline adjustment (+ / -)
  const handleAdjustBottleStock = async (product: Product, delta: number) => {
    if (isStaffOnly) {
      showToast('Restricted', 'Only administrators can adjust base stock counts.', 'warning');
      return;
    }
    const current = Number(product.stockCount) || 0;
    const newCount = Math.max(0, current + delta);
    const updated: Product = {
      ...product,
      stockCount: newCount,
      stockStatus: newCount === 0 ? 'Out of Stock' : (newCount <= (product.lowStockThreshold ?? 50) ? 'Low Stock' : 'In Stock')
    };
    await updateProduct(updated);
    showToast('Stock Adjusted', `${product.name}: ${newCount} units.`, 'info');
  };

  // Quick raw material stock inline adjustment (+ / -)
  const handleAdjustRawStock = async (item: RawMaterialStockItem, delta: number) => {
    if (isStaffOnly) {
      showToast('Restricted', 'Only administrators can edit raw material inventory.', 'warning');
      return;
    }
    const current = Number(item.currentStock) || 0;
    const newStock = Math.max(0, current + delta);
    await updateRawMaterialStock({
      ...item,
      currentStock: newStock
    });
  };

  // Save New or Edited Raw Material
  const handleSaveRawMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawForm.name || !rawForm.unit) {
      showToast('Missing Fields', 'Please enter item name and unit of measurement.', 'warning');
      return;
    }

    if (editingRawItem) {
      const updated: RawMaterialStockItem = {
        ...editingRawItem,
        name: rawForm.name || editingRawItem.name,
        category: (rawForm.category as PurchaseExpenseCategory) || editingRawItem.category,
        hsnCode: rawForm.hsnCode || editingRawItem.hsnCode,
        currentStock: Number(rawForm.currentStock) || 0,
        unit: rawForm.unit || editingRawItem.unit,
        criticalThreshold: Number(rawForm.criticalThreshold) || 10,
        reorderLevel: Number(rawForm.reorderLevel) || 25,
        costPerUnit: Number(rawForm.costPerUnit) || 0,
        standardVendorName: rawForm.standardVendorName || '',
        standardVendorPhone: rawForm.standardVendorPhone || '',
        notes: rawForm.notes || ''
      };
      await updateRawMaterialStock(updated);
      setEditingRawItem(null);
    } else {
      const created: RawMaterialStockItem = {
        id: `RAW-${Date.now()}`,
        name: rawForm.name,
        category: (rawForm.category as PurchaseExpenseCategory) || 'PET Preforms & Caps',
        hsnCode: rawForm.hsnCode || '3923',
        currentStock: Number(rawForm.currentStock) || 0,
        unit: rawForm.unit || 'pcs',
        criticalThreshold: Number(rawForm.criticalThreshold) || 10,
        reorderLevel: Number(rawForm.reorderLevel) || 25,
        costPerUnit: Number(rawForm.costPerUnit) || 0,
        standardVendorName: rawForm.standardVendorName || '',
        standardVendorPhone: rawForm.standardVendorPhone || '',
        lastRestockedDate: new Date().toISOString().split('T')[0],
        lastRestockedQty: Number(rawForm.currentStock) || 0,
        notes: rawForm.notes || ''
      };
      await addRawMaterialStock(created);
      setIsAddRawModalOpen(false);
    }
  };

  // Quick Restock apply
  const handleApplyQuickRestock = async () => {
    if (!quickRestockItem || restockQtyInput <= 0) return;
    const added = Number(restockQtyInput);
    const updated: RawMaterialStockItem = {
      ...quickRestockItem,
      currentStock: (Number(quickRestockItem.currentStock) || 0) + added,
      lastRestockedDate: new Date().toISOString().split('T')[0],
      lastRestockedQty: added
    };
    await updateRawMaterialStock(updated);
    showToast('Restocked', `Added ${added} ${quickRestockItem.unit} to ${quickRestockItem.name}.`, 'success');
    setQuickRestockItem(null);
    setRestockQtyInput(100);
  };

  // Save Threshold Settings
  const handleSaveThresholdSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAdminSettings({
      ...adminSettings,
      defaultBottleCriticalThreshold: Number(thresholdSettingsForm.defaultBottleCriticalThreshold),
      defaultBottleReorderLevel: Number(thresholdSettingsForm.defaultBottleReorderLevel),
      lowStockAlertsEnabled: thresholdSettingsForm.lowStockAlertsEnabled,
      autoSendWhatsAppOnCriticalStock: thresholdSettingsForm.autoSendWhatsAppOnCriticalStock
    });
    setIsThresholdSettingsOpen(false);
    showToast('Thresholds Updated', 'Inventory monitoring parameters updated successfully.', 'success');
  };

  // Filter products and raw materials based on query & selected filter
  const filteredBottles = products.filter(p => {
    const crit = p.lowStockThreshold ?? adminSettings.defaultBottleCriticalThreshold ?? 50;
    const reorder = p.reorderLevel ?? adminSettings.defaultBottleReorderLevel ?? 100;
    const stock = Number(p.stockCount) || 0;

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.size && p.size.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'bottles') return true;
    if (filterMode === 'critical') return stock <= crit;
    if (filterMode === 'warning') return stock > crit && stock <= reorder;
    return false;
  });

  const filteredRawMaterials = rawMaterials.filter(rm => {
    const crit = Number(rm.criticalThreshold) || 10;
    const reorder = Number(rm.reorderLevel) || 25;
    const stock = Number(rm.currentStock) || 0;

    const matchesSearch = rm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rm.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rm.hsnCode.includes(searchQuery) ||
      (rm.standardVendorName && rm.standardVendorName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'raw_materials') return true;
    if (filterMode === 'critical') return stock <= crit;
    if (filterMode === 'warning') return stock > crit && stock <= reorder;
    return false;
  });

  const directWhatsAppUrl = getLowStockWhatsAppDirectUrl(
    lowStockSummary,
    adminSettings,
    typeof window !== 'undefined' ? window.location.origin : 'https://hhmineralwater.com'
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner Alert Bar if Critical Stock Exists */}
      {lowStockSummary.hasCriticalStock && (
        <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-2 border-rose-500/80 rounded-3xl p-5 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-3">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/60 flex items-center justify-center text-rose-300 shrink-0 animate-pulse">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider shadow-xs">
                  🚨 CRITICAL INVENTORY WARNING
                </span>
                <span className="text-xs font-mono font-bold text-rose-200">
                  {lowStockSummary.criticalCount} Item(s) Below Safety Threshold
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                Bottling plant supplies have hit critical reserve levels. Reorder immediately to avoid production downtime.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockSummary.criticalItems.slice(0, 4).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/40 border border-rose-500/40 text-[11px] font-semibold text-rose-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    {item.name}: <strong className="text-white">{item.currentStock} {item.unit}</strong> (Min: {item.criticalThreshold})
                  </span>
                ))}
                {lowStockSummary.criticalItems.length > 4 && (
                  <span className="text-xs text-rose-300 font-bold self-center">
                    +{lowStockSummary.criticalItems.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto self-end md:self-center">
            <button
              type="button"
              id="btn-inventory-whatsapp-alert"
              onClick={handleSendWhatsAppAlert}
              disabled={isDispatchingAlert}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Dispatch instant alert to Admin WhatsApp (+91 8017341130)"
            >
              {isDispatchingAlert ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Dispatching Alert...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-black" />
                  <span>📲 Send WhatsApp Alert (+91 8017341130)</span>
                </>
              )}
            </button>

            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-black/50 hover:bg-black/70 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-colors flex items-center justify-center"
              title="Open 1-Click WhatsApp Direct Alert"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tracked Items */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inventory Items</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {products.length} Bottles • {rawMaterials.length} Raw
            </span>
          </div>
          <span className="font-heading text-2xl font-black text-slate-900 mt-1 block">
            {products.length + rawMaterials.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block font-medium">Monitored 24/7 with auto-scan</span>
        </div>

        {/* Critical Stock Items */}
        <div className={`rounded-3xl p-5 border shadow-xs transition-all ${
          lowStockSummary.criticalCount > 0
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Critical Red Alert</span>
            <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
              ≤ Threshold
            </span>
          </div>
          <span className="font-heading text-2xl font-black text-rose-600 mt-1 block">
            {lowStockSummary.criticalCount}
          </span>
          <span className="text-[11px] text-rose-700 mt-1 block font-bold">
            {lowStockSummary.criticalCount > 0 ? 'Requires Immediate Reorder' : 'No Critical Shortages'}
          </span>
        </div>

        {/* Warning Reorder Level Items */}
        <div className={`rounded-3xl p-5 border shadow-xs transition-all ${
          lowStockSummary.warningCount > 0
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Reorder Warning</span>
            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
              ≤ Reorder Level
            </span>
          </div>
          <span className="font-heading text-2xl font-black text-amber-600 mt-1 block">
            {lowStockSummary.warningCount}
          </span>
          <span className="text-[11px] text-amber-700 mt-1 block font-medium">Order soon to prevent stockout</span>
        </div>

        {/* Healthy Optimal Items */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optimal Stock</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              Safe Zone
            </span>
          </div>
          <span className="font-heading text-2xl font-black text-emerald-600 mt-1 block">
            {lowStockSummary.healthyCount}
          </span>
          <span className="text-[11px] text-emerald-700 mt-1 block font-semibold">Sufficient stock available</span>
        </div>

        {/* WhatsApp Notification Engine Status */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Alerts</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="font-heading text-lg font-black text-emerald-300 mt-1 block truncate">
            +91 {adminSettings.ownerWhatsApp || OWNER_WHATSAPP_NUMBER}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Meta Cloud API & Direct Links Active
          </span>
        </div>
      </div>

      {/* Main Control Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inventory, HSN, vendor..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({products.length + rawMaterials.length})
            </button>
            <button
              onClick={() => setFilterMode('critical')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Critical ({lowStockSummary.criticalCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('warning')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterMode === 'warning' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Reorder ({lowStockSummary.warningCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('bottles')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'bottles' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bottles ({products.length})
            </button>
            <button
              onClick={() => setFilterMode('raw_materials')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterMode === 'raw_materials' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Materials ({rawMaterials.length})
            </button>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          <button
            type="button"
            id="btn-run-stock-audit"
            onClick={handleTriggerAudit}
            disabled={isAuditing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Scan bottle & raw material stock levels against safety thresholds"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing Stocks...' : '⚡ Run Stock Audit Now'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsAppAlert}
            disabled={isDispatchingAlert}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title="Send low-stock WhatsApp summary to Owner (+91 8017341130)"
          >
            <Send className="w-3.5 h-3.5" />
            <span>📲 WhatsApp Alert</span>
          </button>

          {!isStaffOnly && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRawForm({
                    name: '',
                    category: 'PET Preforms & Caps',
                    hsnCode: '3923',
                    currentStock: 1000,
                    unit: 'pcs',
                    criticalThreshold: 500,
                    reorderLevel: 1500,
                    costPerUnit: 1.5,
                    standardVendorName: '',
                    standardVendorPhone: '',
                    notes: ''
                  });
                  setEditingRawItem(null);
                  setIsAddRawModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Add Raw Material</span>
              </button>

              <button
                type="button"
                onClick={() => setIsThresholdSettingsOpen(true)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Configure Thresholds & WhatsApp Alerts"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* SECTION 1: FINISHED BOTTLE INVENTORY */}
      {(filterMode === 'all' || filterMode === 'bottles' || filterMode === 'critical' || filterMode === 'warning') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Packaged Drinking Water Bottle Inventory ({filteredBottles.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Finished bottled water ready for local dispatch (250ml, 500ml, 1L, 2L, 20L jars).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical: ≤ {adminSettings.defaultBottleCriticalThreshold ?? 50}
              </span>
              <span className="inline-flex items-center gap-1 ml-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Reorder: ≤ {adminSettings.defaultBottleReorderLevel ?? 100}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Product & Size</th>
                  <th className="p-3.5">Current Stock</th>
                  <th className="p-3.5">Thresholds (Crit / Reorder)</th>
                  <th className="p-3.5">Stock Status</th>
                  <th className="p-3.5">Case Pack Size</th>
                  <th className="p-3.5">Selling Price</th>
                  {!isStaffOnly && <th className="p-3.5 text-right">Quick Stock Adjust</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBottles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No bottle products match the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredBottles.map((product) => {
                    const stock = Number(product.stockCount) || 0;
                    const crit = product.lowStockThreshold ?? adminSettings.defaultBottleCriticalThreshold ?? 50;
                    const reorder = product.reorderLevel ?? adminSettings.defaultBottleReorderLevel ?? 100;
                    const isCrit = stock <= crit;
                    const isWarn = stock > crit && stock <= reorder;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCrit ? 'bg-rose-50/50' : isWarn ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 object-contain rounded-lg bg-slate-100 p-1 border border-slate-200"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{product.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Size: {product.size} • HSN {product.hsnCode || '2201'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-base font-black font-mono ${
                                isCrit ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {stock}
                            </span>
                            <span className="text-[11px] text-slate-400">cases/bottles</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold" title="Critical Threshold">
                              ≤ {crit}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold" title="Reorder Level">
                              ≤ {reorder}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          {isCrit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Critical Low Stock
                            </span>
                          ) : isWarn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                              <AlertCircle className="w-3 h-3" />
                              Reorder Warning
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Optimal Stock
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-slate-600">
                          {product.casePackSize || 24} btls/case
                        </td>

                        <td className="p-3.5 font-bold">
                          ₹{product.price}
                          <span className="text-[10px] text-slate-400 line-through ml-1.5 font-normal">
                            ₹{product.mrp}
                          </span>
                        </td>

                        {!isStaffOnly && (
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAdjustBottleStock(product, -10)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="Deduct 10 units"
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustBottleStock(product, -1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="Deduct 1 unit"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustBottleStock(product, 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="Add 1 unit"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustBottleStock(product, 24)}
                                className="w-8 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="Add 1 full case (+24)"
                              >
                                +24
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: RAW MATERIALS & PACKAGING SUPPLIES */}
      {(filterMode === 'all' || filterMode === 'raw_materials' || filterMode === 'critical' || filterMode === 'warning') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Raw Materials & Packaging Supplies Register ({filteredRawMaterials.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Preforms, bottle caps, master cartons, mineral salts, RO membrane filters, and delivery fuel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToExpenses && (
                <button
                  type="button"
                  onClick={onNavigateToExpenses}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  <span>View Purchase Register</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Raw Material & HSN</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Stock Level vs Thresholds</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Standard Vendor</th>
                  <th className="p-3.5 text-right">Actions & Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No raw material inventory items match the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredRawMaterials.map((rm) => {
                    const stock = Number(rm.currentStock) || 0;
                    const crit = Number(rm.criticalThreshold) || 10;
                    const reorder = Number(rm.reorderLevel) || 25;
                    const isCrit = stock <= crit;
                    const isWarn = stock > crit && stock <= reorder;

                    // Progress percentage capped between 0 and 100 based on 2x reorder
                    const maxScale = Math.max(reorder * 1.5, crit * 2, stock);
                    const progressPercent = Math.min(100, Math.round((stock / maxScale) * 100));

                    // Vendor WhatsApp prefilled link
                    const vendorPhoneDigits = (rm.standardVendorPhone || '').replace(/\D/g, '');
                    const vendorDestination = vendorPhoneDigits.length === 10 ? `91${vendorPhoneDigits}` : vendorPhoneDigits;
                    const vendorMsg = encodeURIComponent(
                      `Hello ${rm.standardVendorName},\n\nWe urgently require to place a purchase order for:\n📦 Item: *${rm.name}* (HSN ${rm.hsnCode})\n⚠️ Current Stock: ${rm.currentStock} ${rm.unit}\n\nPlease share latest quotation & dispatch availability for delivery to HH Mineral Water Bottling Plant, Salt Lake Sector V, Kolkata.\n\nThank you,\nPurchase Dept — HH Mineral Water`
                    );
                    const vendorWhatsAppUrl = vendorDestination ? `https://wa.me/${vendorDestination}?text=${vendorMsg}` : null;

                    return (
                      <tr
                        key={rm.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCrit ? 'bg-rose-50/50' : isWarn ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <div>
                            <span className="font-bold text-slate-900 block">{rm.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                                HSN {rm.hsnCode}
                              </span>
                              {rm.costPerUnit ? (
                                <span className="text-[11px] text-slate-500">
                                  ~₹{rm.costPerUnit} / {rm.unit}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {rm.category}
                          </span>
                        </td>

                        <td className="p-3.5 min-w-[200px]">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-black font-mono">
                                {stock} {rm.unit}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Min: {crit} • Reorder: {reorder}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isCrit ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(5, progressPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          {isCrit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              CRITICAL
                            </span>
                          ) : isWarn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                              <AlertCircle className="w-3 h-3" />
                              REORDER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              HEALTHY
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div>
                            <span className="font-bold text-slate-900 block">{rm.standardVendorName || 'Standard Supplier'}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {rm.standardVendorPhone || 'Phone on file'}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {vendorWhatsAppUrl && (
                              <a
                                href={vendorWhatsAppUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title={`Send PO enquiry to ${rm.standardVendorName} via WhatsApp`}
                              >
                                <Send className="w-3 h-3" />
                                <span>PO WhatsApp</span>
                              </a>
                            )}

                            {!isStaffOnly && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickRestockItem(rm);
                                    setRestockQtyInput(rm.criticalThreshold * 2 || 100);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-bold transition-colors cursor-pointer"
                                  title="Add restocked quantity"
                                >
                                  + Restock
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRawItem(rm);
                                    setRawForm({ ...rm });
                                    setIsAddRawModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  title="Edit item & thresholds"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove "${rm.name}" from raw materials inventory?`)) {
                                      deleteRawMaterialStock(rm.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete raw material"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK MODAL */}
      {quickRestockItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Restock Inventory: {quickRestockItem.name}
                </h3>
              </div>
              <button
                onClick={() => setQuickRestockItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Stock:</span>
                <span className="font-bold text-slate-900">{quickRestockItem.currentStock} {quickRestockItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Critical Threshold:</span>
                <span className="font-bold text-rose-600">{quickRestockItem.criticalThreshold} {quickRestockItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Standard Supplier:</span>
                <span className="font-bold text-slate-900">{quickRestockItem.standardVendorName}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Inbound Quantity to Add ({quickRestockItem.unit})
              </label>
              <input
                type="number"
                min={1}
                value={restockQtyInput}
                onChange={(e) => setRestockQtyInput(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-600"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">
                New resulting stock: <strong>{(Number(quickRestockItem.currentStock) || 0) + Number(restockQtyInput)} {quickRestockItem.unit}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickRestockItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyQuickRestock}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT RAW MATERIAL MODAL */}
      {isAddRawModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  {editingRawItem ? 'Edit Raw Material Item' : 'Add New Raw Material Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddRawModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRawMaterial} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={rawForm.name}
                  onChange={(e) => setRawForm({ ...rawForm, name: e.target.value })}
                  placeholder="e.g. PET Preforms 13.5g (28mm Neck)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={rawForm.category}
                    onChange={(e) => setRawForm({ ...rawForm, category: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-600 bg-white"
                  >
                    <option value="PET Preforms & Caps">PET Preforms & Caps</option>
                    <option value="Bottle Caps & Closures">Bottle Caps & Closures</option>
                    <option value="Corrugated Boxes & Shrink Pack">Corrugated Boxes & Shrink Pack</option>
                    <option value="Water Treatment Chemicals & Minerals">Water Treatment Minerals</option>
                    <option value="RO Membrane & Filter Consumables">RO Membrane & Filters</option>
                    <option value="Fleet Fuel & Vehicle Service">Fleet Fuel</option>
                    <option value="Other Operational">Other Operational / Labels</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={rawForm.hsnCode}
                    onChange={(e) => setRawForm({ ...rawForm, hsnCode: e.target.value })}
                    placeholder="e.g. 3923"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={rawForm.currentStock}
                    onChange={(e) => setRawForm({ ...rawForm, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-cyan-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure *</label>
                  <select
                    value={rawForm.unit}
                    onChange={(e) => setRawForm({ ...rawForm, unit: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-600 bg-white"
                  >
                    <option value="pcs">pcs</option>
                    <option value="cartons">cartons</option>
                    <option value="kg">kg</option>
                    <option value="rolls">rolls</option>
                    <option value="litres">litres</option>
                    <option value="filters">filters</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={rawForm.costPerUnit}
                    onChange={(e) => setRawForm({ ...rawForm, costPerUnit: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              {/* Thresholds */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-700 block">Safety & Monitoring Thresholds</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-rose-700 mb-1">
                      Critical Threshold (≤ Red Alert)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={rawForm.criticalThreshold}
                      onChange={(e) => setRawForm({ ...rawForm, criticalThreshold: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 bg-rose-50/40 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1">
                      Reorder Level (≤ Warning)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={rawForm.reorderLevel}
                      onChange={(e) => setRawForm({ ...rawForm, reorderLevel: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs font-bold text-amber-700 bg-amber-50/40 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Vendor Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Standard Vendor Name</label>
                  <input
                    type="text"
                    value={rawForm.standardVendorName}
                    onChange={(e) => setRawForm({ ...rawForm, standardVendorName: e.target.value })}
                    placeholder="e.g. Apex Polymers Ltd."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor WhatsApp / Phone</label>
                  <input
                    type="text"
                    value={rawForm.standardVendorPhone}
                    onChange={(e) => setRawForm({ ...rawForm, standardVendorPhone: e.target.value })}
                    placeholder="e.g. +91 98305 12345"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRawModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingRawItem ? 'Save Changes' : 'Register Raw Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THRESHOLD CONFIGURATION MODAL */}
      {isThresholdSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Global Thresholds & Alert Settings
                </h3>
              </div>
              <button
                onClick={() => setIsThresholdSettingsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveThresholdSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Bottle Critical Threshold (Cases/Bottles)
                </label>
                <input
                  type="number"
                  min={1}
                  value={thresholdSettingsForm.defaultBottleCriticalThreshold}
                  onChange={(e) => setThresholdSettingsForm({
                    ...thresholdSettingsForm,
                    defaultBottleCriticalThreshold: Number(e.target.value)
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-cyan-600"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Applies to 250ml, 500ml, 1L, 2L, and 20L jars when no custom threshold is set.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Bottle Reorder Level (Cases/Bottles)
                </label>
                <input
                  type="number"
                  min={1}
                  value={thresholdSettingsForm.defaultBottleReorderLevel}
                  onChange={(e) => setThresholdSettingsForm({
                    ...thresholdSettingsForm,
                    defaultBottleReorderLevel: Number(e.target.value)
                  })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thresholdSettingsForm.lowStockAlertsEnabled}
                    onChange={(e) => setThresholdSettingsForm({
                      ...thresholdSettingsForm,
                      lowStockAlertsEnabled: e.target.checked
                    })}
                    className="w-4 h-4 text-cyan-600 rounded"
                  />
                  <span className="font-bold text-slate-800">
                    Enable Automated Low-Stock Monitoring Engine
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thresholdSettingsForm.autoSendWhatsAppOnCriticalStock}
                    onChange={(e) => setThresholdSettingsForm({
                      ...thresholdSettingsForm,
                      autoSendWhatsAppOnCriticalStock: e.target.checked
                    })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-bold text-slate-800">
                    Auto-prepare WhatsApp Notification on Critical Stock
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetRawMaterialsToDefault}
                  className="text-slate-500 hover:text-rose-600 text-[11px] font-bold"
                >
                  Reset Defaults
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsThresholdSettingsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
