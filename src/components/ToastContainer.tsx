import React from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4">
      {toasts.map(toast => {
        let bg = 'bg-[#141414] text-white border-[#2e2e2e] shadow-black/80';
        let icon = <CheckCircle2 className="w-5 h-5 text-[#C5A059] shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-[#121915] text-emerald-100 border-emerald-800/60 shadow-black/80';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-[#1a1212] text-rose-100 border-rose-800/60 shadow-black/80';
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-[#1a1812] text-[#f4e2ba] border-[#C5A059]/40 shadow-black/80';
          icon = <AlertTriangle className="w-5 h-5 text-[#C5A059] shrink-0" />;
        } else if (toast.type === 'info') {
          bg = 'bg-[#141414] text-neutral-100 border-[#C5A059]/40 shadow-black/80';
          icon = <Info className="w-5 h-5 text-[#DFC283] shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bg}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white p-0.5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
