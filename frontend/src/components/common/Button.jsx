import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '../../utils/cn';

const buttonVariants = {
  primary:
    'bg-[#0f4c81] text-white hover:bg-[#0d426f] focus:ring-[#0f4c81]/25',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
  outline:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
  success:
    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300',
  warning:
    'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-300',
  gradient:
    'bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white hover:shadow-lg focus:ring-blue-300',
};

const buttonSizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg',
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

const Button = forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = '',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'stves-button inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150',
        'focus:outline-none focus:ring-4 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        buttonVariants[variant] || buttonVariants.primary,
        buttonSizes[size] || buttonSizes.md,
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="stves-button-spinner animate-spin" />
      ) : (
        LeftIcon && <LeftIcon size={16} className="stves-button-left-icon" />
      )}

      {children}

      {!loading && RightIcon && (
        <RightIcon size={16} className="stves-button-right-icon" />
      )}
    </button>
  );
});

export default Button;