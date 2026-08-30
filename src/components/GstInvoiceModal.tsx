import React, { useState } from 'react';
import { Invoice, Order } from '../types';
import { useStore } from '../context/StoreContext';
import {
  Printer,
  FileDown,
  Share2,
  X,
  Copy,
  Check,
  Building,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Receipt,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { getInvoiceShareWhatsAppUrl } from '../lib/whatsapp';

interface GstInvoiceModalProps {
  invoice: Invoice;
  order?: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const GstInvoiceModal: React.FC<GstInvoiceModalProps> = ({
  invoice,
  order,
  isOpen,
  onClose
}) => {
  const { deleteInvoice } = useStore();
  const [copyType, setCopyType] = useState<'Original for Recipient' | 'Duplicate for Transporter' | 'Triplicate for Supplier'>('Original for Recipient');
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete GST Tax Invoice #${invoice.invoiceNumber} for Order ${invoice.orderId}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyDetails = () => {
    const text = `HH MINERAL WATER - TAX INVOICE
Invoice No: ${invoice.invoiceNumber}
Order ID: ${invoice.orderId}
Customer: ${invoice.customerDetails.name} (${invoice.customerDetails.phone})
Total Amount: ₹${invoice.grandTotal} (${invoice.grandTotalInWords})
Payment: ${invoice.paymentMethod} (${invoice.paymentStatus})
Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = new Date(invoice.invoiceDate).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const shareWhatsAppUrl = order 
    ? getInvoiceShareWhatsAppUrl(order, invoice.invoiceNumber, invoice.grandTotal, invoice.customerDetails.phone)
    : `https://wa.me/?text=${encodeURIComponent(`HH Mineral Water Tax Invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal}`)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Action Header - Hidden during print */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">GST Tax Invoice</span>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/50 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Order ID: {invoice.orderId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <a
              href={shareWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <button
              onClick={handleCopyDetails}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Copy details"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="Delete this GST Tax Invoice"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close invoice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Copy Selector Bar - Hidden during print */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs print:hidden shrink-0">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>Invoice Copy:</span>
            <div className="inline-flex rounded-lg bg-white p-0.5 border border-slate-300">
              {(['Original for Recipient', 'Duplicate for Transporter', 'Triplicate for Supplier'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCopyType(type)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    copyType === type
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Digitally Verified Indian GST Tax Invoice</span>
          </div>
        </div>

        {/* --- INVOICE PRINTABLE DOCUMENT CONTAINER --- */}
        <div className="overflow-y-auto p-4 sm:p-8 space-y-6 text-slate-900 font-sans text-xs bg-white print:p-0 print:overflow-visible" id="printable-gst-invoice">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-black text-xl font-heading shadow-md">
                  HH
                </div>
                <div>
                  <h1 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {invoice.companyDetails.tradeName || 'HH MINERAL WATER'}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-semibold tracking-wide uppercase">
                    {invoice.companyDetails.legalBusinessName || 'HH MINERAL WATER BOTTLING & PACKAGING'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Premium Packaged Drinking & Mineral Water Bottling Plant
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                <span className="inline-block bg-slate-900 text-white font-black text-sm uppercase px-3.5 py-1 rounded tracking-wider">
                  TAX INVOICE
                </span>
                <p className="text-[10px] font-bold text-cyan-800 mt-1 uppercase tracking-wider">
                  ({copyType})
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Supply Date: {formattedDate}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier & Invoice Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-300 rounded-xl overflow-hidden text-xs">
            {/* Supplier / Seller Info */}
            <div className="p-3.5 bg-slate-50/70 border-b md:border-b-0 md:border-r border-slate-300 space-y-1.5">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-700" />
                <span>Supplier / Seller Details</span>
              </div>
              <p className="font-bold text-slate-900">{invoice.companyDetails.legalBusinessName}</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {invoice.companyDetails.businessAddress}, {invoice.companyDetails.city} - {invoice.companyDetails.pincode}
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500 font-medium">State: </span>
                  <span className="font-bold text-slate-800">{invoice.companyDetails.state}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">State Code: </span>
                  <span className="font-bold text-slate-800">{invoice.companyDetails.stateCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">GSTIN: </span>
                  <span className="font-mono font-bold text-cyan-900">{invoice.companyDetails.gstin || '19AAACH1234F1Z8'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">PAN: </span>
                  <span className="font-mono font-semibold text-slate-800">{invoice.companyDetails.pan || 'AAACH1234F'}</span>
                </div>
                {invoice.companyDetails.fssaiNumber && (
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium">FSSAI Lic. No: </span>
                    <span className="font-mono font-semibold text-slate-800">{invoice.companyDetails.fssaiNumber}</span>
                  </div>
                )}
                <div className="col-span-2 pt-0.5 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>Tel: {invoice.companyDetails.phone}</span>
                  <span>Email: {invoice.companyDetails.email}</span>
                </div>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="p-3.5 space-y-1.5">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-cyan-700" />
                <span>Invoice & Supply Reference</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Number</span>
                  <span className="font-mono font-bold text-cyan-900 text-xs">{invoice.invoiceNumber}</span>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Date</span>
                  <span className="font-bold text-slate-800 text-xs">{formattedDate}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Order ID: </span>
                  <span className="font-mono font-bold text-slate-800">{invoice.orderId}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Order Time: </span>
                  <span className="font-medium text-slate-800">{formattedTime}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Place of Supply: </span>
                  <span className="font-bold text-slate-800">{invoice.placeOfSupply}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Reverse Charge: </span>
                  <span className="font-bold text-slate-800">{invoice.reverseCharge || 'No'}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Payment Mode: </span>
                  <span className="font-bold text-slate-800">{invoice.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Payment Status: </span>
                  <span className={`font-bold ${invoice.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {invoice.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer / Billed To & Shipped To */}
          <div className="border border-slate-300 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 text-xs">
            {/* Bill To */}
            <div className="p-3.5 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-300 space-y-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Billed To (Customer Details)
              </div>
              <p className="font-bold text-slate-900 text-sm">{invoice.customerDetails.name}</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">{invoice.customerDetails.billingAddress}</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500">City / State: </span>
                  <span className="font-medium text-slate-800">{invoice.customerDetails.city}, {invoice.customerDetails.state} ({invoice.customerDetails.stateCode})</span>
                </div>
                <div>
                  <span className="text-slate-500">Pincode: </span>
                  <span className="font-mono font-medium text-slate-800">{invoice.customerDetails.pincode}</span>
                </div>
                <div>
                  <span className="text-slate-500">Mobile: </span>
                  <span className="font-medium text-slate-800">{invoice.customerDetails.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500">GSTIN / UIN: </span>
                  <span className="font-mono font-bold text-slate-800">{invoice.customerDetails.gstin || 'Consumer / Unregistered'}</span>
                </div>
              </div>
            </div>

            {/* Ship To */}
            <div className="p-3.5 space-y-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Shipped To (Delivery Destination)
              </div>
              <p className="font-bold text-slate-900 text-sm">{invoice.customerDetails.name}</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">{invoice.customerDetails.deliveryAddress}</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500">City: </span>
                  <span className="font-medium text-slate-800">{invoice.customerDetails.city}</span>
                </div>
                <div>
                  <span className="text-slate-500">Delivery State: </span>
                  <span className="font-medium text-slate-800">{invoice.customerDetails.state} ({invoice.customerDetails.stateCode})</span>
                </div>
                <div className="col-span-2 text-[10px] text-emerald-700 font-semibold pt-0.5">
                  ✓ Doorstep Hydration Delivery Direct from HH Bottling Plant
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-8">#</th>
                    <th className="py-2.5 px-3">Product & Packaging Description</th>
                    <th className="py-2.5 px-2 text-center">HSN</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 text-center">GST %</th>
                    <th className="py-2.5 px-3 text-right">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">SGST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-cyan-800">Size: {item.size}</span>
                          {item.isCustomDesign && (
                            <span className="bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold text-[9px]">
                              Custom Printed Label
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-600">{item.hsnCode || '2201'}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900">{item.quantity.toLocaleString('en-IN')} pcs</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">₹{item.taxableAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.gstRate}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        <span className="font-medium">₹{item.cgstAmount.toFixed(2)}</span>
                        <span className="block text-[9px] text-slate-400">({item.cgstRate}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        <span className="font-medium">₹{item.sgstAmount.toFixed(2)}</span>
                        <span className="block text-[9px] text-slate-400">({item.sgstRate}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Tax Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: GST Tax Summary & Bank Details */}
            <div className="md:col-span-7 space-y-4">
              
              {/* HSN Tax Summary Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                  GST Tax Analysis Summary (HSN/SAC 2201 - Packaged Drinking Water)
                </div>
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-1.5 px-2.5">HSN/SAC</th>
                      <th className="py-1.5 px-2 text-right">Taxable Val</th>
                      <th className="py-1.5 px-2 text-right">CGST (9%)</th>
                      <th className="py-1.5 px-2 text-right">SGST (9%)</th>
                      <th className="py-1.5 px-2.5 text-right font-bold">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-2.5 font-mono font-medium">2201</td>
                      <td className="py-2 px-2 text-right">₹{invoice.taxableAmount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">₹{invoice.cgstAmount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">₹{invoice.sgstAmount.toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-900">₹{invoice.totalGstAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank & Settlement Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between border-b border-slate-200 pb-1">
                  <span>Bank & UPI Remittance Details</span>
                  <span className="text-[10px] font-normal text-slate-500">For Direct Payments</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-[10px]">
                  <div>
                    <span className="text-slate-500">Account Name: </span>
                    <span className="font-semibold text-slate-800">{invoice.companyDetails.bankDetails?.accountName || invoice.companyDetails.legalBusinessName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank: </span>
                    <span className="font-semibold text-slate-800">{invoice.companyDetails.bankDetails?.bankName || 'State Bank of India'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">A/C Number: </span>
                    <span className="font-mono font-semibold text-slate-800">{invoice.companyDetails.bankDetails?.accountNumber || '389201094821'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">IFSC Code: </span>
                    <span className="font-mono font-semibold text-slate-800">{invoice.companyDetails.bankDetails?.ifsc || 'SBIN0001234'}</span>
                  </div>
                  <div className="col-span-2 pt-0.5">
                    <span className="text-slate-500">UPI VPA: </span>
                    <span className="font-mono font-bold text-cyan-800">{invoice.companyDetails.bankDetails?.upiId || '8017341130@upi'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Calculations & Grand Total */}
            <div className="md:col-span-5 space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Taxable Amount:</span>
                  <span className="font-semibold text-slate-800">₹{invoice.taxableAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Central GST (CGST @ 9%):</span>
                  <span className="font-semibold text-slate-800">+ ₹{invoice.cgstAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>State GST (SGST @ 9%):</span>
                  <span className="font-semibold text-slate-800">+ ₹{invoice.sgstAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Delivery & Handling Charge:</span>
                  <span className="font-semibold text-slate-800">
                    {invoice.deliveryCharge > 0 ? `+ ₹${invoice.deliveryCharge.toFixed(2)}` : 'FREE'}
                  </span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Promotional Discount:</span>
                    <span className="font-semibold">- ₹{invoice.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline">
                  <div>
                    <span className="font-heading text-sm font-black text-slate-900 block">Grand Total</span>
                    <span className="text-[10px] text-slate-500">(Inclusive of all Taxes)</span>
                  </div>
                  <span className="font-heading text-xl font-black text-cyan-800">
                    ₹{invoice.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="p-2.5 bg-cyan-50/70 rounded-xl border border-cyan-200 text-[11px]">
                <span className="text-[10px] font-bold text-cyan-900 uppercase block tracking-wider">Amount Chargeable (in words):</span>
                <p className="font-bold text-slate-900 italic mt-0.5">{invoice.grandTotalInWords}</p>
              </div>
            </div>
          </div>

          {/* Terms & Conditions and Signature Area */}
          <div className="border-t border-slate-300 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px]">
            {/* Terms */}
            <div className="space-y-1">
              <span className="font-bold text-slate-800 uppercase tracking-wider block">Terms & Conditions</span>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                {invoice.companyDetails.invoiceTerms || '1. Goods once sold will not be taken back or exchanged.\n2. Invoices are subject to local jurisdiction.\n3. Storage: Keep in a cool, dry place away from direct sunlight.'}
              </p>
            </div>

            {/* Signature Stamp Box */}
            <div className="border border-slate-300 rounded-xl p-3.5 flex flex-col justify-between text-right bg-slate-50/50 min-h-[100px]">
              <div>
                <span className="font-bold text-slate-900 text-xs">For {invoice.companyDetails.legalBusinessName}</span>
                <p className="text-slate-500 text-[10px]">Authorized Signatory / Bottling Division</p>
              </div>
              <div className="pt-8">
                <span className="inline-block border-t border-slate-400 pt-1 font-bold text-slate-700 px-6">
                  Authorized Signatory
                </span>
                <p className="text-[9px] text-slate-400 mt-0.5">This is a digitally generated Tax Invoice.</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            Thank you for choosing HH MINERAL WATER • Sourced for Purity, Hydrated with Nature's Best Minerals
          </div>
        </div>

        {/* Modal Bottom Toolbar - Hidden during print */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden shrink-0">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            <span>Invoice Number: </span>
            <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
            <span className="mx-2 text-slate-300">•</span>
            <span>Total: </span>
            <span className="font-bold text-cyan-800">₹{invoice.grandTotal}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print Invoice</span>
            </button>

            <a
              href={shareWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </a>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Permanently remove this GST invoice"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
