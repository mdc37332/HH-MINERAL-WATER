import React, { useState } from 'react';
import { BulkInquiry } from '../../types';
import { INITIAL_BULK_INQUIRIES } from '../../data/initialProducts';
import {
  Calendar,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Plus,
  Search,
  MessageCircle,
  FileDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Package
} from 'lucide-react';

interface BulkInquiriesTabProps {
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const BulkInquiriesTab: React.FC<BulkInquiriesTabProps> = ({ showToast }) => {
  const [inquiries, setInquiries] = useState<BulkInquiry[]>(() => {
    try {
      const saved = localStorage.getItem('hh_bulk_inquiries');
      return saved ? JSON.parse(saved) : INITIAL_BULK_INQUIRIES;
    } catch {
      return INITIAL_BULK_INQUIRIES;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<BulkInquiry | null>(null);

  // New Inquiry Form State
  const [newForm, setNewForm] = useState<Partial<BulkInquiry>>({
    clientName: '',
    phone: '',
    email: '',
    organization: '',
    eventType: 'Wedding Reception',
    bottleSize: '250ml',
    estimatedQuantity: 1000,
    deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    deliveryLocation: 'Kolkata, West Bengal',
    customBranding: true,
    status: 'New',
    quotedRatePerUnit: 6,
    notes: ''
  });

  const saveInquiries = (updated: BulkInquiry[]) => {
    setInquiries(updated);
    try {
      localStorage.setItem('hh_bulk_inquiries', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save bulk inquiries:', e);
    }
  };

  const handleCreateInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.clientName || !newForm.phone || !newForm.estimatedQuantity) {
      showToast('Missing Fields', 'Please enter client name, phone number, and quantity.', 'warning');
      return;
    }

    const rate = newForm.quotedRatePerUnit || 6;
    const qty = newForm.estimatedQuantity || 1000;
    const totalAmount = rate * qty;

    const newInq: BulkInquiry = {
      id: `INQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: newForm.clientName,
      phone: newForm.phone,
      email: newForm.email || '',
      organization: newForm.organization || '',
      eventType: newForm.eventType || 'Event',
      bottleSize: newForm.bottleSize || '250ml',
      estimatedQuantity: qty,
      deliveryDate: newForm.deliveryDate || new Date().toISOString().split('T')[0],
      deliveryLocation: newForm.deliveryLocation || 'Kolkata',
      customBranding: !!newForm.customBranding,
      status: 'New',
      quotedRatePerUnit: rate,
      totalQuotedAmount: totalAmount,
      notes: newForm.notes || '',
      createdAt: new Date().toISOString()
    };

    const updated = [newInq, ...inquiries];
    saveInquiries(updated);
    setIsNewModalOpen(false);
    showToast('Inquiry Registered', `Wholesale inquiry registered for ${newInq.clientName}.`, 'success');
  };

  const handleUpdateStatus = (id: string, newStatus: BulkInquiry['status']) => {
    const updated = inquiries.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq);
    saveInquiries(updated);
    showToast('Status Updated', `Inquiry ${id} marked as ${newStatus}.`, 'info');
  };

  const handleSendWhatsAppQuote = (inq: BulkInquiry) => {
    const rate = inq.quotedRatePerUnit || 6;
    const total = inq.totalQuotedAmount || (rate * inq.estimatedQuantity);
    const cleanPhone = inq.phone.replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = `*HH MINERAL WATER - OFFICIAL WHOLESALE QUOTATION*\n\n` +
      `Dear *${inq.clientName}*${inq.organization ? ` (${inq.organization})` : ''},\n` +
      `Thank you for your bulk water inquiry with HH Mineral Water!\n\n` +
      `*Quotation Details:*\n` +
      `• *Ref ID:* ${inq.id}\n` +
      `• *Event / Requirement:* ${inq.eventType}\n` +
      `• *Bottle Size:* ${inq.bottleSize} Packaged Mineral Water\n` +
      `• *Estimated Quantity:* ${inq.estimatedQuantity.toLocaleString()} Units\n` +
      `• *Custom Branding / Foil Monogram:* ${inq.customBranding ? 'Included (Custom Label)' : 'Standard HH Branding'}\n` +
      `• *Special Quoted Rate:* ₹${rate.toFixed(2)} / bottle\n` +
      `• *Estimated Total Amount:* ₹${total.toLocaleString()} (Incl. Delivery & GST)\n` +
      `• *Expected Delivery:* ${new Date(inq.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n` +
      `• *Delivery Location:* ${inq.deliveryLocation}\n\n` +
      `To confirm your production booking, please reply directly or call our plant hotline at +91 8017341130.\n\n` +
      `*HH Mineral Water Plant*\nKolkata, West Bengal`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Quote Dispatched', `Opening WhatsApp quotation for ${inq.clientName}.`, 'success');
  };

  const exportInquiriesCsv = () => {
    if (inquiries.length === 0) {
      showToast('No Inquiries', 'No bulk inquiries available to export.', 'info');
      return;
    }
    const headers = ['Inquiry ID', 'Date', 'Client Name', 'Phone', 'Email', 'Organization', 'Event Type', 'Bottle Size', 'Quantity', 'Custom Branding', 'Rate/Unit (INR)', 'Total Amount (INR)', 'Delivery Date', 'Delivery Location', 'Status'];
    const rows = inquiries.map(i => [
      `"${i.id}"`,
      `"${new Date(i.createdAt).toLocaleDateString()}"`,
      `"${(i.clientName || '').replace(/"/g, '""')}"`,
      `"${i.phone || ''}"`,
      `"${i.email || ''}"`,
      `"${(i.organization || '').replace(/"/g, '""')}"`,
      `"${i.eventType || ''}"`,
      `"${i.bottleSize || ''}"`,
      i.estimatedQuantity,
      i.customBranding ? 'Yes' : 'No',
      i.quotedRatePerUnit || 0,
      i.totalQuotedAmount || 0,
      `"${i.deliveryDate || ''}"`,
      `"${(i.deliveryLocation || '').replace(/"/g, '""')}"`,
      `"${i.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_Bulk_Inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported', 'Bulk inquiries report downloaded as CSV.', 'success');
  };

  const filtered = inquiries.filter(inq => {
    const matchesSearch =
      inq.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.phone.includes(searchQuery) ||
      (inq.organization && inq.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inq.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const newCount = inquiries.filter(i => i.status === 'New').length;
  const quotedCount = inquiries.filter(i => i.status === 'Quoted').length;
  const confirmedCount = inquiries.filter(i => i.status === 'Confirmed').length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total Inquiries</span>
          <span className="font-heading text-2xl font-black text-slate-900 mt-1 block">{inquiries.length}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Bulk & Event Inquiries</span>
        </div>
        <div className="bg-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block uppercase">New Inquiries</span>
          <span className="font-heading text-2xl font-black text-white mt-1 block">{newCount}</span>
          <span className="text-[11px] text-cyan-400 font-semibold mt-1 block">Requires Quotation</span>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-blue-200 bg-blue-50/40 shadow-xs">
          <span className="text-xs font-bold text-blue-800 block uppercase">Quoted Sent</span>
          <span className="font-heading text-2xl font-black text-blue-900 mt-1 block">{quotedCount}</span>
          <span className="text-[11px] text-blue-700 font-semibold mt-1 block">Awaiting Client Confirmation</span>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 block uppercase">Confirmed Orders</span>
          <span className="font-heading text-2xl font-black text-emerald-900 mt-1 block">{confirmedCount}</span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Ready for Bottling Production</span>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search client, phone, or organization..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
          >
            <option value="all">All Inquiry Statuses</option>
            <option value="New">● New Pending</option>
            <option value="Quoted">● Quoted Dispatched</option>
            <option value="Confirmed">● Confirmed / Booked</option>
            <option value="Completed">● Completed</option>
            <option value="Declined">● Declined</option>
          </select>

          <button
            onClick={exportInquiriesCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Bulk Inquiry / Quote</span>
          </button>
        </div>
      </div>

      {/* Inquiry Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-heading text-base font-bold text-slate-700">No Inquiries Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No bulk inquiry records match your search filter. Create a new quotation above.
            </p>
          </div>
        ) : (
          filtered.map(inq => (
            <div
              key={inq.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-black text-sm text-slate-900">{inq.id}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {inq.eventType}
                  </span>
                  {inq.customBranding && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-600" />
                      <span>Custom Label Branding</span>
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      inq.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inq.status === 'Quoted'
                        ? 'bg-blue-100 text-blue-800'
                        : inq.status === 'New'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    ● {inq.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Received: <strong>{new Date(inq.createdAt).toLocaleDateString()}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Client info */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Client & Contact</span>
                  <h4 className="font-bold text-sm text-slate-900">{inq.clientName}</h4>
                  {inq.organization && <p className="text-slate-600 font-medium">{inq.organization}</p>}
                  <p className="text-slate-700 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{inq.phone}</span>
                  </p>
                  {inq.email && (
                    <p className="text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{inq.email}</span>
                    </p>
                  )}
                </div>

                {/* Supply Specs */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Water Supply Specs</span>
                  <p className="font-bold text-slate-800">
                    {inq.estimatedQuantity.toLocaleString()} Bottles ({inq.bottleSize} Pack)
                  </p>
                  <p className="text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Delivery Date: <strong>{new Date(inq.deliveryDate).toLocaleDateString()}</strong></span>
                  </p>
                  <p className="text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{inq.deliveryLocation}</span>
                  </p>
                </div>

                {/* Pricing & Commercial */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Quotation & Commercials</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-600">Rate / Bottle:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{inq.quotedRatePerUnit?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Est. Total Amount:</span>
                    <span className="font-heading font-black text-sm text-cyan-800">
                      ₹{inq.totalQuotedAmount?.toLocaleString() || (inq.estimatedQuantity * (inq.quotedRatePerUnit || 6)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {inq.notes && (
                <div className="bg-amber-50/60 border border-amber-200/60 p-3 rounded-2xl text-xs text-amber-900">
                  <strong className="font-bold">Client Notes:</strong> {inq.notes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Change Status:</span>
                  {(['New', 'Quoted', 'Confirmed', 'Completed', 'Declined'] as BulkInquiry['status'][]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(inq.id, st)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                        inq.status === st
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendWhatsAppQuote(inq)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send WhatsApp Quotation</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Bulk Inquiry Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Register New Bulk & Event Inquiry
                </h3>
                <p className="text-xs text-slate-500">Create wholesale water quotation for wedding, hotel, or corporate client.</p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateInquiry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={newForm.clientName}
                    onChange={e => setNewForm({ ...newForm, clientName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9830123456"
                    value={newForm.phone}
                    onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Organization / Hotel (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Taj Bengal Banquets"
                    value={newForm.organization}
                    onChange={e => setNewForm({ ...newForm, organization: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event / Business Type</label>
                  <select
                    value={newForm.eventType}
                    onChange={e => setNewForm({ ...newForm, eventType: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="Wedding Reception">Wedding Reception</option>
                    <option value="Corporate Conference">Corporate Conference</option>
                    <option value="Hotel/Restaurant">Hotel / Restaurant Supply</option>
                    <option value="Catering & Party">Catering & Party</option>
                    <option value="Wholesale Distributor">Wholesale Distributor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bottle Size</label>
                  <select
                    value={newForm.bottleSize}
                    onChange={e => setNewForm({ ...newForm, bottleSize: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="250ml">250ml Pocket Hydration</option>
                    <option value="500ml">500ml Classic Table Bottle</option>
                    <option value="1L">1L Premium Spring Bottle</option>
                    <option value="2L">2L Family Mega Pack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Quantity (Units) *</label>
                  <input
                    type="number"
                    min={50}
                    required
                    value={newForm.estimatedQuantity}
                    onChange={e => setNewForm({ ...newForm, estimatedQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-cyan-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quoted Rate per Bottle (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    value={newForm.quotedRatePerUnit}
                    onChange={e => setNewForm({ ...newForm, quotedRatePerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={newForm.deliveryDate}
                    onChange={e => setNewForm({ ...newForm, deliveryDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Venue / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Nicco Park Banquets, Salt Lake, Kolkata"
                    value={newForm.deliveryLocation}
                    onChange={e => setNewForm({ ...newForm, deliveryLocation: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customBrandingCheck"
                    checked={newForm.customBranding}
                    onChange={e => setNewForm({ ...newForm, customBranding: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="customBrandingCheck" className="text-xs font-bold text-slate-800">
                    Include Custom Label Branding (Gold Foil / Monogram Design)
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Requirements / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Need 50 cases delivered by 10:00 AM on event day..."
                    value={newForm.notes}
                    onChange={e => setNewForm({ ...newForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">Estimated Total Quote Value:</span>
                <span className="font-heading font-black text-sm text-cyan-800">
                  ₹{((newForm.estimatedQuantity || 0) * (newForm.quotedRatePerUnit || 0)).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save & Generate Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
