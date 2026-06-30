import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

import { cn } from '../../utils/cn';

const inputSizes = {
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-4 py-3 text-sm rounded-xl',
  lg: 'px-4 py-3.5 text-base rounded-xl',
};

const iconInputSizes = {
  sm: 'pl-9',
  md: 'pl-10',
  lg: 'pl-11',
};

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    size = 'md',
    fullWidth = true,
    required = false,
    wrapperClassName = '',
    labelClassName = '',
    inputClassName = '',
    className = '',
    disabled = false,
    ...props
  },
  ref
) {
  const hasError = Boolean(error);

  return (
    <div
      className={cn(
        'stves-input-group',
        fullWidth && 'w-full',
        wrapperClassName
      )}
    >
      {label && (
        <label
          className={cn(
            'stves-input-label mb-1.5 block text-sm font-medium text-gray-700',
            labelClassName
          )}
        >
          {label}

          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <div className="stves-input-wrap relative">
        {LeftIcon && (
          <LeftIcon
            size={18}
            className="stves-input-left-icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}

        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'stves-input w-full border bg-white text-gray-800 transition-all duration-150',
            'placeholder:text-gray-400 focus:outline-none focus:ring-4',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
            inputSizes[size] || inputSizes.md,
            LeftIcon && iconInputSizes[size],
            RightIcon && 'pr-10',
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-gray-200 focus:border-[#0f4c81] focus:ring-[#0f4c81]/15',
            inputClassName,
            className
          )}
          {...props}
        />

        {RightIcon && !hasError && (
          <RightIcon
            size={18}
            className="stves-input-right-icon pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}

        {hasError && (
          <AlertCircle
            size={18}
            className="stves-input-error-icon pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-red-500"
          />
        )}
      </div>

      {(error || helperText) && (
        <p
          className={cn(
            'stves-input-message mt-1.5 text-xs',
            hasError ? 'text-red-600' : 'text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

export default Input;