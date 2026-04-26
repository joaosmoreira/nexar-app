import { X } from 'lucide-react';

export function Modal({ isOpen, title, onClose, children }: { isOpen: boolean, title: string, onClose: () => void, children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
      >
        <button 
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-100 mb-6">{title}</h2>
        {children}
      </div>
    </div>
  );
}
