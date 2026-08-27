import React from 'react';
import { Order, AdminSettings } from '../../types';
import { Printer, CheckCircle2, Package, Truck, Phone, MapPin, Building2 } from 'lucide-react';

interface DeliveryChallanModalProps {
  order: Order;
  adminSettings: AdminSettings;
  onClose: () => void;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({ order, adminSettings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const totalBottles = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-900 text-cyan-300 flex items-center justify-center font-black text-sm">
              HH
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-slate-900">
                DELIVERY CHALLAN & DISPATCH PACKING SLIP
              </h3>
              <p className="text-xs text-slate-500">Warehouse Outward Dispatch & Driver Handover Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Challan Body */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs text-slate-800 font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">DISPATCH CHALLAN #</span>
              <strong className="text-sm font-mono text-slate-900">CH-{order.id.replace('HH-ORD-', '')}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">DISPATCH DATE</span>
              <strong className="font-mono">{new Date().toLocaleDateString('en-IN')}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">CONSIGNOR (PLANT)</span>
              <p className="font-bold text-slate-900">{adminSettings.tradeName || 'HH MINERAL WATER'}</p>
              <p className="text-slate-600">{adminSettings.businessAddress}</p>
              <p className="text-slate-600 font-mono">GSTIN: {adminSettings.gstin}</p>
              <p className="text-slate-600 font-mono">Phone: {adminSettings.ownerWhatsApp}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">CONSIGNEE (DELIVER TO)</span>
              <p className="font-bold text-slate-900">{order.customer.name}</p>
              <p className="text-slate-600">{order.customer.address}</p>
              <p className="text-slate-600 font-mono">Pincode: {order.customer.pincode}</p>
              <p className="text-slate-600 font-mono">Phone: {order.customer.phone}</p>
            </div>
          </div>

          {/* Items Outward Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5">Bottle Size</th>
                  <th className="p-2.5 text-center">Packaging / Label</th>
                  <th className="p-2.5 text-right">Dispatched Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-bold text-slate-900">{item.product.name}</td>
                    <td className="p-2.5 font-mono">{item.product.size}</td>
                    <td className="p-2.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {item.isCustomDesign ? 'Custom Gold Foil Label' : 'Standard HH Label'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{item.quantity} Units</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="p-2.5 text-slate-700">Total Outward Bottle Count</td>
                  <td className="p-2.5 text-right font-mono text-cyan-900 font-black text-sm">{totalBottles} Bottles</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 text-[10px] block">PAYMENT MODE & STATUS</span>
              <strong>{order.paymentMethod} • {order.paymentStatus}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">TOTAL ORDER INVOICE AMOUNT</span>
              <strong className="text-cyan-900 text-sm">₹{order.totalAmount}</strong>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-600 border-t border-slate-200">
            <div>
              <div className="h-10 border-b border-slate-400 mb-1"></div>
              <span className="font-bold text-slate-800 block">Warehouse Dispatch Officer</span>
              <span>HH Mineral Water Bottling Unit</span>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mb-1"></div>
              <span className="font-bold text-slate-800 block">Customer / Driver Signature</span>
              <span>Received in Good Seal Condition</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Delivery Challan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
