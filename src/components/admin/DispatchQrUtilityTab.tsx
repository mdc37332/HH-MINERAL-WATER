import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useStore } from '../../context/StoreContext';
import {
  generateOrderQrDataUrl,
  getOrderDispatchCode,
  openPrintableDispatchQrSheet,
  renderDispatchPassCardPng,
  verifyOrderAgainstScan,
} from '../../lib/dispatchQr';
import {
  QrCode,
  ScanLine,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  Download,
  RefreshCw,
  Package,
  Truck,
  ShieldCheck,
  Sparkles,
  CheckSquare,
  Square,
  X,
  Copy,
  Trash2,
  Receipt,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  History,
} from 'lucide-react';

interface DispatchQrUtilityTabProps {
  isFactoryStaffMode: boolean;
  onOpenOrderQrModal: (order: Order) => void;
  onOpenDeliveryChallan: (order: Order) => void;
}

export const DispatchQrUtilityTab: React.FC<DispatchQrUtilityTabProps> = ({
  isFactoryStaffMode,
  onOpenOrderQrModal,
  onOpenDeliveryChallan,
}) => {
  const {
    orders,
    invoices,
    adminSettings,
    pendingDispatchScan,
    setPendingDispatchScan,
    generateOrderDispatchQr,
    verifyOrderAtDispatchCounter,
    clearOrderDispatchVerification,
    openInvoiceForOrder,
    deleteOrder,
    deleteAllOrders,
    showToast,
  } = useStore();

  const [scanInput, setScanInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'verified' | 'self_pickup' | 'custom'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [qrThumbnails, setQrThumbnails] = useState<Record<string, string>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [isVerifyingAction, setIsVerifyingAction] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<{ mode: 'selected' | 'all'; targetOrders: Order[] } | null>(null);
  const [isDeletingAction, setIsDeletingAction] = useState<boolean>(false);

  // Enhanced Counter Terminal Controls
  const [autoVerifyOnScan, setAutoVerifyOnScan] = useState<boolean>(false);
  const [autoTargetStatus, setAutoTargetStatus] = useState<'keep' | 'Ready' | 'Out for Delivery' | 'Delivered'>('Ready');
  const [scannerSoundEnabled, setScannerSoundEnabled] = useState<boolean>(true);
  const [showRecentLog, setShowRecentLog] = useState<boolean>(false);
  const lastAutoVerifiedKeyRef = useRef<string>('');

  const playScannerTone = (tone: 'success' | 'error') => {
    if (!scannerSoundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (tone === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.11);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.17);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(190, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.19);
      }
      setTimeout(() => ctx.close().catch(() => {}), 300);
    } catch {
      // ignore audio context restrictions
    }
  };

  // Camera Scanner State (uses native BarcodeDetector when supported)
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // Consume deep-linked QR scan passed from StoreContext (e.g. ?dispatchVerify=...)
  useEffect(() => {
    if (pendingDispatchScan) {
      setScanInput(pendingDispatchScan);
      setPendingDispatchScan('');
    }
  }, [pendingDispatchScan, setPendingDispatchScan]);

  // Map orderId -> linked GST Invoice
  const invoiceByOrderId = useMemo(() => {
    const map: Record<string, typeof invoices[number]> = {};
    invoices.forEach(inv => {
      if (inv?.orderId && !map[inv.orderId]) {
        map[inv.orderId] = inv;
      }
    });
    return map;
  }, [invoices]);

  // Evaluate live scan result whenever scanInput, orders, or invoices change
  const scanResult = useMemo(() => {
    if (!scanInput.trim()) return null;
    return verifyOrderAgainstScan(orders, scanInput, invoices);
  }, [orders, invoices, scanInput]);

  // Hands-free Auto-Verify on exact scan match when enabled
  useEffect(() => {
    if (!autoVerifyOnScan || !scanResult) return;
    if (!scanResult.matched || !scanResult.signatureValid || !scanResult.order) return;

    const trimmed = scanInput.trim();
    const ord = scanResult.order;
    const isExactScan =
      trimmed.toUpperCase().startsWith('HH-DSP-') ||
      trimmed.includes('dispatchVerify=') ||
      trimmed.toLowerCase() === ord.id.toLowerCase() ||
      (scanResult.matchedInvoice && trimmed.toLowerCase() === (scanResult.matchedInvoice.invoiceNumber || '').toLowerCase());

    if (!isExactScan || ord.dispatchVerifiedAt) return;

    const dedupeKey = `${ord.id}:${trimmed}`;
    if (lastAutoVerifiedKeyRef.current === dedupeKey) return;
    lastAutoVerifiedKeyRef.current = dedupeKey;

    const nextStatus = autoTargetStatus === 'keep' ? ord.status : autoTargetStatus;
    handleCounterVerify(ord, nextStatus);
  }, [autoVerifyOnScan, autoTargetStatus, scanResult, scanInput]);

  // Filter orders for the dispatch QR directory
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      if (filterMode === 'pending' && ord.dispatchVerifiedAt) return false;
      if (filterMode === 'verified' && !ord.dispatchVerifiedAt) return false;
      if (filterMode === 'self_pickup' && ord.deliveryType !== 'self_pickup') return false;
      if (filterMode === 'custom' && !ord.isCustomOrder) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = getOrderDispatchCode(ord).toLowerCase();
        const invNo = (invoiceByOrderId[ord.id]?.invoiceNumber || '').toLowerCase();
        const matchId = ord.id.toLowerCase().includes(q);
        const matchCode = code.includes(q);
        const matchInv = invNo.includes(q);
        const matchName = (ord.customer?.name || '').toLowerCase().includes(q);
        const matchPhone = (ord.customer?.phone || '').toLowerCase().includes(q);
        return matchId || matchCode || matchInv || matchName || matchPhone;
      }
      return true;
    });
  }, [orders, filterMode, searchQuery, invoiceByOrderId]);

  // Generate QR data URL thumbnails for visible orders
  useEffect(() => {
    let active = true;
    const missing = filteredOrders.filter(o => !qrThumbnails[`${o.id}:${getOrderDispatchCode(o)}`]).slice(0, 24);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async ord => {
        const code = getOrderDispatchCode(ord);
        const dataUrl = await generateOrderQrDataUrl(ord, { width: 200, overrideCode: code });
        return { key: `${ord.id}:${code}`, id: ord.id, dataUrl };
      })
    )
      .then(entries => {
        if (!active) return;
        setQrThumbnails(prev => {
          const next = { ...prev };
          entries.forEach(e => {
            next[e.key] = e.dataUrl;
            next[e.id] = e.dataUrl;
          });
          return next;
        });
      })
      .catch(err => console.warn('Batch thumbnail QR error:', err));

    return () => {
      active = false;
    };
  }, [filteredOrders]);

  // Camera cleanup
  const stopCameraScanner = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  const startCameraScanner = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Use a handheld 2D QR scanner or paste the verification code.');
      setIsCameraOpen(true);
      return;
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setCameraError('Live browser QR camera decoding is unavailable here. Focus the scan box above for a USB/Bluetooth QR scanner or paste the token.');
      setIsCameraOpen(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const detected = await detector.detect(videoRef.current);
          if (Array.isArray(detected) && detected.length > 0 && detected[0].rawValue) {
            const scannedVal = detected[0].rawValue;
            setScanInput(scannedVal);
            stopCameraScanner();
            showToast('QR Code Scanned', 'Order lookup updated from camera scan.', 'success');
          }
        } catch {
          // ignore frame read errors
        }
      }, 350);
    } catch (err: any) {
      setCameraError(err?.message || 'Camera permission denied or unavailable.');
      setIsCameraOpen(true);
    }
  };

  const handleCounterVerify = async (order: Order, nextStatus?: OrderStatus) => {
    setIsVerifyingAction(true);
    try {
      const code = getOrderDispatchCode(order);
      const res = await verifyOrderAtDispatchCounter(order.id, code, { nextStatus });
      playScannerTone(res.success ? 'success' : 'error');
    } finally {
      setIsVerifyingAction(false);
    }
  };

  const handleResetVerification = async (order: Order) => {
    setIsVerifyingAction(true);
    try {
      await clearOrderDispatchVerification(order.id);
    } finally {
      setIsVerifyingAction(false);
    }
  };

  const handleGenerateAllMissing = async () => {
    const targets = orders.filter(o => !o.dispatchQrCode);
    if (targets.length === 0) {
      showToast('All Orders Linked', 'Every active order already has a unique Dispatch QR code.', 'info');
      return;
    }
    setIsGeneratingAll(true);
    try {
      for (const ord of targets) {
        await generateOrderDispatchQr(ord.id, false);
      }
      showToast('Batch QR Complete', `Linked unique QR scan codes to ${targets.length} order(s).`, 'success');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handlePrintBatchLabels = async () => {
    const targets =
      selectedOrderIds.size > 0
        ? filteredOrders.filter(o => selectedOrderIds.has(o.id))
        : filteredOrders.slice(0, 20);

    if (targets.length === 0) {
      showToast('No Orders Selected', 'Select at least one order to print dispatch QR labels.', 'warning');
      return;
    }

    const urlMap: Record<string, string> = {};
    for (const ord of targets) {
      const code = getOrderDispatchCode(ord);
      urlMap[ord.id] = await generateOrderQrDataUrl(ord, { width: 240, overrideCode: code });
    }
    const storeName = adminSettings?.tradeName || adminSettings?.legalBusinessName || 'HH MINERAL WATER';
    openPrintableDispatchQrSheet(targets, urlMap, storeName);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filteredOrders.length === 0) return;
    const allSelected = filteredOrders.every(o => selectedOrderIds.has(o.id));
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const confirmSingleDelete = async () => {
    if (!orderToDelete) return;
    const target = orderToDelete;
    setIsDeletingAction(true);
    try {
      await deleteOrder(target.id);
      setSelectedOrderIds(prev => {
        if (!prev.has(target.id)) return prev;
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      if (scanResult?.order?.id === target.id) {
        setScanInput('');
      }
      setOrderToDelete(null);
    } finally {
      setIsDeletingAction(false);
    }
  };

  const confirmBatchDelete = async () => {
    if (!batchDeleteTarget || batchDeleteTarget.targetOrders.length === 0) return;
    const { mode, targetOrders } = batchDeleteTarget;
    setIsDeletingAction(true);
    try {
      const targetIds = targetOrders.map(o => o.id);
      if (mode === 'all' && targetIds.length === orders.length && !searchQuery.trim() && filterMode === 'all') {
        await deleteAllOrders();
        setSelectedOrderIds(new Set());
        setScanInput('');
      } else {
        for (const id of targetIds) {
          await deleteOrder(id);
        }
        setSelectedOrderIds(prev => {
          const next = new Set(prev);
          targetIds.forEach(id => next.delete(id));
          return next;
        });
        if (scanResult?.order && targetIds.includes(scanResult.order.id)) {
          setScanInput('');
        }
      }
      setBatchDeleteTarget(null);
    } finally {
      setIsDeletingAction(false);
    }
  };

  const verifiedOrdersList = useMemo(
    () =>
      orders
        .filter(o => Boolean(o.dispatchVerifiedAt))
        .sort((a, b) => new Date(b.dispatchVerifiedAt || 0).getTime() - new Date(a.dispatchVerifiedAt || 0).getTime()),
    [orders]
  );
  const verifiedCount = verifiedOrdersList.length;
  const pendingCount = orders.filter(o => !o.dispatchVerifiedAt && o.status !== 'Cancelled').length;
  const verifiedBottlesCount = verifiedOrdersList.reduce(
    (sum, o) => sum + (o.items || []).reduce((acc, it) => acc + (Number(it?.quantity) || 0), 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Counter Scanner & Quick Verification Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 rounded-3xl p-6 sm:p-7 text-white border border-cyan-700/40 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/50 text-[#DFC283] flex items-center justify-center shrink-0">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-black text-white">
                  Factory Dispatch Counter — QR Verification Utility
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {verifiedCount} Verified • {pendingCount} Pending Scan
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Scan any printed GST Invoice QR, Delivery Challan QR, handheld 2D barcode gun, or enter <span className="font-mono text-[#DFC283]">HH-DSP-...</span> / <span className="font-mono text-cyan-300">HH/2026/...</span> Invoice No.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-toggle-auto-verify-qr"
              onClick={() => setAutoVerifyOnScan(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                autoVerifyOnScan
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Automatically mark matching scanned QR orders as verified without clicking"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Verify: {autoVerifyOnScan ? 'ON' : 'OFF'}</span>
            </button>

            {autoVerifyOnScan && (
              <select
                value={autoTargetStatus}
                onChange={e => setAutoTargetStatus(e.target.value as any)}
                className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none cursor-pointer"
                title="Status applied automatically on scan"
              >
                <option value="keep">Keep Current Status</option>
                <option value="Ready">Set Ready</option>
                <option value="Out for Delivery">Set Out for Delivery</option>
                <option value="Delivered">Set Delivered</option>
              </select>
            )}

            <button
              type="button"
              id="btn-toggle-scanner-sound"
              onClick={() => setScannerSoundEnabled(prev => !prev)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
              title={scannerSoundEnabled ? 'Mute scanner beep sound' : 'Enable scanner beep sound'}
            >
              {scannerSoundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#DFC283]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              id="btn-focus-qr-scanner-input"
              onClick={() => scanInputRef.current?.focus()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#DFC283]" />
              <span>Focus Scanner Box</span>
            </button>
            <button
              type="button"
              id="btn-toggle-camera-qr-scanner"
              onClick={() => (isCameraOpen ? stopCameraScanner() : startCameraScanner())}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                isCameraOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#C5A059] hover:brightness-110 text-black'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isCameraOpen ? 'Close Camera' : 'Scan via Camera'}</span>
            </button>
          </div>
        </div>

        {/* Counter Metrics Strip + Recent Log Toggle */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Total Passes</span>
            <span className="text-lg font-black font-mono text-white">{orders.length}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-3.5 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">Verified Counter</span>
            <span className="text-lg font-black font-mono text-emerald-300">{verifiedCount}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3.5 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">Pending Scan</span>
            <span className="text-lg font-black font-mono text-amber-300">{pendingCount}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRecentLog(prev => !prev)}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 rounded-2xl px-3.5 py-2.5 text-left transition-colors cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold flex items-center justify-between">
              <span>Bottles Verified</span>
              <History className="w-3 h-3 text-cyan-300" />
            </span>
            <span className="text-lg font-black font-mono text-white">
              {verifiedBottlesCount.toLocaleString('en-IN')} <span className="text-[10px] font-sans text-cyan-300 font-bold">{showRecentLog ? '(Hide Log)' : '(View Log)'}</span>
            </span>
          </button>
        </div>

        {showRecentLog && (
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#DFC283] uppercase tracking-wider">
              <span>Recent Dispatch Counter Verifications ({verifiedOrdersList.length})</span>
              <button
                type="button"
                onClick={() => setShowRecentLog(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            {verifiedOrdersList.length === 0 ? (
              <p className="text-xs text-slate-400">No counter scans recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {verifiedOrdersList.slice(0, 12).map(vo => (
                  <div
                    key={vo.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono font-bold text-white">{vo.id}</span>
                      <span className="font-mono text-[10px] text-[#DFC283] bg-black/50 px-1.5 py-0.5 rounded">
                        {getOrderDispatchCode(vo)}
                      </span>
                      <span className="text-slate-300 truncate">{vo.customer?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{vo.dispatchVerifiedBy || 'Counter'}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {vo.dispatchVerifiedAt ? new Date(vo.dispatchVerifiedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => openInvoiceForOrder(vo)}
                        className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold cursor-pointer"
                      >
                        GST Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scanner Input Box */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <QrCode className="w-4 h-4 text-[#DFC283] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={scanInputRef}
              id="input-dispatch-qr-scan"
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && scanResult?.matched && scanResult.signatureValid && scanResult.order) {
                  e.preventDefault();
                  const nextSt = autoTargetStatus === 'keep' ? scanResult.order.status : autoTargetStatus;
                  handleCounterVerify(scanResult.order, nextSt);
                }
              }}
              placeholder="Scan QR / Paste URL / Enter Order ID (HH-ORD-...), Invoice No. (HH/...), Phone, or Token (HH-DSP-...)"
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-900/90 border-2 border-[#C5A059]/50 focus:border-[#DFC283] text-sm font-mono text-white placeholder-slate-400 outline-none"
            />
            {scanInput && (
              <button
                type="button"
                onClick={() => setScanInput('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="Clear scan"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Camera Feed (when open) */}
        {isCameraOpen && (
          <div className="bg-black/60 border border-slate-700 rounded-2xl p-4 space-y-3">
            {cameraError ? (
              <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full max-w-sm rounded-xl border border-slate-700 bg-black"
                />
                <span className="text-[11px] text-slate-300">
                  Point camera at an Order Dispatch QR label to verify automatically...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Instant Verification Result Panel */}
        {scanResult && (
          <div
            className={`rounded-2xl p-4 sm:p-5 border ${
              scanResult.matched && scanResult.signatureValid
                ? 'bg-emerald-950/70 border-emerald-500/60'
                : 'bg-rose-950/70 border-rose-500/60'
            }`}
          >
            {scanResult.matched && scanResult.order ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {scanResult.signatureValid ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-base text-white">
                          {scanResult.order.id}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            scanResult.signatureValid
                              ? 'bg-emerald-500 text-black'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {scanResult.signatureValid ? 'AUTHENTIC QR SIGNATURE' : 'TOKEN MISMATCH'}
                        </span>
                        {scanResult.order.dispatchVerifiedAt && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-200">
                            Already Verified {new Date(scanResult.order.dispatchVerifiedAt).toLocaleTimeString('en-IN')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 mt-0.5">
                        {scanResult.order.customer?.name} ({scanResult.order.customer?.phone}) • ₹{scanResult.order.totalAmount} ({scanResult.order.paymentStatus}) • Status: <strong>{scanResult.order.status}</strong>
                      </p>
                    </div>
                  </div>

                  {scanResult.signatureValid && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isVerifyingAction}
                        onClick={() => handleCounterVerify(scanResult.order!, 'Ready')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black cursor-pointer disabled:opacity-50"
                      >
                        Verify &amp; Mark Ready
                      </button>
                      <button
                        type="button"
                        disabled={isVerifyingAction}
                        onClick={() => handleCounterVerify(scanResult.order!, 'Out for Delivery')}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black cursor-pointer disabled:opacity-50"
                      >
                        Verify &amp; Dispatch
                      </button>
                      <button
                        type="button"
                        disabled={isVerifyingAction}
                        onClick={() => handleCounterVerify(scanResult.order!, 'Delivered')}
                        className="px-3.5 py-2 rounded-xl bg-[#DFC283] hover:brightness-110 text-black text-xs font-black cursor-pointer disabled:opacity-50"
                      >
                        Verify &amp; Handover
                      </button>
                      <button
                        type="button"
                        onClick={() => openInvoiceForOrder(scanResult.order!)}
                        className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Open GST Invoice Paper with embedded Dispatch QR Counter"
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#DFC283]" />
                        <span>GST Invoice</span>
                      </button>
                      {scanResult.order.dispatchVerifiedAt && (
                        <button
                          type="button"
                          disabled={isVerifyingAction}
                          onClick={() => handleResetVerification(scanResult.order!)}
                          className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Reset accidental counter verification"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Scan</span>
                        </button>
                      )}
                      <button
                        type="button"
                        id={`btn-scan-result-delete-${scanResult.order.id}`}
                        disabled={isDeletingAction}
                        onClick={() => setOrderToDelete(scanResult.order!)}
                        className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Permanently delete this order and its QR pass"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {!scanResult.signatureValid && scanResult.reason && (
                  <p className="text-xs text-rose-200 font-semibold">{scanResult.reason}</p>
                )}

                {/* Packing Items Checklist */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/10 text-xs flex flex-wrap gap-2">
                  {(scanResult.order.items || []).map((it, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-100 font-semibold">
                      {it.product?.name} ({it.product?.size}) × {it.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-rose-200 text-xs font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{scanResult.reason || 'Order not found for scanned code.'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls & Batch Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter by Order ID, Invoice No., HH-DSP code, Customer, Phone..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-cyan-600 text-xs outline-none"
              />
            </div>

            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Orders ({orders.length})</option>
              <option value="pending">Pending Counter Scan ({pendingCount})</option>
              <option value="verified">Verified at Counter ({verifiedCount})</option>
              <option value="self_pickup">Self Pickup Only</option>
              <option value="custom">Custom Design Orders</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id)) ? (
                <CheckSquare className="w-3.5 h-3.5 text-cyan-700" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{selectedOrderIds.size > 0 ? `Selected (${selectedOrderIds.size})` : 'Select All'}</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingAll}
              onClick={handleGenerateAllMissing}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#DFC283] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAll ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAll ? 'Linking...' : 'Link Missing QR Codes'}</span>
            </button>

            <button
              type="button"
              id="btn-print-batch-qr-labels"
              onClick={handlePrintBatchLabels}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {selectedOrderIds.size > 0 ? `Selected (${selectedOrderIds.size})` : 'Batch'} QR Sheet</span>
            </button>

            {selectedOrderIds.size > 0 && (
              <button
                type="button"
                id="btn-delete-selected-qr-orders"
                onClick={() => {
                  const targets = filteredOrders.filter(o => selectedOrderIds.has(o.id));
                  if (targets.length > 0) {
                    setBatchDeleteTarget({ mode: 'selected', targetOrders: targets });
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Permanently delete selected QR counter orders"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedOrderIds.size})</span>
              </button>
            )}

            {filteredOrders.length > 0 && (
              <button
                type="button"
                id="btn-delete-all-qr-orders"
                onClick={() => setBatchDeleteTarget({ mode: 'all', targetOrders: filteredOrders })}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Permanently delete all displayed QR counter orders"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete All ({filteredOrders.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order QR Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-2">
          <QrCode className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-heading text-base font-bold text-slate-900">No Matching Orders for QR Generation</h3>
          <p className="text-xs text-slate-500">Create an online or offline counter order to generate unique dispatch verification QR codes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(ord => {
            const code = getOrderDispatchCode(ord);
            const thumb = qrThumbnails[`${ord.id}:${code}`] || qrThumbnails[ord.id];
            const isSelected = selectedOrderIds.has(ord.id);
            const totalBottles = (ord.items || []).reduce((acc, it) => acc + (Number(it?.quantity) || 0), 0);

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-3xl border p-5 shadow-xs space-y-4 transition-all ${
                  isSelected
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20'
                    : ord.dispatchVerifiedAt
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Top Meta Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleOrderSelection(ord.id)}
                      className="mt-0.5 text-slate-400 hover:text-cyan-700 cursor-pointer shrink-0"
                      title="Select for batch print"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-slate-900">{ord.id}</span>
                        {ord.isCustomOrder && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{ord.customer?.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{ord.customer?.phone}</p>
                    </div>
                  </div>

                  {ord.dispatchVerifiedAt ? (
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                      Pending Scan
                    </span>
                  )}
                </div>

                {/* Middle QR Preview & Packing Spec */}
                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <div
                    onClick={() => onOpenOrderQrModal(ord)}
                    className="w-24 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer hover:border-cyan-500 transition-colors p-1"
                    title="Click to enlarge QR pass"
                  >
                    {thumb ? (
                      <img src={thumb} alt={`QR ${ord.id}`} className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-8 h-8 text-slate-300 animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded bg-slate-900 text-[#DFC283] truncate">
                        {code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(code).catch(() => {});
                          showToast('Code Copied', `${code} copied to clipboard.`, 'info');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy scan token"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-slate-700 font-semibold">
                      {totalBottles} Bottles • ₹{ord.totalAmount}
                    </p>
                    {invoiceByOrderId[ord.id]?.invoiceNumber && (
                      <p className="text-[10px] font-mono font-bold text-cyan-800 truncate">
                        Inv: {invoiceByOrderId[ord.id].invoiceNumber}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      {ord.deliveryType === 'self_pickup' ? (
                        <>
                          <Package className="w-3 h-3 text-emerald-600" />
                          <span>Self Pickup</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3 h-3 text-cyan-600" />
                          <span>Doorstep • {ord.status}</span>
                        </>
                      )}
                    </p>
                    {ord.dispatchVerifiedAt && (
                      <p className="text-[10px] text-emerald-700 font-semibold truncate">
                        Verified by {ord.dispatchVerifiedBy || 'Counter'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenOrderQrModal(ord)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#DFC283]" />
                      <span>View Pass</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-qr-card-gst-invoice-${ord.id}`}
                      onClick={() => openInvoiceForOrder(ord)}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold flex items-center gap-1 cursor-pointer"
                      title="Open GST Invoice Paper with embedded Dispatch QR Counter"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>GST Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const storeName = adminSettings?.tradeName || adminSettings?.legalBusinessName || 'HH MINERAL WATER';
                        const png = await renderDispatchPassCardPng(ord, storeName);
                        const link = document.createElement('a');
                        link.href = png;
                        link.download = `HH-Dispatch-QR-${ord.id}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Download Dispatch QR Pass PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDeliveryChallan(ord)}
                      className="p-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 cursor-pointer"
                      title="Open Delivery Challan with embedded QR"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isFactoryStaffMode && (
                      <button
                        type="button"
                        onClick={() => generateOrderDispatchQr(ord.id, true)}
                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                        title="Regenerate / Rotate unique QR code (Admin Only)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isVerifyingAction}
                      onClick={() =>
                        handleCounterVerify(
                          ord,
                          ord.status === 'New' || ord.status === 'Confirmed' || ord.status === 'Processing'
                            ? 'Ready'
                            : ord.status
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        ord.dispatchVerifiedAt
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{ord.dispatchVerifiedAt ? 'Verified' : 'Verify Scan'}</span>
                    </button>

                    {ord.dispatchVerifiedAt && (
                      <button
                        type="button"
                        disabled={isVerifyingAction}
                        onClick={() => handleResetVerification(ord)}
                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer transition-colors"
                        title="Reset verification back to Pending Scan"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      id={`btn-delete-dispatch-qr-${ord.id}`}
                      onClick={() => setOrderToDelete(ord)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors"
                      title="Delete Order & QR Pass Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Order QR Permanent Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-black text-slate-900">
                  Delete Dispatch QR Order?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Order <span className="font-mono font-bold text-slate-900">{orderToDelete.id}</span> ({orderToDelete.customer?.name}) and its QR token <span className="font-mono font-bold text-slate-800">{getOrderDispatchCode(orderToDelete)}</span> will be permanently deleted and will not restore on refresh.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingAction}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-dispatch-qr"
                disabled={isDeletingAction}
                onClick={confirmSingleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAction ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch / Delete All Confirmation Modal */}
      {batchDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-black text-slate-900">
                  {batchDeleteTarget.mode === 'selected'
                    ? `Delete ${batchDeleteTarget.targetOrders.length} Selected Order(s)?`
                    : `Delete All ${batchDeleteTarget.targetOrders.length} Displayed Order(s)?`}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  All {batchDeleteTarget.targetOrders.length} Dispatch QR Counter order(s) and their verification passes will be permanently deleted from all records and will not restore after delete.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingAction}
                onClick={() => setBatchDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-batch-delete-dispatch-qr"
                disabled={isDeletingAction}
                onClick={confirmBatchDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAction ? 'Deleting...' : `Yes, Delete ${batchDeleteTarget.targetOrders.length}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
