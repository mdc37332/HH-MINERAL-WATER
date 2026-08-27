import React, { useState } from 'react';
import { CustomerInfo } from '../../types';
import { User, Phone, MapPin, Building2, Plus, Mail } from 'lucide-react';

interface AddCustomerModalProps {
  onAddCustomer: (customer: CustomerInfo) => void;
  onClose: () => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ onAddCustomer, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Kolkata');
  const [pincode, setPincode] = useState('700001');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      return;
    }

    const newCust: CustomerInfo = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      pincode: pincode.trim()
    };

    onAddCustomer(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Register Direct / Walk-In Customer
            </h3>
            <p className="text-xs text-slate-500">Add corporate account, hotel manager, or retail buyer to directory.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Organization Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hotel Park Street / Rajesh Roy"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (10 digits) *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9830123456"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="e.g. contact@hotelpark.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Delivery / Billing Address *</label>
              <input
                type="text"
                required
                placeholder="e.g. 17/A Park Street, Ground Floor"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Landmark (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Near Metro Station"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Save Customer Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
