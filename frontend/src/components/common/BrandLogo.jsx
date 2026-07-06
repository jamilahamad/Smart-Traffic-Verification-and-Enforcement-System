import { Shield, ShieldCheck } from 'lucide-react';

const variantConfig = {
  landing: {
    icon: Shield,
    wrapperClass: 'landing-brand-block flex items-center gap-3 text-left',
    iconClass:
      'landing-brand-icon flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] shadow-lg shadow-blue-200',
    iconSize: 22,
    iconColorClass: 'text-white',
    textWrapperClass: '',
    titleClass: 'landing-brand-name block text-xl font-black leading-tight text-gray-900',
    subtitleClass: 'landing-brand-subtitle hidden text-[11px] font-medium text-gray-400 sm:block',
    subtitle: 'Smart Traffic Verification',
  },

  login: {
    icon: Shield,
    wrapperClass: 'login-brand-left',
    iconClass: 'login-brand-icon',
    iconSize: 24,
    iconColorClass: 'text-white',
    textWrapperClass: 'login-brand-text text-left',
    titleClass: 'text-2xl font-black text-white tracking-tight',
    subtitleClass: 'text-xs font-medium text-blue-100',
    subtitle: 'Smart Traffic Verification & Enforcement System',
  },

  navbar: {
    icon: Shield,
    wrapperClass: 'stves-navbar-brand flex items-center gap-2',
    iconClass:
      'stves-navbar-logo w-9 h-9 bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] rounded-lg flex items-center justify-center',
    iconSize: 20,
    iconColorClass: 'text-white',
    textWrapperClass: 'hidden sm:block text-left',
    titleClass: 'text-lg font-bold text-gray-800 leading-tight',
    subtitleClass: 'text-[10px] text-gray-400 leading-tight -mt-0.5',
    subtitle: 'Smart Traffic Verification',
  },

  public: {
    icon: ShieldCheck,
    wrapperClass: 'public-verify-brand',
    iconClass: 'public-verify-brand-icon',
    iconSize: 22,
    iconColorClass: '',
    textWrapperClass: 'text-left',
    titleClass: 'public-verify-brand-name',
    subtitleClass: 'public-verify-brand-subtitle',
    subtitle: 'Smart Traffic Verification',
  },

  footer: {
    icon: Shield,
    wrapperClass: 'flex items-center justify-center gap-2',
    iconClass: '',
    iconSize: 22,
    iconColorClass: 'text-blue-400',
    textWrapperClass: '',
    titleClass: 'text-2xl font-black tracking-tight',
    subtitleClass: '',
    subtitle: '',
  },
};

const joinClassNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export default function BrandLogo({
  variant = 'navbar',
  title = 'STVES',
  subtitle,
  onClick,
  ariaLabel = 'STVES',
  className = '',
}) {
  const config = variantConfig[variant] || variantConfig.navbar;
  const Icon = config.icon || Shield;
  const finalSubtitle = subtitle ?? config.subtitle;
  const Wrapper = onClick ? 'button' : 'div';

  const wrapperProps = {
    className: joinClassNames(config.wrapperClass, className),
  };

  if (onClick) {
    wrapperProps.type = 'button';
    wrapperProps.onClick = onClick;
    wrapperProps['aria-label'] = ariaLabel;
  }

  return (
    <Wrapper {...wrapperProps}>
      <div className={config.iconClass}>
        <Icon
          size={config.iconSize}
          className={config.iconColorClass}
        />
      </div>

      <div className={config.textWrapperClass}>
        {variant === 'login' ? (
          <h1 className={config.titleClass}>{title}</h1>
        ) : (
          <span className={config.titleClass}>{title}</span>
        )}

        {finalSubtitle ? (
          <span className={config.subtitleClass}>{finalSubtitle}</span>
        ) : null}
      </div>
    </Wrapper>
  );
}