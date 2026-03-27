import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type NotificationToastProps = {
  message: string;
  type: 'success' | 'error';
  onClose?: () => void;
};

export function NotificationToast({ message, type, onClose }: NotificationToastProps) {
  return (
    <div className={`notification-toast ${type === 'error' ? 'is-error' : 'is-success'}`} role="status" aria-live="polite">
      {type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      <span>{message}</span>
      {onClose && (
        <button type="button" className="notification-toast-close" onClick={onClose} aria-label="Close notification">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
