import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  ShieldCheck,
  Sparkles,
  Loader2,
  Droplets,
  Lock,
} from 'lucide-react';
import { sendCustomerSupportAiQueryApi } from '../lib/aiApi';
import { useStore } from '../context/StoreContext';

interface SupportMessage {
  id: string;
  sender: 'customer' | 'agent';
  text: string;
  timestamp: string;
}

export const CustomerSupportAiModal: React.FC = () => {
  const { currentUser, currentSection } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am the HH Mineral Water Customer Support Specialist (SUP-03). Ask me about bottle sizes (250ml, 500ml, 1L, 2L), custom wedding/corporate labeling (minimum 600 pieces), or check your own verified order status.',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Keep floating button clear on Owner Admin panel view
  if (currentSection === 'admin') {
    return null;
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = input.trim();
    if (!q || isSending) return;

    const userMsg: SupportMessage = {
      id: `u-${Date.now()}`,
      sender: 'customer',
      text: q,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await sendCustomerSupportAiQueryApi({
        message: q,
        orderId: orderIdInput.trim() || undefined,
        phone: phoneInput.trim() || undefined,
      });
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: err?.message || 'Unable to reach support right now. Please try again in a moment.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-customer-support-ai"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#121212] hover:bg-[#1a1a1a] text-[#DFC283] border border-[#C5A059]/50 shadow-2xl transition-all cursor-pointer group"
        title="HH Mineral Water Customer Support"
      >
        <MessageSquare className="w-4 h-4 text-[#C5A059]" />
        <span className="text-xs font-bold tracking-tight">Concierge Support</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 bg-black/70 backdrop-blur-xs">
          <div className="w-full sm:w-[420px] max-h-[85vh] bg-[#0e0e0e] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
            {/* Header */}
            <div className="px-5 py-4 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-[#DFC283]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight">HH Customer Support</h3>
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Customer-Isolated Verification (SUP-03)</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] text-neutral-400 hover:text-white cursor-pointer"
                aria-label="Close Support"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Private Order Lookup Verification Fields */}
            {!currentUser && (
              <div className="px-4 py-3 bg-[#121212] border-b border-[#222222] space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <Lock className="w-3 h-3 text-[#C5A059]" />
                  <span>Optional: Verify Your Order Privately</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={orderIdInput}
                    onChange={e => setOrderIdInput(e.target.value)}
                    placeholder="Order ID (e.g. ORD-...)"
                    className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2f2f2f] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
                  />
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="Registered Phone"
                    className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2f2f2f] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>
            )}

            {/* Quick Prompts */}
            <div className="px-4 py-2 bg-[#101010] border-b border-[#1f1f1f] flex flex-wrap gap-1.5">
              {[
                'Available bottle sizes & prices?',
                'Custom design minimum quantity?',
                'Check my order status',
              ].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setInput(q)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222222] text-neutral-300 border border-[#2c2c2c] cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px]">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'customer' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.sender === 'customer'
                        ? 'bg-[#C5A059] text-black font-semibold'
                        : 'bg-[#181818] text-neutral-200 border border-[#2a2a2a]'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1 px-1 tabular-nums">{m.timestamp}</span>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                  <span>Checking verified HH catalog & order status...</span>
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-3 bg-[#141414] border-t border-[#262626] flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about bottles, 600+ custom orders, or your order..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0c0c0c] border border-[#2e2e2e] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="p-2.5 rounded-xl bg-[#C5A059] hover:brightness-110 disabled:opacity-40 text-black font-bold cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
