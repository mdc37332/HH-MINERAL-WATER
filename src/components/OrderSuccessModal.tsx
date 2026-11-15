import React, { useState } from 'react';
import { Order } from '../types';
import { useStore } from '../context/StoreContext';
import {
  CheckCircle2,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Search,
  ArrowRight,
  Sparkles,
  Phone,
  Package,
  Calendar,
  X,
  Receipt,
  FileText,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { getWhatsAppDirectUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

interface Props {
  order: Order;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<Props> = ({ order, onClose }) => {
  const {
    setCurrentSection,
    setTrackOrderId,
    triggerWhatsAppNotification,
    showToast,
    openInvoiceForOrder,
    isAdminUnlocked,
    isFactoryStaffUnlocked
  } = useStore();
  const [copied, setCopied] = useState(false);
  const [isRetryingWhatsApp, setIsRetryingWhatsApp] = useState(false);

  const isAdmin = Boolean(isAdminUnlocked && !isFactoryStaffUnlocked);
  const whatsAppUrl = getWhatsAppDirectUrl(order);

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copied to Clipboard', `Order ID ${order.id} copied.`, 'info');
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRetryWhatsApp = async () => {
    setIsRetryingWhatsApp(true);
    await triggerWhatsAppNotification(order, true);
    setIsRetryingWhatsApp(false);
  };

  const handleTrackThisOrder = () => {
    setTrackOrderId(order.id);
    setCurrentSection('orders');
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewInvoice = async () => {
    onClose();
    await openInvoiceForOrder(order);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative max-w-xl w-full bg-[#0e0e0e] text-white rounded-3xl shadow-2xl overflow-hidden border border-[#2a2a2a] my-6 animate-in zoom-in-95 duration-300">
        {/* Celebration Header */}
        <div className="bg-gradient-to-b from-[#181818] via-[#121212] to-[#0a0a0a] text-white p-8 text-center relative overflow-hidden border-b border-[#222222]">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#C5A059]/40 flex items-center justify-center mx-auto mb-3 shadow-inner text-[#DFC283]">
            <CheckCircle2 className="w-9 h-9 text-[#C5A059]" />
          </div>

          <span className="inline-block px-3 py-1 bg-[#C5A059]/15 text-xs font-black uppercase tracking-widest rounded-full border border-[#C5A059]/30 mb-2 text-[#DFC283]">
            Order Confirmed & Saved
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
            Thank You for Hydrating with HH!
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-sm mx-auto">
            Your mineral water order has been recorded in the HH database and scheduled for delivery.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-[#161616] px-4 py-2 rounded-xl border border-[#2e2e2e] text-sm font-mono font-bold text-white">
            <span>Order ID: <span className="text-[#DFC283]">{order.id}</span></span>
            <button
              onClick={handleCopyId}
              className="text-neutral-400 hover:text-white p-0.5 transition-colors cursor-pointer"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5 bg-[#0e0e0e]">
          
          {/* Official GST Tax Invoice Card */}
          <div className="bg-[#141414] text-white rounded-2xl p-4.5 border border-[#C5A059]/30 shadow-md space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1c1c1c] text-[#DFC283] border border-[#C5A059]/30 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#DFC283]">
                      GST Tax Invoice Ready
                    </h4>
                    <span className="text-[10px] bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#DFC283] px-2 py-0.2 rounded font-mono font-bold">
                      {order.invoiceNumber || 'HH/2026/' + order.id.replace(/\D/g, '').slice(-6).padStart(6, '0')}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Compliant with Indian GST rules (HSN 2201 • 18% GST itemized)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                id="btn-success-print-invoice"
                onClick={async () => {
                  onClose();
                  await openInvoiceForOrder(order, true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs py-2.5 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-black" />
                <span>Print Invoice</span>
              </button>

              <button
                type="button"
                id="btn-success-view-invoice"
                onClick={handleViewInvoice}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#202020] hover:bg-[#2a2a2a] text-white border border-[#333333] font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#DFC283]" />
                <span>View Invoice</span>
              </button>
            </div>
          </div>

          {/* Admin Only Operations & Dispatch Controls */}
          {isAdmin && (
            <div className="space-y-3 pt-1">
              {/* Automated System Dispatch Active Banner (Admin Only) */}
              <div className="bg-[#131418] border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                        <span>Automated Dispatch Active</span>
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-300 font-extrabold uppercase tracking-wider">
                        Admin Only
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                      Order details and GST Tax Invoice are automatically processed and routed to plant dispatch.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-600/60 text-emerald-400 shrink-0">
                  Auto Confirmed
                </span>
              </div>

              {/* Admin WhatsApp Tools (Admin Only) */}
              <div className="bg-[#131418] border border-[#C5A059]/35 hover:border-[#C5A059]/60 rounded-2xl p-3.5 space-y-2.5 shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFC283] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin Quick Tools (Owner: +91 {OWNER_WHATSAPP_NUMBER})</span>
                  </span>
                  <span className="text-[9px] text-neutral-300 font-mono bg-black/60 px-2 py-0.5 rounded border border-[#2a2a2a]">
                    Status: {order.whatsAppNotification?.status || 'SENT'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                    <span>Open Admin Chat</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleRetryWhatsApp}
                    disabled={isRetryingWhatsApp}
                    className="px-3 py-2 rounded-xl border border-[#333333] text-neutral-200 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isRetryingWhatsApp ? 'Syncing...' : 'Resend Alert'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
              <span className="text-neutral-500 block text-[10px] uppercase font-bold">Customer</span>
              <span className="font-bold text-white">{order.customer.name}</span>
              <span className="text-neutral-400 block text-[11px] mt-0.5">{order.customer.phone}</span>
            </div>

            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
              <span className="text-neutral-500 block text-[10px] uppercase font-bold">Total Amount</span>
              <span className="font-heading text-base font-black text-[#DFC283]">₹{order.totalAmount}</span>
              <span className="text-[10px] text-emerald-400 font-semibold block">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleTrackThisOrder}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs py-3 px-4 rounded-xl shadow-xl shadow-[#C5A059]/20 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-black" />
              <span>Track Live Delivery Status</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[#333333] text-neutral-300 hover:text-white hover:bg-[#1a1a1a] text-xs font-semibold transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

