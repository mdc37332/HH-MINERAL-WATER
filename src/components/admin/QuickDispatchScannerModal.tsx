import React, { useEffect, useRef, useState } from 'react';
import { Order } from '../../types';
import { useStore } from '../../context/StoreContext';
import { getOrderDispatchCode, verifyOrderAgainstScan } from '../../lib/dispatchQr';
import {
  Camera,
  CheckCircle2,
  QrCode,
  ScanLine,
  Truck,
  X,
  AlertTriangle,
  Receipt,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface QuickDispatchScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SessionScanOutcome {
  status: 'delivered' | 'already_delivered' | 'error';
  message: string;
  order?: Order;
  dispatchCode?: string;
  timestamp: string;
}

export const QuickDispatchScannerModal: React.FC<QuickDispatchScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    orders,
    invoices,
    verifyOrderAtDispatchCounter,
    openInvoiceForOrder,
  } = useStore();

  const [scanInput, setScanInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOutcome, setLastOutcome] = useState<SessionScanOutcome | null>(null);
  const [sessionDeliveredOrders, setSessionDeliveredOrders] = useState<Order[]>([]);

  // Camera scanner state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastProcessedRawRef = useRef<string>('');
  const processingLockRef = useRef<boolean>(false);

  const playTone = (type: 'success' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.11);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.setValueAtTime(185, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.19);
      }
      setTimeout(() => ctx.close().catch(() => {}), 300);
    } catch {
      // ignore audio context block
    }
  };

  const stopCamera = () => {
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
    if (isOpen) {
      lastProcessedRawRef.current = '';
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      stopCamera();
      setScanInput('');
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const executeScanDeliver = async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed || processingLockRef.current) return;

    processingLockRef.current = true;
    setIsProcessing(true);

    try {
      const match = verifyOrderAgainstScan(orders, trimmed, invoices);
      if (!match.matched || !match.order) {
        playTone('error');
        setLastOutcome({
          status: 'error',
          message: match.reason || `No order found matching "${trimmed}".`,
          timestamp: new Date().toLocaleTimeString('en-IN'),
        });
        return;
      }

      if (!match.signatureValid) {
        playTone('error');
        setLastOutcome({
          status: 'error',
          message: match.reason || 'QR verification token mismatch.',
          order: match.order,
          dispatchCode: match.expectedCode,
          timestamp: new Date().toLocaleTimeString('en-IN'),
        });
        return;
      }

      const matchedOrder = match.order;
      const code = getOrderDispatchCode(matchedOrder);
      const alreadyDelivered =
        matchedOrder.status === 'Delivered' && Boolean(matchedOrder.dispatchVerifiedAt);

      if (alreadyDelivered) {
        playTone('success');
        setLastOutcome({
          status: 'already_delivered',
          message: `Order ${matchedOrder.id} is already verified & marked Delivered.`,
          order: matchedOrder,
          dispatchCode: code,
          timestamp: new Date().toLocaleTimeString('en-IN'),
        });
        setScanInput('');
        setTimeout(() => inputRef.current?.focus(), 60);
        return;
      }

      const result = await verifyOrderAtDispatchCounter(matchedOrder.id, code, {
        nextStatus: 'Delivered',
      });

      if (result.success && result.order) {
        playTone('success');
        setLastOutcome({
          status: 'delivered',
          message: `Order ${result.order.id} verified and automatically updated to "Delivered".`,
          order: result.order,
          dispatchCode: code,
          timestamp: new Date().toLocaleTimeString('en-IN'),
        });
        setSessionDeliveredOrders(prev => [
          result.order!,
          ...prev.filter(o => o.id !== result.order!.id),
        ].slice(0, 6));
        setScanInput('');
        setTimeout(() => inputRef.current?.focus(), 60);
      } else {
        playTone('error');
        setLastOutcome({
          status: 'error',
          message: result.message || 'Could not update order status to Delivered.',
          order: matchedOrder,
          dispatchCode: code,
          timestamp: new Date().toLocaleTimeString('en-IN'),
        });
      }
    } finally {
      processingLockRef.current = false;
      setIsProcessing(false);
    }
  };

  // Auto-detect complete QR code scans (URL, JSON, HH-DSP token, exact Order ID, or exact GST Invoice No.)
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = scanInput.trim();
    if (!trimmed || trimmed === lastProcessedRawRef.current) return;

    const looksLikeCompleteQrPayload =
      trimmed.includes('dispatchVerify=') ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      /^HH-DSP-[A-Z0-9]{5}-[A-Z0-9]{6,10}$/i.test(trimmed);

    const quickMatch = verifyOrderAgainstScan(orders, trimmed, invoices);
    const isExactTextMatch =
      Boolean(quickMatch.matched && quickMatch.signatureValid && quickMatch.order) &&
      (trimmed.toLowerCase() === quickMatch.order!.id.toLowerCase() ||
        Boolean(
          quickMatch.matchedInvoice &&
            trimmed.toLowerCase() === (quickMatch.matchedInvoice.invoiceNumber || '').toLowerCase()
        ));

    if (
      (looksLikeCompleteQrPayload && quickMatch.matched) ||
      isExactTextMatch
    ) {
      lastProcessedRawRef.current = trimmed;
      executeScanDeliver(trimmed);
    }
  }, [scanInput, isOpen, orders, invoices]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not available in this browser. Focus the scan box for a 2D QR scanner or paste the code.');
      setIsCameraOpen(true);
      return;
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setCameraError('Live camera QR detection is unsupported here. Use a 2D scanner gun or paste the QR text above.');
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
        if (!videoRef.current || videoRef.current.readyState < 2 || processingLockRef.current) return;
        try {
          const detected = await detector.detect(videoRef.current);
          if (Array.isArray(detected) && detected.length > 0 && detected[0].rawValue) {
            const raw = String(detected[0].rawValue).trim();
            if (raw && raw !== lastProcessedRawRef.current) {
              lastProcessedRawRef.current = raw;
              stopCamera();
              await executeScanDeliver(raw);
            }
          }
        } catch {
          // ignore transient frame read errors
        }
      }, 300);
    } catch (err: any) {
      setCameraError(err?.message || 'Camera permission denied or unavailable.');
      setIsCameraOpen(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-scanner-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95">
        {/* Dark Obsidian & Gold Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 text-white px-6 py-4 flex items-center justify-between gap-3 border-b border-cyan-700/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/50 text-[#DFC283] flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 id="quick-scanner-modal-title" className="font-heading text-base font-black text-white">
                Scan QR to Mark Delivered
              </h3>
              <p className="text-[11px] text-slate-300">
                Auto-matches Dispatch QR &amp; sets status to Delivered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              title={soundEnabled ? 'Mute scanner beep' : 'Enable scanner beep'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#DFC283]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              type="button"
              id="btn-close-quick-deliver-scanner"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Scanner Overlay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (scanInput.trim()) {
                lastProcessedRawRef.current = scanInput.trim();
                executeScanDeliver(scanInput);
              }
            }}
            className="space-y-3"
          >
            <div className="relative">
              <QrCode className="w-4 h-4 text-cyan-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                id="input-quick-deliver-qr-scan"
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scan QR / Paste URL / Enter HH-DSP-..., Order ID, or Invoice No."
                autoFocus
                className="w-full pl-10 pr-10 py-3 rounded-2xl border-2 border-slate-300 focus:border-cyan-600 bg-slate-50 focus:bg-white text-sm font-mono text-black placeholder-slate-400 outline-none"
              />
              {scanInput && (
                <button
                  type="button"
                  onClick={() => {
                    setScanInput('');
                    lastProcessedRawRef.current = '';
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                id="btn-submit-quick-deliver-scan"
                disabled={isProcessing || !scanInput.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Verify &amp; Mark Delivered</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-toggle-quick-scanner-camera"
                onClick={() => (isCameraOpen ? stopCamera() : startCamera())}
                className={`py-2.5 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isCameraOpen
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-[#DFC283]'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{isCameraOpen ? 'Stop Camera' : 'Camera Scan'}</span>
              </button>
            </div>
          </form>

          {/* Live Camera Viewfinder */}
          {isCameraOpen && (
            <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800 space-y-2">
              {cameraError ? (
                <div className="flex items-start gap-2 text-amber-300 text-xs p-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full max-w-xs rounded-xl border border-slate-700 bg-black"
                  />
                  <span className="text-[11px] text-slate-300">
                    Point camera at any Dispatch QR pass or GST Invoice QR...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Latest Match / Auto-Delivery Result */}
          {lastOutcome && (
            <div
              className={`rounded-2xl p-4 border space-y-2.5 animate-in fade-in ${
                lastOutcome.status === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {lastOutcome.status === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-heading font-black text-sm">
                      {lastOutcome.status === 'delivered'
                        ? 'Marked Delivered ✓'
                        : lastOutcome.status === 'already_delivered'
                        ? 'Already Delivered ✓'
                        : 'Scan Not Matched'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {lastOutcome.timestamp}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed">{lastOutcome.message}</p>
                </div>
              </div>

              {lastOutcome.order && (
                <div className="bg-white/90 rounded-xl p-3 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">
                        {lastOutcome.order.id}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-700 truncate">
                        {lastOutcome.order.customer?.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {(lastOutcome.order.items || []).reduce((acc, it) => acc + (Number(it?.quantity) || 0), 0)} Bottles · ₹{lastOutcome.order.totalAmount} · {lastOutcome.dispatchCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInvoiceForOrder(lastOutcome.order!)}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>GST Invoice</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Session Delivered Summary */}
          {sessionDeliveredOrders.length > 0 && (
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Delivered This Session ({sessionDeliveredOrders.length})</span>
                <button
                  type="button"
                  onClick={() => setSessionDeliveredOrders([])}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Clear List
                </button>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {sessionDeliveredOrders.map(ord => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono font-bold text-slate-900">{ord.id}</span>
                      <span className="text-slate-600 truncate">{ord.customer?.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700">Delivered</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
