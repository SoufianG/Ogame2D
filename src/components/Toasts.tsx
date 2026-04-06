import { useToastStore, type ToastType } from '../store/toastStore';

const TOAST_ICONS: Record<ToastType, string> = {
  building: '\u{1F3D7}',   // crane
  research: '\u{1F52C}',   // microscope
  shipyard: '\u{1F680}',   // rocket
  fleet: '\u{1F6F8}',      // flying saucer
  achievement: '\u{1F3C6}', // trophy
  combat: '\u{2694}',       // swords
  info: '\u{2139}',         // info
};

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            {toast.body && <div className="toast-body">{toast.body}</div>}
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>x</button>
        </div>
      ))}
    </div>
  );
}
