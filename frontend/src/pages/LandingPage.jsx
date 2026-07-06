import { useState } from 'react';
import {
  QrCode,
  Search,
  FileWarning,
  Car,
  Lock,
  Zap,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import '../styles/LandingPage.css';

const platformFeatures = [
  {
    icon: <Search size={24} />,
    title: 'Instant Verification',
    desc: 'Verify vehicles and drivers in seconds using license plate numbers or digital IDs.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: <QrCode size={24} />,
    title: 'QR Code Scanning',
    desc: 'Scan vehicle QR codes for immediate roadside compliance checks.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: <FileWarning size={24} />,
    title: 'E-Challan System',
    desc: 'Issue digital violation cases instantly with automated fine calculation.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: <Car size={24} />,
    title: 'Vehicle Management',
    desc: 'Complete vehicle registration, fitness tracking, and document management.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: <Lock size={24} />,
    title: 'Role-Based Access',
    desc: 'Secure multi-level access for police, admins, drivers, and vehicle owners.',
    color: 'from-red-500 to-red-600',
  },
  {
    icon: <Zap size={24} />,
    title: 'Real-time Analytics',
    desc: 'Dashboard with live stats, violation trends, and enforcement insights.',
    color: 'from-yellow-500 to-yellow-600',
  },
];

const workingSteps = [
  {
    step: '01',
    title: 'Scan or Search',
    desc: 'Officer scans QR code or enters license plate number',
  },
  {
    step: '02',
    title: 'Instant Verification',
    desc: 'System validates all documents against BRTA database',
  },
  {
    step: '03',
    title: 'Detect Violations',
    desc: 'Automated detection of expired or invalid documents',
  },
  {
    step: '04',
    title: 'Issue E-Challan',
    desc: 'Digital case created with unique ID and fine calculation',
  },
];

const quickStats = [
  {
    value: '< 2s',
    label: 'Verification Time',
  },
  {
    value: '4',
    label: 'User Roles',
  },
  {
    value: '16+',
    label: 'Violation Types',
  },
  {
    value: '100%',
    label: 'Digital Process',
  },
];

const userRoles = [
  {
    emoji: '👮',
    role: 'Traffic Police',
    desc: 'Verify vehicles, scan QR codes, issue E-Challans on the spot',
    color: 'border-blue-400/30',
  },
  {
    emoji: '🛡️',
    role: 'System Admin',
    desc: 'Monitor all activity, manage users, approve cases, control blacklists',
    color: 'border-red-400/30',
  },
  {
    emoji: '🚗',
    role: 'Driver',
    desc: 'View license status, check violation history, manage profile',
    color: 'border-green-400/30',
  },
  {
    emoji: '🔑',
    role: 'Vehicle Owner',
    desc: 'Register vehicles, assign drivers, track compliance',
    color: 'border-purple-400/30',
  },
];

const landingNavLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Process', href: '#process' },
  { label: 'Roles', href: '#roles' },
];

const processSteps = [
  {
    title: 'Scan or Search',
    description: 'Officer scans QR code or enters vehicle registration / license number.',
  },
  {
    title: 'Instant Verification',
    description: 'System validates vehicle documents, owner data, and license status against BRTA records.',
  },
  {
    title: 'Detect Violations',
    description: 'Expired documents, invalid licenses, or compliance issues are detected automatically.',
  },
  {
    title: 'Issue E-Challan',
    description: 'Digital e-challan is created with unique case ID, fine amount, and audit trail.',
  },
];

export default function LandingPage({ onLogin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleAuthOpen = () => {
    if (typeof onLogin === 'function') {
      onLogin();
    }
  };

  const handleMobileNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-page-wrapper min-h-screen bg-white">
      <nav className="landing-navbar fixed top-0 left-0 right-0 z-50">
        <div className="landing-nav-shell mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="landing-nav-content flex h-16 items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
            <BrandLogo
              variant="landing"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              ariaLabel="Go to landing page"
            />

            <div className="landing-nav-links hidden items-center gap-1 lg:flex">
              {landingNavLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="landing-nav-link rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-blue-50 hover:text-[#0f4c81]"
                >
                  {item.label}
                </a>
              ))}

            </div>

            <div className="landing-nav-actions hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={handleAuthOpen}
                className="landing-login-button flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-5 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98]"
              >
                Login / Register
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="landing-mobile-menu-button flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-700 md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="landing-mobile-panel mt-2 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl md:hidden">
              {landingNavLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={handleMobileNavClick}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-[#0f4c81]"
                >
                  {item.label}
                </a>
              ))}

              <button
                type="button"
                onClick={handleAuthOpen}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-5 py-3 text-sm font-bold text-white"
              >
                Login / Register
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </nav>

      <section className="landing-hero-section relative pt-32 pb-20 overflow-hidden">
        <div className="landing-hero-bg absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f4c81]" />

        <div className="landing-hero-glow absolute inset-0 opacity-10">
          <div className="landing-hero-glow-left absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
          <div className="landing-hero-glow-right absolute bottom-10 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
        </div>

        <div className="landing-container relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="landing-hero-content text-center max-w-3xl mx-auto">
            <div className="landing-status-pill inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
              <div className="landing-status-dot w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white/80">
                Bangladesh Traffic Enforcement Platform
              </span>
            </div>

            <h1 className="landing-hero-title text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Smart Traffic
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {' '}
                Verification{' '}
              </span>
              & Enforcement
            </h1>

            <p className="landing-hero-subtitle text-lg text-blue-100/80 mb-8 leading-relaxed max-w-2xl mx-auto">
              A digital platform that replaces manual document checking with instant QR-based
              verification, automated violation detection, and paperless E-Challan generation.
            </p>

            <div className="landing-hero-actions flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleAuthOpen}
                className="landing-primary-cta px-8 py-3.5 bg-white text-[#0f4c81] rounded-xl font-semibold hover:shadow-xl hover:shadow-white/20 active:scale-[0.98] flex items-center gap-2"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="landing-stats-grid grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-2xl mx-auto">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="landing-stat-card bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                >
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-blue-200/70 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-features-section py-20 bg-gray-50">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="landing-section-heading text-center mb-12">
            <p className="text-sm font-semibold text-[#1a73e8] uppercase tracking-wider mb-2">
              Core Features
            </p>

            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">
              Everything You Need for Modern Enforcement
            </h2>

            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              From instant roadside verification to automated digital case management — all in one
              platform.
            </p>
          </div>

          <div className="landing-feature-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feature) => (
              <article
                key={feature.title}
                className="landing-feature-card bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div
                  className={`landing-feature-icon w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {feature.title}
                </h3>

                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="landing-process-section relative overflow-hidden py-24">
        <div className="landing-process-bg-glow landing-process-bg-glow-one" />
        <div className="landing-process-bg-glow landing-process-bg-glow-two" />

        <div className="landing-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="landing-section-heading mx-auto max-w-3xl text-center">
            <span className="landing-section-label">Process</span>

            <h2 className="landing-section-title mt-3 text-4xl font-black text-gray-900 sm:text-5xl">
              How STVES Works
            </h2>

            <p className="landing-section-subtitle mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500">
              From roadside scanning to digital e-challan generation, every step is
              verified, traceable, and faster than manual enforcement.
            </p>
          </div>

          <div className="landing-process-timeline relative mt-16">
            <div className="landing-process-line hidden lg:block" />

            <div className="landing-process-grid grid gap-5 lg:grid-cols-4">
              {processSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="landing-process-card group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-100/60"
                >
                  <div className="landing-process-card-top mb-8 flex items-center justify-between">
                    <div className="landing-process-number flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 text-2xl font-black text-[#0f4c81] ring-1 ring-blue-100 transition-all duration-300 group-hover:from-[#0f4c81] group-hover:to-[#1a73e8] group-hover:text-white">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <span className="landing-process-step-label rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-400">
                      Step {index + 1}
                    </span>
                  </div>

                  <h3 className="landing-process-card-title text-xl font-extrabold text-gray-900">
                    {step.title}
                  </h3>

                  <p className="landing-process-card-description mt-3 text-sm leading-relaxed text-gray-500">
                    {step.description}
                  </p>

                  {index < processSteps.length - 1 && (
                    <div className="landing-process-arrow hidden lg:flex">
                      <ArrowRight size={18} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="landing-roles-section py-20 bg-gradient-to-br from-[#0d1b2a] to-[#0f4c81]">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="landing-section-heading text-center mb-12">
            <p className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              User Roles
            </p>

            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Built for Every Stakeholder
            </h2>
          </div>

          <div className="landing-role-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {userRoles.map((item) => (
              <article
                key={item.role}
                className={`landing-role-card bg-white/5 backdrop-blur-sm rounded-2xl p-6 border ${item.color} hover:bg-white/10 transition-colors`}
              >
                <span className="text-4xl">{item.emoji}</span>

                <h3 className="text-lg font-semibold text-white mt-3 mb-2">
                  {item.role}
                </h3>

                <p className="text-sm text-blue-200/70">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta-section relative overflow-hidden py-24">
        <div className="landing-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="landing-cta-card relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d1b2a] via-[#0f4c81] to-[#1a73e8] px-6 py-14 text-center text-white shadow-2xl shadow-blue-200 sm:px-10">
            <div className="landing-cta-glow landing-cta-glow-one" />
            <div className="landing-cta-glow landing-cta-glow-two" />

            <div className="relative z-10 mx-auto max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-100">
                Ready to get started?
              </span>

              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
                Modernize Traffic Enforcement with STVES
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-blue-100 sm:text-lg">
                Access a secure digital platform for vehicle verification, QR scanning,
                e-challan management, analytics, and role-based traffic enforcement.
              </p>

              <button
                type="button"
                onClick={handleAuthOpen}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-[#0f4c81] shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98]"
              >
                Login / Register
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl text-center">
          <BrandLogo
            variant="footer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            ariaLabel="Go to landing page"
          />

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Smart Traffic Verification & Enforcement System for digital vehicle
            verification, QR scanning, e-challan generation, and traffic enforcement.
          </p>

          <p className="mt-5 text-xs text-slate-400">
            CSE 436 Final Year Project | Metropolitan University, Sylhet
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Developed by Md. Jamil Ahamad Alamin & Shtabdee Paul
          </p>

          <p className="mt-4 text-xs text-slate-600">
            © 2025 STVES. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}