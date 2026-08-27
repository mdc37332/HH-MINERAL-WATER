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
  Printer
} from 'lucide-react';
import { getWhatsAppDirectUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

interface Props {
  order: Order;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<Props> = ({ order, onClose }) => {
  const { setCurrentSection, setTrackOrderId, triggerWhatsAppNotification, showToast, openInvoiceForOrder } = useStore();
  const [copied, setCopied] = useState(false);
  const [isRetryingWhatsApp, setIsRetryingWhatsApp] = useState(false);

  const whatsAppUrl = getWhatsAppDirectUrl(order);

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copied to Clipboard', `Order ID ${order.id} copied.`, 'info');
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsAppUrl, '_blank');
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
    await openInvoiceForOrder(order);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-6 animate-in zoom-in-95 duration-300">
        {/* Celebration Header */}
        <div className="bg-gradient-to-b from-cyan-600 via-sky-600 to-blue-700 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-9 h-9 text-emerald-300" />
          </div>

          <span className="inline-block px-3 py-1 bg-white/20 text-xs font-extrabold uppercase tracking-widest rounded-full border border-white/30 mb-2">
            Order Confirmed & Saved
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold">
            Thank You for Hydrating with HH!
          </h2>
          <p className="text-xs sm:text-sm text-cyan-100 mt-1 max-w-sm mx-auto">
            Your mineral water order has been recorded in the HH database and scheduled for delivery.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-sm font-mono font-bold">
            <span>Order ID: {order.id}</span>
            <button
              onClick={handleCopyId}
              className="text-cyan-200 hover:text-white p-0.5 transition-colors cursor-pointer"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          
          {/* Official GST Tax Invoice Card */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white rounded-2xl p-4.5 border border-cyan-800/40 shadow-md space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      GST Tax Invoice Ready
                    </h4>
                    <span className="text-[10px] bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 px-2 py-0.2 rounded font-mono font-bold">
                      {order.invoiceNumber || 'HH/2026/' + order.id.replace(/\D/g, '').slice(-6).padStart(6, '0')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Compliant with Indian GST rules (HSN 2201 • 18% GST itemized)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleViewInvoice}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View & Print Tax Invoice</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Admin Dispatch Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Admin WhatsApp Notification
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Dispatched to Admin WhatsApp: <strong>+91 {OWNER_WHATSAPP_NUMBER}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900">
                {order.whatsAppNotification?.status || 'SENT'}
              </span>
            </div>

            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Full order details including customer info, product list, custom design tags, and GST Tax invoice reference are formatted and sent directly to Admin WhatsApp (+91 {OWNER_WHATSAPP_NUMBER}).
            </p>

            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer ring-2 ring-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Send Order Details to Admin WhatsApp (+91 {OWNER_WHATSAPP_NUMBER})</span>
              </button>

              <button
                type="button"
                onClick={handleRetryWhatsApp}
                disabled={isRetryingWhatsApp}
                className="px-3 py-2.5 rounded-xl border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                {isRetryingWhatsApp ? 'Syncing...' : 'Resend to Admin'}
              </button>
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
              <span className="font-bold text-slate-800">{order.customer.name}</span>
              <span className="text-slate-500 block text-[11px] mt-0.5">{order.customer.phone}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Amount</span>
              <span className="font-heading text-base font-black text-cyan-800">₹{order.totalAmount}</span>
              <span className="text-[10px] text-emerald-600 font-semibold block">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleTrackThisOrder}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Track Live Delivery Status</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

