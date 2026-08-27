import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Send,
  Building,
  CheckCircle2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';

export const ContactSection: React.FC = () => {
  const { adminSettings, showToast } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Bulk Order (100+ Bottles)');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast('Missing Details', 'Please fill in your name and phone number.', 'warning');
      return;
    }

    setSubmitted(true);
    showToast(
      'Inquiry Sent',
      `Thank you ${name}! Our bottling team will contact you shortly on ${phone}.`,
      'success'
    );

    // Optional direct WhatsApp hook for instant inquiries
    const waText = encodeURIComponent(
      `Hello HH MINERAL WATER! My name is ${name}. I am inquiring about "${inquiryType}". Note: ${message}`
    );
    window.open(`https://wa.me/91${OWNER_WHATSAPP_NUMBER}?text=${waText}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
          Get in Touch
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900">
          Connect with <span className="text-cyan-600">HH MINERAL WATER</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Whether you need daily household deliveries, corporate office water dispensers, or 5,000 custom-branded wedding bottles, we are here for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Contact Info Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-slate-900 to-cyan-950 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
            <h3 className="font-heading text-lg font-bold text-cyan-300">
              Direct Contact & Bottling Plant
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Helpline & Orders</span>
                  <a href={`tel:${adminSettings.helplinePhone}`} className="text-sm font-bold text-white hover:text-cyan-300">
                    +91 {OWNER_WHATSAPP_NUMBER}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Owner WhatsApp</span>
                  <a
                    href={getCustomerSupportWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-emerald-400 hover:underline"
                  >
                    +91 {OWNER_WHATSAPP_NUMBER} (Instant Response)
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Email</span>
                  <span className="text-sm font-semibold text-slate-200">{adminSettings.contactEmail}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Plant Location</span>
                  <span className="text-xs text-slate-300 leading-relaxed block">
                    {adminSettings.address}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-black border border-slate-700 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Operating Hours</span>
                  <span className="text-xs text-slate-300 block">Monday – Sunday: 7:00 AM – 9:00 PM</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={getCustomerSupportWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat with Owner on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Corporate & Bulk Enquiry Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Bulk Order & Event Inquiry Form
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Need custom bottled water for a wedding banquet, corporate conference, or restaurant chain? Send us your requirement below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aniket Banerjee"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9830123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inquiry Category
              </label>
              <select
                value={inquiryType}
                onChange={e => setInquiryType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
              >
                <option value="Wedding Custom Design Bottles">Wedding Custom Design Bottles (250ml / 500ml)</option>
                <option value="Corporate Event / Conference Branding">Corporate Event / Conference Branding</option>
                <option value="Hotel / Restaurant Table Water Supply">Hotel / Restaurant Table Water Supply</option>
                <option value="Bulk Household Regular Subscription">Bulk Household Regular Subscription (1L / 2L)</option>
                <option value="Dealership & Distribution">Dealership & Distribution Opportunity</option>
                <option value="Other Query">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Message / Estimated Bottle Quantity / Event Date
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Need 500 custom-designed 250ml bottles for wedding reception on March 15th with gold foil logo."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 px-6 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-cyan-400" />
              <span>Send Inquiry to HH Team</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
