import { Loader2 } from 'lucide-react';

import { cn } from '../../utils/cn';

const spinnerSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
  xl: 'text-base',
};

export default function LoadingSpinner({
  size = 'md',
  text = '',
  fullPage = false,
  className = '',
  iconClassName = '',
  textClassName = '',
}) {
  const content = (
    <div
      className={cn(
        'stves-loading-spinner flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <Loader2
        className={cn(
          'stves-loading-spinner-icon animate-spin text-[#0f4c81]',
          spinnerSizes[size] || spinnerSizes.md,
          iconClassName
        )}
      />

      {text && (
        <p
          className={cn(
            'stves-loading-spinner-text mt-3 text-gray-500',
            textSizes[size] || textSizes.md,
            textClassName
          )}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="stves-loading-spinner-page min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}