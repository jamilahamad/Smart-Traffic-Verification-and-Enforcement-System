import { TrendingUp } from 'lucide-react';

import { cn } from '../utils/cn';

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  gray: 'bg-gray-50 text-gray-600',
};

export default function StatsCard({
  label,
  value,
  note,
  icon: Icon = TrendingUp,
  color = 'blue',
  trend,
  onClick,
  className = '',
}) {
  const Component = onClick ? 'button' : 'article';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'stves-stats-card w-full rounded-2xl border border-gray-100 bg-white p-4 text-left transition-all',
        'hover:border-blue-100 hover:shadow-md',
        onClick && 'active:scale-[0.98]',
        className
      )}
    >
      <div
        className={cn(
          'stves-stats-icon mb-3 flex h-10 w-10 items-center justify-center rounded-xl',
          colorMap[color] || colorMap.blue
        )}
      >
        <Icon size={20} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="stves-stats-value text-2xl font-bold text-gray-800">
            {value ?? 0}
          </p>

          <p className="stves-stats-label mt-1 text-xs text-gray-500">
            {label}
          </p>

          {note && (
            <p className="stves-stats-note mt-1 text-[10px] text-gray-400">
              {note}
            </p>
          )}
        </div>

        {trend && (
          <span
            className={cn(
              'stves-stats-trend rounded-full px-2 py-1 text-[10px] font-semibold',
              trend.startsWith('-')
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-600'
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </Component>
  );
}