const getInitials = (name = '') => {
  const parts = String(name || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const sizeClasses = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
};

const radiusClasses = {
  circle: 'rounded-full',
  square: 'rounded-2xl',
};

export default function UserAvatar({
  user,
  size = 'sm',
  radius = 'circle',
  className = '',
}) {
  const avatarUrl = user?.avatarUrl || user?.photoUrl || '';
  const name = user?.name || user?.holderName || user?.ownerName || 'User';

  const baseClass = [
    'user-avatar overflow-hidden bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] flex items-center justify-center shrink-0 text-white font-bold',
    sizeClasses[size] || sizeClasses.sm,
    radiusClasses[radius] || radiusClasses.circle,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (avatarUrl) {
    return (
      <div className={baseClass}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            event.currentTarget.parentElement?.classList.add('user-avatar-fallback-active');
          }}
        />

        <span className="user-avatar-fallback hidden">
          {getInitials(name)}
        </span>
      </div>
    );
  }

  return (
    <div className={baseClass}>
      <span>{getInitials(name)}</span>
    </div>
  );
}