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
  HelpCircle,
  Map
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';
import { FactoryGoogleMap } from './FactoryGoogleMap';

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
    try {
      window.open(`https://wa.me/91${OWNER_WHATSAPP_NUMBER}?text=${waText}`, '_blank');
    } catch (e) {
      console.warn('Could not open WhatsApp tab automatically:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-extrabold uppercase tracking-widest text-[#DFC283] bg-[#1a1710] px-3 py-1 rounded-full border border-[#C5A059]/40">
          Get in Touch
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
          Connect with <span className="gold-gradient-text">HH MINERAL WATER</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400">
          Whether you need daily household deliveries, corporate office water dispensers, or 5,000 custom-branded wedding bottles, we are here for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Contact Info Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121212] text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border border-[#262626]">
            <h3 className="font-heading text-lg font-bold gold-gradient-text">
              Direct Contact & Bottling Plant
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1c1913] text-[#C5A059] border border-[#C5A059]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Helpline & Orders</span>
                  <a href={`tel:${adminSettings?.helplinePhone || OWNER_WHATSAPP_NUMBER}`} className="text-sm font-bold text-white hover:text-[#DFC283]">
                    +91 {adminSettings?.helplinePhone || OWNER_WHATSAPP_NUMBER}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Owner WhatsApp</span>
                  <a
                    href={getCustomerSupportWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-emerald-400 hover:underline"
                  >
                    +91 {adminSettings?.ownerWhatsApp || OWNER_WHATSAPP_NUMBER} (Instant Response)
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1c1913] text-[#DFC283] border border-[#C5A059]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Official Email</span>
                  <span className="text-sm font-semibold text-neutral-200">{adminSettings?.contactEmail || 'orders@hhmineralwater.com'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1c1913] text-[#C5A059] border border-[#C5A059]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Plant Location</span>
                  <span className="text-xs text-neutral-300 leading-relaxed block">
                    {adminSettings?.businessAddress || adminSettings?.address || 'Plot No. 42, Water Treatment Plant & Bottling Unit, Industrial Estate'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-black border border-[#2e2e2e] text-[#C5A059] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Operating Hours</span>
                  <span className="text-xs text-neutral-300 block">Monday – Sunday: 7:00 AM – 9:00 PM</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={getCustomerSupportWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat with Owner on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Corporate & Bulk Enquiry Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#121212] rounded-3xl border border-[#262626] p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-white">
              Bulk Order & Event Inquiry Form
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Need custom bottled water for a wedding banquet, corporate conference, or restaurant chain? Send us your requirement below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aniket Banerjee"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#181818] text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Contact Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9830123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#181818] text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                Inquiry Category
              </label>
              <select
                value={inquiryType}
                onChange={e => setInquiryType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#181818] text-white text-xs font-semibold focus:outline-none focus:border-[#C5A059]"
              >
                <option value="Wedding Custom Design Bottles" className="bg-[#181818] text-white">Wedding Custom Design Bottles (250ml / 500ml)</option>
                <option value="Corporate Event / Conference Branding" className="bg-[#181818] text-white">Corporate Event / Conference Branding</option>
                <option value="Hotel / Restaurant Table Water Supply" className="bg-[#181818] text-white">Hotel / Restaurant Table Water Supply</option>
                <option value="Bulk Household Regular Subscription" className="bg-[#181818] text-white">Bulk Household Regular Subscription (1L / 2L)</option>
                <option value="Dealership & Distribution" className="bg-[#181818] text-white">Dealership & Distribution Opportunity</option>
                <option value="Other Query" className="bg-[#181818] text-white">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                Message / Estimated Bottle Quantity / Event Date
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Need 500 custom-designed 250ml bottles for wedding reception on March 15th with gold foil logo."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#181818] text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs py-3.5 px-6 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-black" />
              <span>Send Inquiry to HH Team</span>
            </button>
          </form>
        </div>
      </div>

      {/* Interactive Google Maps Platform Bottling Plant & Delivery Radius View */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#DFC283] flex items-center gap-1.5">
                <Map className="w-3.5 h-3.5 text-[#C5A059]" />
                Google Maps Platform
              </span>
              <span className="bg-[#1f1d16] text-[#DFC283] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#C5A059]/30">
                Live Interactive Map
              </span>
            </div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-white mt-1">
              Visit HH Bottling Plant & Check Your Delivery Zone
            </h3>
          </div>
          <p className="text-xs text-neutral-400 sm:text-right max-w-sm">
            Free counter pickup at our factory dispatch counter. Instant doorstep hydration delivered strictly within our {adminSettings?.maxDeliveryRadiusKm || 7} Km golden delivery radius.
          </p>
        </div>

        <FactoryGoogleMap height="460px" />
      </div>
    </div>
  );
};
