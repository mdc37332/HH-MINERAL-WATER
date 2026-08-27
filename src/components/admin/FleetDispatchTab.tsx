import React, { useState } from 'react';
import { FleetVehicle, Order } from '../../types';
import { INITIAL_FLEET_VEHICLES } from '../../data/initialProducts';
import {
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  FileDown,
  Navigation,
  Package,
  AlertCircle,
  TrendingUp,
  User
} from 'lucide-react';

interface FleetDispatchTabProps {
  orders: Order[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const FleetDispatchTab: React.FC<FleetDispatchTabProps> = ({ orders, showToast }) => {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('hh_fleet_vehicles');
      return saved ? JSON.parse(saved) : INITIAL_FLEET_VEHICLES;
    } catch {
      return INITIAL_FLEET_VEHICLES;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);

  // New Vehicle Form
  const [newVehicle, setNewVehicle] = useState<Partial<FleetVehicle>>({
    vehicleNumber: '',
    vehicleType: 'Mini Truck / Tata Ace',
    driverName: '',
    driverPhone: '',
    assignedRoute: 'Central Kolkata & Park Street Hub',
    capacityCases: 100,
    currentLoadCases: 0,
    status: 'Available',
    todayDeliveriesCount: 0
  });

  const saveVehicles = (updated: FleetVehicle[]) => {
    setVehicles(updated);
    try {
      localStorage.setItem('hh_fleet_vehicles', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save fleet vehicles:', e);
    }
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.vehicleNumber || !newVehicle.driverName || !newVehicle.driverPhone) {
      showToast('Missing Fields', 'Please provide vehicle registration number, driver name, and driver phone.', 'warning');
      return;
    }

    const created: FleetVehicle = {
      id: `FLEET-${Date.now()}`,
      vehicleNumber: newVehicle.vehicleNumber.toUpperCase(),
      vehicleType: newVehicle.vehicleType || 'Mini Truck / Tata Ace',
      driverName: newVehicle.driverName,
      driverPhone: newVehicle.driverPhone,
      assignedRoute: newVehicle.assignedRoute || 'Kolkata Central',
      capacityCases: Number(newVehicle.capacityCases || 100),
      currentLoadCases: 0,
      status: 'Available',
      todayDeliveriesCount: 0
    };

    const updated = [...vehicles, created];
    saveVehicles(updated);
    setIsAddVehicleModalOpen(false);
    setNewVehicle({
      vehicleNumber: '',
      vehicleType: 'Mini Truck / Tata Ace',
      driverName: '',
      driverPhone: '',
      assignedRoute: 'Central Kolkata & Park Street Hub',
      capacityCases: 100,
      currentLoadCases: 0,
      status: 'Available',
      todayDeliveriesCount: 0
    });
    showToast('Fleet Vehicle Added', `${created.vehicleNumber} registered for route: ${created.assignedRoute}`, 'success');
  };

  const handleUpdateVehicleStatus = (id: string, newStatus: FleetVehicle['status']) => {
    const updated = vehicles.map(v => v.id === id ? { ...v, status: newStatus } : v);
    saveVehicles(updated);
    showToast('Status Updated', `Vehicle status changed to ${newStatus}.`, 'info');
  };

  const handleSendDriverWhatsAppManifest = (v: FleetVehicle) => {
    const cleanPhone = v.driverPhone.replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // Filter relevant pending/out-for-delivery orders
    const pendingOrders = orders.filter(o => o.status === 'Processing' || o.status === 'Ready' || o.status === 'Out for Delivery');

    let manifestList = '';
    if (pendingOrders.length === 0) {
      manifestList = `• No active dispatch orders scheduled currently. Stand by at plant.`;
    } else {
      manifestList = pendingOrders.slice(0, 8).map((o, idx) =>
        `${idx + 1}. Order ${o.id}: ${o.customer.name} (${o.customer.phone})\n   📍 ${o.customer.address}, ${o.customer.pincode}\n   📦 ${o.items.map(i => `${i.product.size} x${i.quantity}`).join(', ')} (₹${o.totalAmount})`
      ).join('\n\n');
    }

    const message = `*HH MINERAL WATER - FLEET DISPATCH & ROUTE SHEET*\n\n` +
      `Driver: *${v.driverName}*\n` +
      `Vehicle No: *${v.vehicleNumber}* (${v.vehicleType})\n` +
      `Assigned Route: *${v.assignedRoute}*\n` +
      `Date: *${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}*\n\n` +
      `*Active Delivery Deliveries Checklist:*\n${manifestList}\n\n` +
      `⚠️ *Instructions:* Please inspect bottle seal caps before handing over and collect cash for COD orders.\n` +
      `Plant Support: +91 8017341130`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Dispatch Manifest Sent', `Opening WhatsApp dispatch manifest for driver ${v.driverName}.`, 'success');
  };

  const exportFleetCsv = () => {
    if (vehicles.length === 0) {
      showToast('No Vehicles', 'No fleet vehicles to export.', 'info');
      return;
    }
    const headers = ['Vehicle Registration', 'Vehicle Type', 'Driver Name', 'Driver Phone', 'Assigned Route Hub', 'Capacity (Cases)', 'Current Load (Cases)', 'Status', 'Today Deliveries Completed'];
    const rows = vehicles.map(v => [
      `"${v.vehicleNumber}"`,
      `"${v.vehicleType}"`,
      `"${v.driverName}"`,
      `"${v.driverPhone}"`,
      `"${v.assignedRoute}"`,
      v.capacityCases,
      v.currentLoadCases,
      `"${v.status}"`,
      v.todayDeliveriesCount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_Fleet_Dispatch_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported', 'Fleet register downloaded as CSV.', 'success');
  };

  const filtered = vehicles.filter(v =>
    v.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.assignedRoute.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeVehiclesOnRoute = vehicles.filter(v => v.status === 'On Delivery Route').length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const totalCasesDispatchedToday = vehicles.reduce((acc, v) => acc + (v.todayDeliveriesCount * 12), 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Fleet Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total Fleet Units</span>
          <span className="font-heading text-2xl font-black text-slate-900 mt-1 block">{vehicles.length}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Trucks, Vans & Cargo E-Rickshaws</span>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-blue-200 bg-blue-50/40 shadow-xs">
          <span className="text-xs font-bold text-blue-800 block uppercase">On Delivery Route</span>
          <span className="font-heading text-2xl font-black text-blue-900 mt-1 block">{activeVehiclesOnRoute}</span>
          <span className="text-[11px] text-blue-700 font-semibold mt-1 block">Live City Dispatches</span>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 block uppercase">Available at Plant</span>
          <span className="font-heading text-2xl font-black text-emerald-900 mt-1 block">{availableVehicles}</span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Ready for Loading</span>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-200 bg-purple-50/40 shadow-xs">
          <span className="text-xs font-bold text-purple-800 block uppercase">Estimated Bottles Dispatched</span>
          <span className="font-heading text-2xl font-black text-purple-900 mt-1 block">{totalCasesDispatchedToday} Cases</span>
          <span className="text-[11px] text-purple-700 font-semibold mt-1 block">Today's Fleet Output</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle number, driver, or route..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={exportFleetCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Fleet Register</span>
          </button>

          <button
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle / Driver</span>
          </button>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map(v => (
          <div
            key={v.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="font-mono font-black text-sm text-slate-900 block">{v.vehicleNumber}</span>
                  <span className="text-[11px] text-slate-500 font-medium">{v.vehicleType}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    v.status === 'On Delivery Route'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : v.status === 'Available'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  ● {v.status}
                </span>
              </div>

              <div className="space-y-2.5 pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">{v.driverName}</span>
                    <span className="text-slate-500 block font-mono text-[11px]">{v.driverPhone}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Route</span>
                    <span className="font-semibold text-slate-800">{v.assignedRoute}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Capacity</span>
                    <strong className="text-slate-800">{v.capacityCases} Cases</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Today Delivered</span>
                    <strong className="text-emerald-700">{v.todayDeliveriesCount} Stops</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-slate-500">Status:</span>
                <select
                  value={v.status}
                  onChange={e => handleUpdateVehicleStatus(v.id, e.target.value as FleetVehicle['status'])}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer"
                >
                  <option value="Available">Available (At Plant)</option>
                  <option value="On Delivery Route">On Delivery Route</option>
                  <option value="Maintenance">Maintenance / Service</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
              </div>

              <button
                onClick={() => handleSendDriverWhatsAppManifest(v)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Route Manifest on WhatsApp</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Modal */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Register Fleet Vehicle & Driver
                </h3>
                <p className="text-xs text-slate-500">Add distribution truck, van, or cargo carrier.</p>
              </div>
              <button
                onClick={() => setIsAddVehicleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Reg. Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WB-02-AK-9842"
                    value={newVehicle.vehicleNumber}
                    onChange={e => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Type</label>
                  <select
                    value={newVehicle.vehicleType}
                    onChange={e => setNewVehicle({ ...newVehicle, vehicleType: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="Mini Truck / Tata Ace">Mini Truck / Tata Ace</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="E-Rickshaw Cargo">E-Rickshaw Cargo</option>
                    <option value="Three Wheeler Cargo">Three Wheeler Cargo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Das"
                    value={newVehicle.driverName}
                    onChange={e => setNewVehicle({ ...newVehicle, driverName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Driver Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9830512345"
                    value={newVehicle.driverPhone}
                    onChange={e => setNewVehicle({ ...newVehicle, driverPhone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Route Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Central Kolkata & Park Street Hub"
                    value={newVehicle.assignedRoute}
                    onChange={e => setNewVehicle({ ...newVehicle, assignedRoute: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Carrying Capacity (Cases)</label>
                  <input
                    type="number"
                    min={10}
                    value={newVehicle.capacityCases}
                    onChange={e => setNewVehicle({ ...newVehicle, capacityCases: parseInt(e.target.value) || 100 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Fleet Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
