import React, { useMemo, useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useStore } from '../../context/StoreContext';
import { getOrderDispatchCode } from '../../lib/dispatchQr';
import { downloadDispatchBatchPdf } from '../../lib/dispatchBatchPdf';
import {
  CheckCircle2,
  Clock,
  Truck,
  QrCode,
  FileText,
  Navigation,
  Search,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  Package,
  MapPin,
  Phone,
  ShieldCheck,
  LayoutList,
  Printer,
  X,
} from 'lucide-react';

interface DispatchBoardTabProps {
  isFactoryStaffMode: boolean;
  onOpenDeliveryChallan: (order: Order) => void;
  onOpenOrderQrModal: (order: Order) => void;
  onOpenDriverNav: (order: Order) => void;
  onOpenOrdersList: () => void;
}

type ColumnKey = 'pending' | 'in-transit' | 'delivered';
type FulfillmentFilter = 'all' | 'doorstep' | 'self_pickup' | 'custom';
type QrFilter = 'all' | 'verified' | 'needs_qr';
type SortOption = 'newest' | 'oldest' | 'highest_value';

function getOrderUnitsCount(order: Order): number {
  return (order.items || []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
}

function getNextStageConfig(
  order: Order
): { targetStatus: OrderStatus; label: string; toneClass: string } | null {
  switch (order.status) {
    case 'New':
      return {
        targetStatus: 'Confirmed',
        label: 'Confirm Order',
        toneClass: 'bg-slate-900 hover:bg-slate-800 text-white',
      };
    case 'Confirmed':
      return {
        targetStatus: 'Processing',
        label: 'Start Bottling',
        toneClass: 'bg-amber-600 hover:bg-amber-700 text-white',
      };
    case 'Processing':
      return {
        targetStatus: 'Ready',
        label: 'Mark Ready',
        toneClass: 'bg-sky-700 hover:bg-sky-800 text-white',
      };
    case 'Ready':
      if (order.deliveryType === 'self_pickup') {
        return {
          targetStatus: 'Delivered',
          label: 'Mark Picked Up',
          toneClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      }
      return {
        targetStatus: 'Out for Delivery',
        label: 'Dispatch In-Transit',
        toneClass: 'bg-sky-600 hover:bg-sky-700 text-white',
      };
    case 'Out for Delivery':
      return {
        targetStatus: 'Delivered',
        label: 'Mark Delivered',
        toneClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      };
    default:
      return null;
  }
}

function getSemanticStageText(status: OrderStatus): { label: string; colorClass: string } {
  switch (status) {
    case 'New':
      return { label: 'New Review', colorClass: 'text-amber-700' };
    case 'Confirmed':
      return { label: 'Confirmed', colorClass: 'text-sky-700' };
    case 'Processing':
      return { label: 'Bottling', colorClass: 'text-amber-700' };
    case 'Ready':
      return { label: 'Staged Ready', colorClass: 'text-emerald-700' };
    case 'Out for Delivery':
      return { label: 'In-Transit', colorClass: 'text-sky-700' };
    case 'Delivered':
      return { label: 'Delivered', colorClass: 'text-emerald-700' };
    default:
      return { label: status, colorClass: 'text-slate-600' };
  }
}

export const DispatchBoardTab: React.FC<DispatchBoardTabProps> = ({
  isFactoryStaffMode,
  onOpenDeliveryChallan,
  onOpenOrderQrModal,
  onOpenDriverNav,
  onOpenOrdersList,
}) => {
  const { orders, adminSettings, updateOrderStatus, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>('all');
  const [qrFilter, setQrFilter] = useState<QrFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [mobileLane, setMobileLane] = useState<ColumnKey>('pending');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [printingLane, setPrintingLane] = useState<ColumnKey | null>(null);

  const handlePrintBatch = (key: ColumnKey, title: string, columnOrders: Order[]) => {
    if (columnOrders.length === 0) {
      showToast(
        'No Orders in Column',
        `There are no orders currently in ${title} to include in the batch PDF.`,
        'info'
      );
      return;
    }

    setPrintingLane(key);
    try {
      downloadDispatchBatchPdf(key, title, columnOrders, adminSettings);
      showToast(
        `${title} Batch PDF Ready`,
        `Downloaded consolidated factory-floor sheet for ${columnOrders.length} ${title} order(s) with product totals, addresses & QR codes.`,
        'success'
      );
    } catch (err) {
      console.error('Batch PDF generation failed:', err);
      showToast(
        'Batch PDF Failed',
        'Could not generate the consolidated batch PDF. Please try again.',
        'error'
      );
    } finally {
      setPrintingLane(null);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    fulfillmentFilter !== 'all' ||
    qrFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFulfillmentFilter('all');
    setQrFilter('all');
  };

  const {
    pendingOrders,
    inTransitOrders,
    deliveredOrders,
    cancelledOrFailedCount,
    summaryMetrics,
  } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = orders.filter(ord => {
      if (ord.status === 'Cancelled' || ord.status === 'Failed') {
        return false;
      }

      if (fulfillmentFilter === 'doorstep' && ord.deliveryType === 'self_pickup') {
        return false;
      }
      if (fulfillmentFilter === 'self_pickup' && ord.deliveryType !== 'self_pickup') {
        return false;
      }
      if (fulfillmentFilter === 'custom' && !ord.isCustomOrder) {
        return false;
      }

      if (qrFilter === 'verified' && !ord.dispatchVerifiedAt) {
        return false;
      }
      if (qrFilter === 'needs_qr' && Boolean(ord.dispatchVerifiedAt)) {
        return false;
      }

      if (q) {
        const dispatchCode = getOrderDispatchCode(ord).toLowerCase();
        const matchesId = ord.id.toLowerCase().includes(q);
        const matchesName = (ord.customer?.name || '').toLowerCase().includes(q);
        const matchesPhone = (ord.customer?.phone || '').toLowerCase().includes(q);
        const matchesCity = (ord.customer?.city || '').toLowerCase().includes(q);
        const matchesPincode = (ord.customer?.pincode || '').toLowerCase().includes(q);
        const matchesQr = dispatchCode.includes(q);
        if (
          !matchesId &&
          !matchesName &&
          !matchesPhone &&
          !matchesCity &&
          !matchesPincode &&
          !matchesQr
        ) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'highest_value') {
        return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const pending: Order[] = [];
    const inTransit: Order[] = [];
    const delivered: Order[] = [];

    for (const ord of sorted) {
      if (
        ord.status === 'New' ||
        ord.status === 'Confirmed' ||
        ord.status === 'Processing' ||
        ord.status === 'Ready'
      ) {
        pending.push(ord);
      } else if (ord.status === 'Out for Delivery') {
        inTransit.push(ord);
      } else if (ord.status === 'Delivered') {
        delivered.push(ord);
      }
    }

    const pendingUnits = pending.reduce((sum, o) => sum + getOrderUnitsCount(o), 0);
    const inTransitUnits = inTransit.reduce((sum, o) => sum + getOrderUnitsCount(o), 0);
    const deliveredUnits = delivered.reduce((sum, o) => sum + getOrderUnitsCount(o), 0);

    const activeQueue = [...pending, ...inTransit];
    const qrVerifiedActive = activeQueue.filter(o => Boolean(o.dispatchVerifiedAt)).length;
    const readyAtGateCount = pending.filter(o => o.status === 'Ready').length;

    const cancelledOrFailed = orders.filter(
      o => o.status === 'Cancelled' || o.status === 'Failed'
    ).length;

    return {
      pendingOrders: pending,
      inTransitOrders: inTransit,
      deliveredOrders: delivered,
      cancelledOrFailedCount: cancelledOrFailed,
      summaryMetrics: {
        pendingUnits,
        pendingValue: pending.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
        inTransitUnits,
        inTransitValue: inTransit.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
        deliveredUnits,
        deliveredValue: delivered.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
        qrVerifiedActive,
        activeTotal: activeQueue.length,
        readyAtGateCount,
      },
    };
  }, [orders, searchQuery, fulfillmentFilter, qrFilter, sortBy]);

  const handleStageTransition = async (order: Order, targetStatus: OrderStatus, note?: string) => {
    setUpdatingOrderId(order.id);
    try {
      await updateOrderStatus(
        order.id,
        targetStatus,
        note || `Updated to ${targetStatus} from Dispatch Logistics Board`
      );
      showToast(
        'Dispatch Updated',
        `Order #${order.id} moved to ${targetStatus}.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to transition order status on board:', err);
      showToast('Update Failed', `Could not move order #${order.id} to ${targetStatus}.`, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const renderOrderCard = (order: Order, columnKey: ColumnKey) => {
    const units = getOrderUnitsCount(order);
    const stageMeta = getSemanticStageText(order.status);
    const nextConfig = getNextStageConfig(order);
    const isBusy = updatingOrderId === order.id;
    const isSelfPickup = order.deliveryType === 'self_pickup';
    const createdDateStr = new Date(order.createdAt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsPreview = (order.items || [])
      .slice(0, 2)
      .map(it => `${it.quantity} × ${it.product?.name || 'Bottle'}`)
      .join(' · ');
    const extraItemsCount = Math.max(0, (order.items || []).length - 2);

    return (
      <article
        key={order.id}
        id={`dispatch-board-card-${order.id}`}
        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 space-y-3 transition-colors"
      >
        {/* Card Header: Order ID + Current Stage Label + Tabular Total */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="font-mono tabular-nums font-bold text-slate-900">
                #{order.id}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className={`font-semibold ${stageMeta.colorClass}`}>
                {stageMeta.label}
              </span>
              {order.isCustomOrder && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-medium text-slate-700">Custom Label</span>
                </>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate">
              {order.customer?.name || 'Customer'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 block">
              ₹{(Number(order.totalAmount) || 0).toLocaleString('en-IN')}
            </span>
            <span className="font-mono tabular-nums text-[11px] text-slate-500 block">
              {units} {units === 1 ? 'unit' : 'units'}
            </span>
          </div>
        </div>

        {/* Unboxed Logistics & Destination Metadata */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <a
              href={`tel:${order.customer?.phone || ''}`}
              className="font-mono tabular-nums text-slate-800 hover:text-cyan-700 hover:underline"
            >
              {order.customer?.phone || 'N/A'}
            </a>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-mono tabular-nums text-slate-500">{createdDateStr}</span>
          </div>

          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-700 leading-snug">
              {isSelfPickup ? (
                <>
                  Factory Counter Pickup
                  {order.pickupSlot ? ` · ${order.pickupSlot}` : ''}
                </>
              ) : (
                <>
                  {[order.customer?.address, order.customer?.city, order.customer?.pincode]
                    .filter(Boolean)
                    .join(', ') || 'Doorstep Delivery'}
                  {order.deliveryDistanceKm !== undefined && order.deliveryDistanceKm > 0
                    ? ` · ~${order.deliveryDistanceKm} km`
                    : ''}
                </>
              )}
            </span>
          </div>

          <div className="flex items-start gap-1.5">
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-600 leading-snug">
              {itemsPreview || 'Packaged Water Order'}
              {extraItemsCount > 0 ? ` +${extraItemsCount} more` : ''}
            </span>
          </div>

          {/* QR Counter Verification & Payment Status Line */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {order.dispatchVerifiedAt ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>QR Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <QrCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>QR Unverified</span>
              </span>
            )}
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-600">
              {order.paymentStatus === 'Paid' ? 'Paid' : order.paymentMethod}
            </span>
          </div>
        </div>

        {/* 1-Click Progression & Quick Modal Links */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {nextConfig && (
            <button
              type="button"
              id={`btn-board-advance-${order.id}`}
              disabled={isBusy}
              onClick={() => handleStageTransition(order, nextConfig.targetStatus)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap shrink-0 ${nextConfig.toneClass}`}
            >
              {isBusy ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>{isBusy ? 'Updating...' : nextConfig.label}</span>
            </button>
          )}

          {/* Allow direct Ready -> Out for Delivery step-back for Admin if truck load changes */}
          {columnKey === 'in-transit' && !isFactoryStaffMode && (
            <button
              type="button"
              id={`btn-board-return-ready-${order.id}`}
              disabled={isBusy}
              onClick={() =>
                handleStageTransition(
                  order,
                  'Ready',
                  'Returned to Pending Ready lane from Dispatch Board'
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              title="Move back to Pending (Ready)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hold</span>
            </button>
          )}

          <button
            type="button"
            id={`btn-board-challan-${order.id}`}
            onClick={() => onOpenDeliveryChallan(order)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Open Delivery Challan Slip"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-700" />
            <span>Challan</span>
          </button>

          <button
            type="button"
            id={`btn-board-qr-${order.id}`}
            onClick={() => onOpenOrderQrModal(order)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Open Order Dispatch QR Pass"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>QR</span>
          </button>

          {!isSelfPickup && columnKey !== 'delivered' && (
            <button
              type="button"
              id={`btn-board-route-${order.id}`}
              onClick={() => onOpenDriverNav(order)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Open Driver Navigation & Delivery Coordinates"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-700" />
              <span>Route</span>
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderColumn = (
    key: ColumnKey,
    title: string,
    subtitle: string,
    columnOrders: Order[],
    unitsTotal: number,
    Icon: React.ComponentType<{ className?: string }>,
    headerAccentClass: string,
    emptyHint: string
  ) => {
    const isHiddenOnMobile = mobileLane !== key;

    return (
      <section
        id={`dispatch-column-${key}`}
        aria-label={`${title} dispatch column`}
        className={`${
          isHiddenOnMobile ? 'hidden lg:flex' : 'flex'
        } flex-col bg-slate-100/90 border border-slate-200 rounded-2xl overflow-hidden lg:h-[760px]`}
      >
        {/* Column Header */}
        <header className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-4 h-4 shrink-0 ${headerAccentClass}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-heading text-sm font-bold text-slate-900 truncate">
                  {title}
                </h3>
                <span className="font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 shrink-0">
                  {columnOrders.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {unitsTotal.toLocaleString('en-IN')} units · {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            id={`btn-board-print-batch-${key}`}
            onClick={() => handlePrintBatch(key, title, columnOrders)}
            disabled={columnOrders.length === 0 || printingLane === key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            title={
              columnOrders.length === 0
                ? `No orders in ${title} to print`
                : `Download consolidated Factory-Floor PDF for all ${columnOrders.length} ${title} order(s)`
            }
          >
            {printingLane === key ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <Printer className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Print Batch</span>
          </button>
        </header>

        {/* Scrollable Card Stack */}
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
          {columnOrders.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">
                No orders in {title}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {hasActiveFilters
                  ? 'No matching orders fit your active search or filters.'
                  : emptyHint}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          ) : (
            columnOrders.map(ord => renderOrderCard(ord, key))
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header & Quick Mode Switch */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Dispatch Logistics Board
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Categorized fulfillment tracking across Pending, In-Transit, and Delivered lanes with 1-click counter handoffs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cancelledOrFailedCount > 0 && (
            <span className="text-xs text-slate-500 font-mono tabular-nums mr-1">
              {cancelledOrFailedCount} cancelled/failed hidden
            </span>
          )}
          <button
            type="button"
            id="btn-board-open-orders-list"
            onClick={onOpenOrdersList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LayoutList className="w-3.5 h-3.5 text-cyan-300" />
            <span>Orders List View</span>
          </button>
        </div>
      </div>

      {/* 4-Column Operational KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-700">
            <span>Pending Queue</span>
            <Clock className="w-4 h-4 shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {pendingOrders.length}
          </p>
          <p className="font-mono tabular-nums text-[11px] text-slate-500 mt-0.5">
            {summaryMetrics.pendingUnits.toLocaleString('en-IN')} units · {summaryMetrics.readyAtGateCount} staged ready
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-sky-700">
            <span>In-Transit</span>
            <Truck className="w-4 h-4 shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {inTransitOrders.length}
          </p>
          <p className="font-mono tabular-nums text-[11px] text-slate-500 mt-0.5">
            {summaryMetrics.inTransitUnits.toLocaleString('en-IN')} units · ₹{summaryMetrics.inTransitValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald-700">
            <span>Delivered</span>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {deliveredOrders.length}
          </p>
          <p className="font-mono tabular-nums text-[11px] text-slate-500 mt-0.5">
            {summaryMetrics.deliveredUnits.toLocaleString('en-IN')} units · ₹{summaryMetrics.deliveredValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>QR Verified Active</span>
            <QrCode className="w-4 h-4 shrink-0 text-slate-600" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {summaryMetrics.qrVerifiedActive} / {summaryMetrics.activeTotal}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pending & In-Transit passes scanned
          </p>
        </div>
      </div>

      {/* Search & Segmented Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-dispatch-board-search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, customer, phone, or QR..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 text-xs text-black focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Fulfillment Mode Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'doorstep', label: 'Doorstep' },
                { id: 'self_pickup', label: 'Self Pickup' },
                { id: 'custom', label: 'Custom Labels' },
              ] as { id: FulfillmentFilter; label: string }[]
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFulfillmentFilter(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  fulfillmentFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* QR Verification Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'all', label: 'All QR' },
                { id: 'verified', label: 'QR Verified' },
                { id: 'needs_qr', label: 'Needs QR' },
              ] as { id: QrFilter; label: string }[]
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQrFilter(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  qrFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort Order Select */}
          <select
            aria-label="Sort orders on dispatch board"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_value">Highest Value</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Lane Switcher */}
      <div className="lg:hidden grid grid-cols-3 gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
        {(
          [
            { key: 'pending', label: `Pending (${pendingOrders.length})` },
            { key: 'in-transit', label: `In-Transit (${inTransitOrders.length})` },
            { key: 'delivered', label: `Delivered (${deliveredOrders.length})` },
          ] as { key: ColumnKey; label: string }[]
        ).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMobileLane(tab.key)}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap truncate ${
              mobileLane === tab.key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3-Column Visual Dispatch Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {renderColumn(
          'pending',
          'Pending',
          'New · Confirmed · Bottling · Ready',
          pendingOrders,
          summaryMetrics.pendingUnits,
          Clock,
          'text-amber-600',
          'New customer orders and bottling tasks will appear here.'
        )}

        {renderColumn(
          'in-transit',
          'In-Transit',
          'Out for Delivery with Drivers',
          inTransitOrders,
          summaryMetrics.inTransitUnits,
          Truck,
          'text-sky-600',
          'Dispatch a Ready order from Pending to move it into transit.'
        )}

        {renderColumn(
          'delivered',
          'Delivered',
          'Completed Doorstep & Pickup Handoffs',
          deliveredOrders,
          summaryMetrics.deliveredUnits,
          CheckCircle2,
          'text-emerald-600',
          'Completed deliveries and counter pickups will be logged here.'
        )}
      </div>
    </div>
  );
};
