import React, { useEffect, useState } from 'react';
import { Order, OrderStatus, AdminSettings } from '../../types';
import { useStore } from '../../context/StoreContext';
import {
  buildOrderDispatchQrPayload,
  generateOrderQrDataUrl,
  getOrderDispatchCode,
  openPrintableDispatchQrSheet,
  renderDispatchPassCardPng,
} from '../../lib/dispatchQr';
import {
  QrCode,
  X,
  CheckCircle2,
  Download,
  Printer,
  Copy,
  RefreshCw,
  ShieldCheck,
  Package,
  Truck,
  Clock,
  Check,
  Trash2,
  Receipt,
  RotateCcw,
} from 'lucide-react';

interface OrderDispatchQrModalProps {
  order: Order;
  adminSettings?: AdminSettings;
  isFactoryStaffMode?: boolean;
  onClose: () => void;
}

export const OrderDispatchQrModal: React.FC<OrderDispatchQrModalProps> = ({
  order: initialOrder,
  adminSettings,
  isFactoryStaffMode = false,
  onClose,
}) => {
  const {
    orders,
    generateOrderDispatchQr,
    verifyOrderAtDispatchCounter,
    clearOrderDispatchVerification,
    openInvoiceForOrder,
    deleteOrder,
    showToast,
  } = useStore();

  // Keep synced with live store state so verification/regeneration reflects immediately
  const order = orders.find(o => o.id === initialOrder.id) || initialOrder;
  const dispatchCode = getOrderDispatchCode(order);
  const qrPayload = buildOrderDispatchQrPayload(order, dispatchCode);
  const totalBottles = (order.items || []).reduce((acc, it) => acc + (Number(it?.quantity) || 0), 0);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [nextStatusOnVerify, setNextStatusOnVerify] = useState<OrderStatus>(
    order.status === 'New' || order.status === 'Confirmed' || order.status === 'Processing'
      ? 'Ready'
      : order.status
  );

  useEffect(() => {
    let active = true;
    setIsGenerating(true);
    generateOrderQrDataUrl(order, { width: 320, overrideCode: dispatchCode })
      .then(url => {
        if (active) setQrDataUrl(url);
      })
      .catch(err => console.warn('QR generation error:', err))
      .finally(() => {
        if (active) setIsGenerating(false);
      });
    return () => {
      active = false;
    };
  }, [order.id, dispatchCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(dispatchCode);
      setCopiedCode(true);
      showToast('Code Copied', `Dispatch verification code ${dispatchCode} copied.`, 'info');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Copy Notice', `Verification code: ${dispatchCode}`, 'info');
    }
  };

  const handleDownloadPassPng = async () => {
    try {
      const storeName = adminSettings?.tradeName || adminSettings?.legalBusinessName || 'HH MINERAL WATER';
      const pngUrl = await renderDispatchPassCardPng(order, storeName);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `HH-Dispatch-QR-${order.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Dispatch Pass Downloaded', `Saved QR verification pass for ${order.id}.`, 'success');
    } catch (err) {
      console.error('Download pass error:', err);
      showToast('Download Error', 'Could not generate PNG download.', 'error');
    }
  };

  const handlePrintLabel = () => {
    if (!qrDataUrl) return;
    const storeName = adminSettings?.tradeName || adminSettings?.legalBusinessName || 'HH MINERAL WATER';
    openPrintableDispatchQrSheet([order], { [order.id]: qrDataUrl }, storeName);
  };

  const handleVerifyAtCounter = async () => {
    setIsVerifying(true);
    try {
      await verifyOrderAtDispatchCounter(order.id, dispatchCode, {
        nextStatus: nextStatusOnVerify,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegenerate = async () => {
    if (isFactoryStaffMode) return;
    setIsRegenerating(true);
    try {
      await generateOrderDispatchQr(order.id, true);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-[#DFC283] flex items-center justify-center shadow-sm shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-slate-900">
                Factory Dispatch QR Verification Pass
              </h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-bold text-slate-800">{order.id}</span> • Counter Scan &amp; Handover Token
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-order-qr-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code + Order Summary Split */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* Left: Crisp QR Canvas */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            {isGenerating ? (
              <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-600" />
                <span>Generating QR...</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Dispatch QR for ${order.id}`}
                className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs"
              />
            ) : null}

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[#DFC283] font-mono font-bold text-xs tracking-wider cursor-pointer transition-colors"
              title="Copy unique dispatch verification code"
            >
              <span>{dispatchCode}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Right: Order Verification Details */}
          <div className="sm:col-span-7 space-y-3 text-xs">
            {/* Verification Status Badge */}
            {order.dispatchVerifiedAt ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-0.5">
                <div className="flex items-center gap-1.5 font-black text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>VERIFIED AT FACTORY COUNTER</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  By {order.dispatchVerifiedBy || 'Dispatch Counter'} • {new Date(order.dispatchVerifiedAt).toLocaleString('en-IN')}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5">
                <div className="flex items-center gap-1.5 font-black text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>PENDING COUNTER QR SCAN</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Scan at dispatch gate or verify below upon bottle loading/pickup.
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <strong className="text-slate-900 text-right">{order.customer?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <strong className="font-mono text-slate-900">{order.customer?.phone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Mode:</span>
                <strong className="text-slate-900 flex items-center gap-1">
                  {order.deliveryType === 'self_pickup' ? (
                    <>
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Self Pickup</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Doorstep Delivery</span>
                    </>
                  )}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bottles:</span>
                <strong className="text-slate-900">{totalBottles} Units</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Status:</span>
                <strong className="text-cyan-800">{order.status}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount &amp; Payment:</span>
                <strong className="text-slate-900">₹{order.totalAmount} ({order.paymentStatus})</strong>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 break-all bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 font-mono">
              Scan URI: {qrPayload}
            </div>
          </div>
        </div>

        {/* Quick Counter Verify Action Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#DFC283] block">
              Counter Handover Verification
            </span>
            <select
              value={nextStatusOnVerify}
              onChange={e => setNextStatusOnVerify(e.target.value as OrderStatus)}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value={order.status}>Keep Status ({order.status})</option>
              <option value="Ready">Verify &amp; Mark Ready for Dispatch</option>
              <option value="Out for Delivery">Verify &amp; Mark Out for Delivery</option>
              <option value="Delivered">Verify &amp; Mark Delivered</option>
            </select>
          </div>

          <button
            type="button"
            id="btn-modal-verify-dispatch-qr"
            disabled={isVerifying}
            onClick={handleVerifyAtCounter}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying...' : order.dispatchVerifiedAt ? 'Re-Verify at Counter' : 'Verify at Counter'}</span>
          </button>
        </div>

        {/* Footer Actions: Download, Print, Regenerate (Admin Only), Delete */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openInvoiceForOrder(order)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#DFC283] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Open GST Invoice Paper with embedded Dispatch QR Counter"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>GST Invoice</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPassPng}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-700" />
              <span>Download Pass PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrintLabel}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print QR Label</span>
            </button>
            {order.dispatchVerifiedAt && (
              <button
                type="button"
                disabled={isVerifying || isDeleting}
                onClick={async () => {
                  setIsVerifying(true);
                  try {
                    await clearOrderDispatchVerification(order.id);
                  } finally {
                    setIsVerifying(false);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                title="Reset counter scan verification"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Scan</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isFactoryStaffMode && (
              <button
                type="button"
                disabled={isRegenerating || isDeleting}
                onClick={handleRegenerate}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                title="Rotate and generate a fresh unique QR code for this order (Admin Only)"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Rotating...' : 'Regenerate QR'}</span>
              </button>
            )}

            {isConfirmingDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2 py-1">
                <span className="text-[11px] font-bold text-rose-800 px-1">Delete permanently?</span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-modal-confirm-delete-order-qr"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteOrder}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-modal-delete-order-qr"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Permanently delete this order and its QR pass"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
