import { cn } from '../../utils/cn';

const badgeVariants = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  primary: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  dark: 'bg-gray-800 text-white border-gray-800',
};

const statusMap = {
  active: 'success',
  valid: 'success',
  approved: 'success',
  paid: 'primary',

  pending: 'warning',
  warning: 'warning',

  suspended: 'danger',
  blacklisted: 'danger',
  expired: 'danger',
  dismissed: 'danger',
  inactive: 'danger',
  invalid: 'danger',

  unpaid: 'danger',
  waived: 'purple',
};

const badgeSizes = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  status,
  size = 'sm',
  rounded = 'full',
  dot = false,
  className = '',
}) {
  const finalVariant = status ? statusMap[String(status).toLowerCase()] || variant : variant;
  const roundedClass = rounded === 'md' ? 'rounded-md' : 'rounded-full';

  return (
    <span
      className={cn(
        'stves-badge inline-flex items-center gap-1.5 border font-semibold whitespace-nowrap',
        roundedClass,
        badgeSizes[size] || badgeSizes.sm,
        badgeVariants[finalVariant] || badgeVariants.default,
        className
      )}
    >
      {dot && (
        <span className="stves-badge-dot h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}

      {children || status || 'Badge'}
    </span>
  );
}