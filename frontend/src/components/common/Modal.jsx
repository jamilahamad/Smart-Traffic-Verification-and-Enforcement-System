import { X } from 'lucide-react';

import Button from './Button';
import { cn } from '../../utils/cn';

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
  bodyClassName = '',
}) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    if (closeOnBackdrop && typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="stves-modal-root fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="stves-modal-backdrop absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      <section
        role="dialog"
        aria-modal="true"
        className={cn(
          'stves-modal-panel relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-2xl',
          'animate-fade-in border border-gray-100',
          modalSizes[size] || modalSizes.md,
          className
        )}
      >
        {(title || description || showCloseButton) && (
          <header className="stves-modal-header flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="stves-modal-title text-base font-bold text-gray-800">
                  {title}
                </h2>
              )}

              {description && (
                <p className="stves-modal-description mt-1 text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="stves-modal-close-button shrink-0"
              >
                <X size={18} />
              </Button>
            )}
          </header>
        )}

        <div
          className={cn(
            'stves-modal-body max-h-[70vh] overflow-y-auto p-5',
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <footer className="stves-modal-footer border-t border-gray-100 bg-gray-50 px-5 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}