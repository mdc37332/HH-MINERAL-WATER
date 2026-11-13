import React, { useState, useMemo, useEffect } from 'react';
import { CustomerInfo, Product, OrderStatus, Invoice } from '../../types';
import { useStore } from '../../context/StoreContext';
import { numberToIndianRupees } from '../../lib/numberToWords';
import {
  Receipt,
  User,
  Phone,
  MapPin,
  Building2,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  ShoppingBag,
  Percent,
  FileText,
  AlertCircle,
  Truck,
  ArrowRight
} from 'lucide-react';

const PIECES_PER_QUANTITY = 12;

interface OfflineInvoiceItemInput {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
}

export interface ExistingCustomerOption {
  name: string;
  phone: string;
  totalSpent?: number;
  totalProductRevenue?: number;
  orderCount?: number;
  address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  stateCode?: string;
  gstin?: string;
  email?: string;
  landmark?: string;
}

interface OfflineInvoiceModalProps {
  isOpen?: boolean;
  onClose: () => void;
  prefilledCustomer?: CustomerInfo | null;
  initialCustomer?: CustomerInfo | null;
  existingCustomers?: ExistingCustomerOption[];
  onSuccess?: (invoice: Invoice | any) => void;
}

export const OfflineInvoiceModal: React.FC<OfflineInvoiceModalProps> = ({
  isOpen = true,
  onClose,
  prefilledCustomer,
  initialCustomer,
  existingCustomers = [],
  onSuccess
}) => {
  const { products, adminSettings, createOfflineOrderWithInvoice, showToast } = useStore();

  const activeCustomer = initialCustomer || prefilledCustomer;

  // Customer Form State
  const [isExistingSelected, setIsExistingSelected] = useState(false);
  const [name, setName] = useState(activeCustomer?.name || '');
  const [phone, setPhone] = useState(activeCustomer?.phone || '');
  const [email, setEmail] = useState(activeCustomer?.email || '');
  const [address, setAddress] = useState(activeCustomer?.address || '');
  const [landmark, setLandmark] = useState(activeCustomer?.landmark || '');
  const [city, setCity] = useState(activeCustomer?.city || 'Kolkata');
  const [pincode, setPincode] = useState(activeCustomer?.pincode || '700091');
  const [state, setState] = useState(activeCustomer?.state || adminSettings.state || 'West Bengal');
  const [stateCode, setStateCode] = useState(activeCustomer?.stateCode || adminSettings.stateCode || '19');
  const [gstin, setGstin] = useState(activeCustomer?.gstin || '');

  // Synchronize customer if prop updates
  useEffect(() => {
    if (activeCustomer) {
      setName(activeCustomer.name || '');
      setPhone(activeCustomer.phone || '');
      setEmail(activeCustomer.email || '');
      setAddress(activeCustomer.address || '');
      setLandmark(activeCustomer.landmark || '');
      setCity(activeCustomer.city || 'Kolkata');
      setPincode(activeCustomer.pincode || '700091');
      setState(activeCustomer.state || adminSettings.state || 'West Bengal');
      setStateCode(activeCustomer.stateCode || adminSettings.stateCode || '19');
      setGstin(activeCustomer.gstin || '');
    }
  }, [activeCustomer, adminSettings.state, adminSettings.stateCode]);

  // Invoice & Payment Details
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI / QR Code' | 'Bank Transfer / NEFT' | 'Credit / Due'>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Cash Due on Delivery'>('Paid');
  const [deliveryType, setDeliveryType] = useState<'self_pickup' | 'doorstep'>('self_pickup');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('Delivered');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Label & Branding Billing Options
  const [isCustomLabelBilling, setIsCustomLabelBilling] = useState<boolean>(false);
  const [customBrandName, setCustomBrandName] = useState<string>('');
  const [customEventType, setCustomEventType] = useState<string>('Corporate Event');
  const [customFinishType, setCustomFinishType] = useState<string>('Matte Luxury Waterproof');
  const [customCapColor, setCustomCapColor] = useState<string>('Royal Gold');
  const [plateSetupCharge, setPlateSetupCharge] = useState<number>(0);
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Line items
  const defaultProduct = products[0] || {
    id: 'prod-500ml',
    name: 'HH 500ml Packaged Drinking Water',
    size: '500ml',
    price: 10,
    mrp: 20
  };

  const [items, setItems] = useState<OfflineInvoiceItemInput[]>([
    {
      id: `item-${Date.now()}`,
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      size: defaultProduct.size,
      quantity: 1,
      unitPrice: defaultProduct.price,
      mrp: defaultProduct.mrp || defaultProduct.price
    }
  ]);

  // Handle selecting an existing customer from the dropdown
  const handleSelectExistingCustomer = (phoneNum: string) => {
    if (!phoneNum) {
      setIsExistingSelected(false);
      return;
    }
    const found = existingCustomers.find(c => c.phone === phoneNum);
    if (found) {
      setName(found.name);
      setPhone(found.phone);
      if (found.email) setEmail(found.email);
      if (found.address) setAddress(found.address);
      if (found.city) setCity(found.city);
      if (found.pincode) setPincode(found.pincode);
      if (found.landmark) setLandmark(found.landmark);
      if (found.state) setState(found.state);
      if (found.stateCode) setStateCode(found.stateCode);
      if (found.gstin) setGstin(found.gstin);
      setIsExistingSelected(true);
      if (!customBrandName.trim()) {
        setCustomBrandName(found.name);
      }
    }
  };

  // Add line item
  const handleAddItem = () => {
    const nextProd = products[items.length % products.length] || defaultProduct;
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: nextProd.id,
        productName: nextProd.name,
        size: nextProd.size,
        quantity: 1,
        unitPrice: nextProd.price,
        mrp: nextProd.mrp || nextProd.price
      }
    ]);
  };

  // Update line item
  const handleUpdateItem = (id: string, updates: Partial<OfflineInvoiceItemInput>) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        // If product changed, update name, size, unitPrice & mrp
        if (updates.productId && updates.productId !== it.productId) {
          const selectedProd = products.find(p => p.id === updates.productId);
          if (selectedProd) {
            return {
              ...it,
              ...updates,
              productName: selectedProd.name,
              size: selectedProd.size,
              unitPrice: selectedProd.price,
              mrp: selectedProd.mrp || selectedProd.price
            };
          }
        }
        return { ...it, ...updates };
      })
    );
  };

  // Remove line item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('Minimum Item Required', 'An invoice must have at least one product item.', 'warning');
      return;
    }
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Calculations: 1 quantity = 12 pieces (bottles)
  const effectivePlateFee = isCustomLabelBilling ? Math.max(0, Number(plateSetupCharge) || 0) : 0;
  const subtotal = useMemo(() => {
    const itemsSum = items.reduce((sum, it) => {
      const qtyPacks = Number(it.quantity) || 0;
      const totalPcs = qtyPacks * PIECES_PER_QUANTITY;
      const ratePerPiece = Number(it.unitPrice) || 0;
      return sum + (totalPcs * ratePerPiece);
    }, 0);
    return itemsSum + effectivePlateFee;
  }, [items, effectivePlateFee]);

  const effectiveDelivery = deliveryType === 'self_pickup' ? 0 : Math.max(0, Number(deliveryCharge) || 0);
  const effectiveDiscount = Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal + effectiveDelivery - effectiveDiscount);

  // Excludes delivery fee as pass-through shipping reimbursement
  const productRevenueCredited = Math.max(0, grandTotal - effectiveDelivery);

  // 18% GST Breakdown (HSN 2201 - inclusive pricing)
  const isIntraState = stateCode === (adminSettings.stateCode || '19');
  const taxableValue = Math.round((productRevenueCredited / 1.18) * 100) / 100;
  const totalGstAmount = Math.round((productRevenueCredited - taxableValue) * 100) / 100;
  const cgstAmount = isIntraState ? Math.round((totalGstAmount / 2) * 100) / 100 : 0;
  const sgstAmount = isIntraState ? Math.round((totalGstAmount - cgstAmount) * 100) / 100 : 0;
  const igstAmount = !isIntraState ? totalGstAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Customer Name Required', 'Please enter customer or company name.', 'warning');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showToast('Invalid Phone', 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    if (items.length === 0 || subtotal <= 0) {
      showToast('Items Required', 'Please add at least one product with valid quantity.', 'warning');
      return;
    }

    if (gstin && gstin.trim().length > 0 && gstin.trim().length !== 15) {
      showToast('Invalid GSTIN', 'GSTIN must be exactly 15 alphanumeric characters (e.g. 19AAAAA0000A1Z5).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const customer: CustomerInfo = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        address: address.trim() || 'Factory Counter / Walk-in Customer',
        landmark: landmark.trim() || undefined,
        city: city.trim() || 'Kolkata',
        pincode: pincode.trim() || '700091',
        state: state.trim() || 'West Bengal',
        stateCode: stateCode.trim() || '19',
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        isOfflineCustomer: true
      };

      const effectiveBrandName = customBrandName.trim() || name.trim();
      const invoiceItems: any[] = items.map(it => {
        const qtyPacks = Math.max(1, Number(it.quantity) || 1);
        const totalPcs = qtyPacks * PIECES_PER_QUANTITY;
        const ratePerPiece = Math.max(0, Number(it.unitPrice) || 0);
        const customSuffix = isCustomLabelBilling && effectiveBrandName
          ? ` [Custom Branded: "${effectiveBrandName}"]`
          : '';
        return {
          productId: it.productId,
          productName: `${it.productName}${customSuffix} (${qtyPacks} ${qtyPacks === 1 ? 'Pack' : 'Packs'} × ${PIECES_PER_QUANTITY} Pcs)`,
          size: it.size,
          quantity: totalPcs,
          unitPrice: ratePerPiece,
          isCustomDesign: isCustomLabelBilling
        };
      });

      // If Custom Label Plate / Graphic Proofing charge is set, add as a line item (SAC 9989)
      if (isCustomLabelBilling && effectivePlateFee > 0) {
        invoiceItems.push({
          productId: 'custom-label-setup-fee',
          productName: `Custom Label Plate & Graphic Setup Fee ("${effectiveBrandName}")`,
          size: 'SAC 9989',
          quantity: 1,
          unitPrice: effectivePlateFee,
          isCustomDesign: true
        });
      }

      const res = await createOfflineOrderWithInvoice({
        customer,
        items: invoiceItems,
        paymentMethod,
        paymentStatus,
        deliveryType,
        deliveryCharge: effectiveDelivery,
        discount: effectiveDiscount,
        invoiceDate,
        notes: notes.trim() || undefined,
        orderStatus,
        isCustomOrder: isCustomLabelBilling,
        customLabelDetails: isCustomLabelBilling ? {
          brandName: effectiveBrandName,
          eventType: customEventType,
          finishType: customFinishType,
          bottleCapColor: customCapColor,
          plateCharge: effectivePlateFee,
          specialInstructions: customInstructions.trim() || undefined
        } : undefined
      });

      if (onSuccess && res) {
        onSuccess(res.invoice || res.order || res);
      }

      onClose();
    } catch (err: any) {
      console.error('Error generating offline GST invoice:', err);
      showToast('Invoice Error', err?.message || 'Failed to generate offline GST invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="offline-invoice-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        id="offline-invoice-modal-container"
        className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]"
      >
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white">
                  Generate GST Invoice (Offline Customer)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  18% GST (HSN 2201)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Issue official tax invoices for walk-ins, direct counter pickups, and B2B clients. Instantly updates app revenue, accounts, and customer directory.
              </p>
            </div>
          </div>
          <button
            id="close-offline-invoice-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* SECTION 1: CUSTOMER SELECTION & DETAILS */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Customer & Billing Details
                </h4>
              </div>

              {existingCustomers.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Or quick-fill existing:</span>
                  <select
                    id="select-existing-customer-dropdown"
                    onChange={e => handleSelectExistingCustomer(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 font-medium outline-none focus:border-cyan-600"
                    defaultValue=""
                  >
                    <option value="">Select Existing Account...</option>
                    {existingCustomers.map(c => (
                      <option key={c.phone} value={c.phone}>
                        {c.name} ({c.phone}) - {c.orderCount} ord
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Customer / Organization Name *</label>
                <input
                  id="offline-customer-name-input"
                  type="text"
                  required
                  placeholder="e.g. Hotel Park Street / Rajesh Roy"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-cyan-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone (10 digits) *</label>
                <input
                  id="offline-customer-phone-input"
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9830123456"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-cyan-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer GSTIN (For B2B Tax Credit)</label>
                <input
                  id="offline-customer-gstin-input"
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 19AAAAA0000A1Z5 (Optional)"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-cyan-600 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  id="offline-customer-email-input"
                  type="email"
                  placeholder="e.g. accounts@hotelpark.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State / Province</label>
                <input
                  id="offline-customer-state-input"
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  {deliveryType === 'doorstep' ? 'Billing & Delivery Address *' : 'Billing Address (Optional for counter pickup)'}
                </label>
                <input
                  id="offline-customer-address-input"
                  type="text"
                  required={deliveryType === 'doorstep'}
                  placeholder={deliveryType === 'doorstep' ? "e.g. 12/A Salt Lake Sector 1, Near Karunamoyee" : "e.g. Walk-in Counter / Salt Lake (Optional)"}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    id="offline-customer-city-input"
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    id="offline-customer-pincode-input"
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOM LABEL BILLING OPTION (Admin Only) */}
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
            isCustomLabelBilling
              ? 'bg-gradient-to-br from-amber-50/90 via-white to-purple-50/40 border-amber-300 ring-2 ring-amber-400/20 shadow-md'
              : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  isCustomLabelBilling
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
                    : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}>
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Custom Label & Personalized Branding Billing Option</span>
                    </h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isCustomLabelBilling
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {isCustomLabelBilling ? 'CUSTOM BILLING ON' : 'STANDARD MRP BILLING'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enable to generate an official GST Tax Invoice for customized event, wedding, corporate, or hotel labeled water bottles.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                id="toggle-custom-label-billing-btn"
                onClick={() => {
                  const next = !isCustomLabelBilling;
                  setIsCustomLabelBilling(next);
                  if (next && !customBrandName.trim() && name.trim()) {
                    setCustomBrandName(name.trim());
                  }
                }}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                  isCustomLabelBilling ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                aria-label="Toggle Custom Label Billing"
                title="Toggle Custom Label Billing Option"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isCustomLabelBilling ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Custom Label Form Specifications (Expanded when ON) */}
            {isCustomLabelBilling && (
              <div className="mt-4 pt-4 border-t border-amber-200/70 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Brand / Client Name */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Client / Brand Name to Print *</span>
                      <span className="text-[10px] text-amber-700 font-semibold">Printed on label & invoice</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Heritage Weddings / Taj Bengal"
                      value={customBrandName}
                      onChange={e => setCustomBrandName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-xs outline-none"
                    />
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Event / Client Type</label>
                    <select
                      value={customEventType}
                      onChange={e => setCustomEventType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-600 outline-none cursor-pointer shadow-xs"
                    >
                      <option value="Corporate Event">Corporate / Tech Summit</option>
                      <option value="Wedding">Wedding & Engagement</option>
                      <option value="Hotel & Restaurant">Hotel / Fine Dining</option>
                      <option value="Birthday & Party">Birthday & Private Party</option>
                      <option value="Hospitality / Resort">Hospitality / Resort</option>
                      <option value="Institutional">Institutional / Club</option>
                    </select>
                  </div>

                  {/* Label Finish */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Label Finish</label>
                    <select
                      value={customFinishType}
                      onChange={e => setCustomFinishType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-600 outline-none cursor-pointer shadow-xs"
                    >
                      <option value="Matte Luxury Waterproof">Matte Luxury Waterproof</option>
                      <option value="Glossy Crystal Finish">Glossy Crystal Finish</option>
                      <option value="Gold Foil Metallic Accent">Gold Foil Metallic Accent</option>
                      <option value="Silver Chrome Metallic">Silver Chrome Metallic</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Bottle Cap Color */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bottle Cap Color</label>
                    <select
                      value={customCapColor}
                      onChange={e => setCustomCapColor(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-600 outline-none cursor-pointer shadow-xs"
                    >
                      <option value="Royal Gold">Royal Gold</option>
                      <option value="Deep Black">Deep Black</option>
                      <option value="Crystal Clear">Crystal Clear</option>
                      <option value="Classic Blue">Classic Blue</option>
                      <option value="Emerald Green">Emerald Green</option>
                      <option value="Ruby Red">Ruby Red</option>
                    </select>
                  </div>

                  {/* Cylinder / Plate Fee */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Cylinder / Plate Setup Fee (₹)</span>
                      <span className="text-[10px] text-slate-400 font-mono">SAC 9989</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={plateSetupCharge}
                        onChange={e => setPlateSetupCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full pl-6 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-600 outline-none font-mono shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Special Labeling Instructions */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Print / Label Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Front/back high-res waterproof monogram"
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:border-amber-600 outline-none shadow-xs"
                    />
                  </div>
                </div>

                <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-2.5 text-[11px] text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    <span>
                      Branded as: <strong>&quot;{customBrandName || name || 'Client Brand'}&quot;</strong> • {customFinishType} • {customCapColor} Cap
                    </span>
                  </div>
                  {plateSetupCharge > 0 && (
                    <span className="font-bold text-amber-900 bg-white/70 px-2 py-0.5 rounded border border-amber-300 text-[10px]">
                      + ₹{plateSetupCharge} Setup Fee Included
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PRODUCT LINE ITEMS */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-cyan-700" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Packaged Drinking Water Line Items ({items.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Standard Wholesale Unit: <strong className="text-cyan-800">1 Quantity = 12 Pieces (Bottles)</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-900 px-2.5 py-1 rounded-lg border border-cyan-300">
                  Total: {items.reduce((s, it) => s + (Number(it.quantity) || 0) * PIECES_PER_QUANTITY, 0)} Pieces ({items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} Packs)
                </span>
                <button
                  id="add-offline-item-btn"
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const qtyPacks = Number(item.quantity) || 0;
                const totalPieces = qtyPacks * PIECES_PER_QUANTITY;
                const ratePerPiece = Number(item.unitPrice) || 0;
                const lineTotal = totalPieces * ratePerPiece;
                const packRate = ratePerPiece * PIECES_PER_QUANTITY;

                return (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs hover:border-cyan-200 transition-colors"
                  >
                    {/* Product Select */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Item #{index + 1}: Select Size / Product</span>
                        <span className="text-cyan-700 font-bold text-[10px]">1 Qty = 12 Pcs</span>
                      </label>
                      <select
                        id={`offline-item-product-${index}`}
                        value={item.productId}
                        onChange={e => handleUpdateItem(item.id, { productId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white hover:border-cyan-600 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 shadow-xs outline-none transition-all cursor-pointer"
                      >
                        {products.map(p => {
                          const pPackPrice = (p.price || 0) * PIECES_PER_QUANTITY;
                          const pPackMrp = (p.mrp || p.price || 0) * PIECES_PER_QUANTITY;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.size}) — ₹{p.price}/pc • ₹{pPackPrice} / 12-Pc Pack (MRP ₹{pPackMrp})
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1 text-cyan-900 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md font-bold">
                          1 Qty = 12 Pcs Pack
                        </span>
                        <span className="font-semibold text-slate-600">
                          ₹{ratePerPiece.toFixed(2)}/pc • ₹{packRate.toFixed(2)} / 12-pc pack
                        </span>
                        {isCustomLabelBilling && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Custom: &quot;{customBrandName || name || 'Client Brand'}&quot;</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Qty (Packs)</span>
                        <span className="text-cyan-700 font-bold font-mono text-[9px]">1=12pcs</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`offline-item-qty-${index}`}
                          type="number"
                          min={1}
                          step={1}
                          value={item.quantity}
                          onChange={e => handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 text-center bg-slate-50 hover:bg-white focus:bg-white hover:border-cyan-600 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 shadow-xs outline-none font-mono transition-all"
                        />
                      </div>
                      <div className="mt-1.5 text-center">
                        <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs font-mono">
                          = {totalPieces} Pcs
                        </span>
                      </div>
                    </div>

                    {/* Unit Rate (Rate per Piece) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Rate ₹ / Pc</span>
                        <span className="text-slate-400 font-mono text-[9px]">(incl. GST)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                        <input
                          id={`offline-item-rate-${index}`}
                          type="number"
                          min={0}
                          step="0.25"
                          value={item.unitPrice}
                          onChange={e => handleUpdateItem(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-full pl-6 pr-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 text-right bg-white hover:border-cyan-600 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 shadow-xs outline-none font-mono transition-all"
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="text-slate-400 font-medium">Pack of 12:</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-cyan-800 font-bold">₹</span>
                          <input
                            id={`offline-item-packrate-${index}`}
                            type="number"
                            min={0}
                            step="1"
                            value={Math.round(packRate * 100) / 100}
                            onChange={e => {
                              const newPackRate = Math.max(0, parseFloat(e.target.value) || 0);
                              handleUpdateItem(item.id, { unitPrice: Math.round((newPackRate / PIECES_PER_QUANTITY) * 100) / 100 });
                            }}
                            className="w-16 px-1.5 py-0.5 text-right font-bold text-cyan-900 bg-cyan-50/80 hover:bg-white border border-cyan-200 rounded text-[10px] focus:outline-cyan-600 focus:bg-white transition-colors"
                            title="Edit pack rate to auto-calculate rate per piece"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-2 text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Line Total
                      </span>
                      <span className="font-heading text-sm font-black text-slate-900 block">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-1 font-mono">
                        {totalPieces} pcs × ₹{ratePerPiece.toFixed(2)}
                      </span>
                    </div>

                    {/* Remove Action */}
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        id={`remove-offline-item-${index}`}
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: FULFILLMENT, PAYMENT & ACCOUNTING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fulfillment & Date */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 font-bold text-slate-900">
                <Truck className="w-4 h-4 text-cyan-700" />
                <span>Delivery & Fulfillment Settings</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fulfillment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('self_pickup');
                      setDeliveryCharge(0);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      deliveryType === 'self_pickup'
                        ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Factory Pickup (₹0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('doorstep')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      deliveryType === 'doorstep'
                        ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Direct Dispatch / Doorstep
                  </button>
                </div>
              </div>

              {deliveryType === 'doorstep' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pass-Through Delivery Fee (₹)
                  </label>
                  <input
                    id="offline-delivery-charge-input"
                    type="number"
                    min={0}
                    value={deliveryCharge}
                    onChange={e => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-cyan-600 outline-none"
                    placeholder="e.g. 50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pass-through logistics cost reimbursed to driver, excluded from product revenue.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    id="offline-invoice-date-input"
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:border-cyan-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Order Status</label>
                  <select
                    id="offline-order-status-select"
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-cyan-600 outline-none"
                  >
                    <option value="Delivered">Delivered (Handed Over)</option>
                    <option value="Ready">Ready for Pickup</option>
                    <option value="Processing">Processing / Bottling</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Special Notes / PO Reference</label>
                <input
                  id="offline-order-notes-input"
                  type="text"
                  placeholder="e.g. Counter Bill #84 / Corporate Monthly Supply"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-600 outline-none"
                />
              </div>
            </div>

            {/* Payment Mode & Accounting */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 font-bold text-slate-900">
                <CreditCard className="w-4 h-4 text-cyan-700" />
                <span>Payment Mode & Accounts Ledger</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Cash', 'UPI / QR Code', 'Bank Transfer / NEFT', 'Credit / Due'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMethod(mode)}
                      className={`p-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        paymentMethod === mode
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    id="offline-payment-status-select"
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-cyan-600 outline-none"
                  >
                    <option value="Paid">Paid (Payment Received)</option>
                    <option value="Cash Due on Delivery">Pending / Due on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trade Discount (₹)</label>
                  <input
                    id="offline-discount-input"
                    type="number"
                    min={0}
                    value={discount}
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-cyan-600 outline-none"
                    placeholder="e.g. 0"
                  />
                </div>
              </div>

              {/* LIVE FINANCIAL BREAKDOWN SUMMARY */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Total Wholesale Volume:</span>
                  <span className="font-mono font-bold text-cyan-800">
                    {items.reduce((s, it) => s + (Number(it.quantity) || 0) * PIECES_PER_QUANTITY, 0)} Bottles ({items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} Packs)
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Items Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                </div>
                {effectivePlateFee > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium text-[11px]">
                    <span>Custom Label Setup / Plate Fee:</span>
                    <span className="font-mono font-bold">+₹{effectivePlateFee.toFixed(2)}</span>
                  </div>
                )}
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">-₹{effectiveDiscount.toFixed(2)}</span>
                  </div>
                )}
                {effectiveDelivery > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Fee (Logistics):</span>
                    <span className="font-mono font-bold text-slate-700">+₹{effectiveDelivery.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-600 text-[11px]">
                  <span>Taxable Value (Net HSN 2201):</span>
                  <span className="font-mono">₹{taxableValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>GST 18% ({isIntraState ? 'CGST 9% + SGST 9%' : 'IGST 18%'}):</span>
                  <span className="font-mono">₹{totalGstAmount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-heading font-black text-slate-900 text-sm">
                  <span>Grand Total (Payable):</span>
                  <span className="text-base text-cyan-800 font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200/80 flex items-center justify-between text-[11px] font-bold text-emerald-800">
                  <span>Revenue Credited to App:</span>
                  <span className="font-mono text-emerald-900">₹{productRevenueCredited.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-slate-400 italic pt-0.5">
                  Amount in words: {numberToIndianRupees(grandTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* BOTTOM NOTICE & ACTIONS */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Sequential GST invoice will be generated and opened immediately for printing/PDF.
              </span>
            </div>

            <div className="flex items-center gap-2.5 self-end">
              <button
                id="cancel-offline-invoice-btn"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="submit-offline-invoice-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating GST Tax Invoice...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 text-cyan-400" />
                    <span>Generate GST Tax Invoice (₹{grandTotal.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
