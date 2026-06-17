import { useToastStore } from '@/store/toast';
import type { ToastType } from '@/store/toast';

const typeConfig: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✓', text: 'text-emerald-700' },
  error: { bg: 'bg-red-50', border: 'border-red-200', icon: '✕', text: 'text-red-700' },
  info: { bg: 'bg-navy-50', border: 'border-navy-200', icon: 'ℹ', text: 'text-navy-700' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠', text: 'text-amber-700' },
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-card animate-slideIn ${config.bg} ${config.border}`}
          >
            <span className={`text-sm font-bold ${config.text}`}>{config.icon}</span>
            <p className={`text-sm flex-1 ${config.text}`}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className={`text-sm opacity-60 hover:opacity-100 ${config.text}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
