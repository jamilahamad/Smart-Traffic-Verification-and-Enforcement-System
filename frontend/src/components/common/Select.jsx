import { forwardRef } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

import { cn } from '../../utils/cn';

const selectSizes = {
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-4 py-3 text-sm rounded-xl',
  lg: 'px-4 py-3.5 text-base rounded-xl',
};

const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder = 'Select an option',
    size = 'md',
    fullWidth = true,
    required = false,
    wrapperClassName = '',
    labelClassName = '',
    selectClassName = '',
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
        'stves-select-group',
        fullWidth && 'w-full',
        wrapperClassName
      )}
    >
      {label && (
        <label
          className={cn(
            'stves-select-label mb-1.5 block text-sm font-medium text-gray-700',
            labelClassName
          )}
        >
          {label}

          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <div className="stves-select-wrap relative">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'stves-select w-full appearance-none border bg-white text-gray-800 transition-all duration-150',
            'focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
            'pr-10',
            selectSizes[size] || selectSizes.md,
            hasError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-gray-200 focus:border-[#0f4c81] focus:ring-[#0f4c81]/15',
            selectClassName,
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}

          {options.map((option) => {
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            }

            return (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            );
          })}
        </select>

        {hasError ? (
          <AlertCircle
            size={18}
            className="stves-select-error-icon pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-red-500"
          />
        ) : (
          <ChevronDown
            size={18}
            className="stves-select-chevron pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
      </div>

      {(error || helperText) && (
        <p
          className={cn(
            'stves-select-message mt-1.5 text-xs',
            hasError ? 'text-red-600' : 'text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

export default Select;