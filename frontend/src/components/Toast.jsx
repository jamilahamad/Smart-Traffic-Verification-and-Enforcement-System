import { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

import Button from './common/Button';
import { cn } from '../utils/cn';

const toastConfig = {
  success: {
    icon: CheckCircle,
    box: 'border-green-200 bg-green-50 text-green-700',
    iconColor: 'text-green-600',
  },
  error: {
    icon: XCircle,
    box: 'border-red-200 bg-red-50 text-red-700',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    box: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    iconColor: 'text-yellow-600',
  },
  info: {
    icon: Info,
    box: 'border-blue-200 bg-blue-50 text-blue-700',
    iconColor: 'text-blue-600',
  },
};

export default function Toast({
  open = true,
  type = 'info',
  title,
  message,
  duration = 4000,
  onClose,
  action,
  className = '',
}) {
  const config = toastConfig[type] || toastConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    if (!open || !duration || typeof onClose !== 'function') {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        'stves-toast flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 shadow-lg',
        config.box,
        className
      )}
    >
      <Icon size={22} className={cn('stves-toast-icon mt-0.5 shrink-0', config.iconColor)} />

      <div className="stves-toast-content min-w-0 flex-1">
        {title && <p className="stves-toast-title text-sm font-bold">{title}</p>}

        {message && (
          <p className={cn('stves-toast-message text-sm leading-relaxed', title && 'mt-1')}>
            {message}
          </p>
        )}

        {action && <div className="stves-toast-action mt-3">{action}</div>}
      </div>

      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="stves-toast-close h-8 w-8 shrink-0"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  );
}