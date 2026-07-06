import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Car,
  IdCard,
  Loader2,
  Lock,
  LogIn,
  QrCode,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import api from '../lib/api';
import { parseSTVESQR } from '../utils/qr';
import BrandLogo from '../components/common/BrandLogo';
import '../styles/PublicVerifyPage.css';

const sampleQRValues = [
  {
    label: 'Vehicle QR',
    value: 'STVES-VEH:SYL-METRO-GA-11-1234',
    icon: Car,
  },
  {
    label: 'License QR',
    value: 'STVES-LIC:DL-SYL-2026-001',
    icon: IdCard,
  },
];

const getQueryParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || '';
};

const getResponseData = (response) => {
  return response?.data || response?.result || response || {};
};

const getStatusValidity = (status = '') => {
  const statusValue = String(status || '').toLowerCase();
  return ['active', 'valid', 'approved', 'paid'].includes(statusValue);
};

const getIssueList = (data, target) => {
  const issues = target?.issues || data?.issues || data?.verification?.issues || [];
  return Array.isArray(issues) ? issues : [];
};

const normalizePublicResult = (response, parsed) => {
  const data = getResponseData(response);

  if (parsed?.type === 'vehicle') {
    const vehicle = data.vehicle || data.data || data;
    const status = vehicle.status || data.status || data.verification?.status || 'unknown';
    const issues = getIssueList(data, vehicle);

    return {
      found: response?.success !== false,
      type: 'vehicle',
      title: 'Vehicle Verification',
      identifier:
        vehicle.registrationNumber ||
        vehicle.plateNumber ||
        vehicle.plate ||
        parsed.value,
      status,
      valid: Boolean(
        vehicle.valid ??
        data.valid ??
        data.verification?.isCompliant ??
        (getStatusValidity(status) && issues.length === 0)
      ),
      brand: vehicle.brand || data.brand || 'Hidden',
      model: vehicle.model || data.model || 'Hidden',
      year: vehicle.year || data.year || 'N/A',
      color: vehicle.color || data.color || 'N/A',
      riskLevel:
        vehicle.riskLevel ||
        data.riskLevel ||
        data.verification?.riskLevel ||
        (issues.length > 0 ? 'Needs Review' : 'Low Risk'),
      issues,
      message: response?.message || 'Vehicle QR verified.',
    };
  }

  if (parsed?.type === 'license') {
    const license = data.license || data.data || data;
    const status = license.status || data.status || data.verification?.status || 'unknown';
    const issues = getIssueList(data, license);

    return {
      found: response?.success !== false,
      type: 'license',
      title: 'License Verification',
      identifier: license.licenseNumber || data.licenseNumber || parsed.value,
      status,
      valid: Boolean(
        license.valid ??
        data.valid ??
        data.verification?.isCompliant ??
        (getStatusValidity(status) && issues.length === 0)
      ),
      holderName: license.holderName || data.holderName || 'Hidden',
      licenseClass:
        license.licenseClass ||
        license.licenseType ||
        data.licenseClass ||
        data.licenseType ||
        'N/A',
      riskLevel:
        license.riskLevel ||
        data.riskLevel ||
        data.verification?.riskLevel ||
        (issues.length > 0 ? 'Needs Review' : 'Low Risk'),
      issues,
      message: response?.message || 'License QR verified.',
    };
  }

  return {
    found: false,
    type: 'unknown',
    title: 'Invalid QR',
    identifier: '',
    status: 'invalid',
    valid: false,
    riskLevel: 'Critical',
    issues: [],
    message: 'Unsupported QR format.',
  };
};

export default function PublicVerifyPage({ onBack, onLogin }) {
  const qrFromUrl = useMemo(() => {
    return getQueryParam('qr') || getQueryParam('code') || '';
  }, []);

  const [qrValue, setQrValue] = useState(qrFromUrl);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(Boolean(qrFromUrl));
  const [error, setError] = useState('');

  const verifyQR = async (value) => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      const parsed = parseSTVESQR(value);

      if (!parsed.isValid) {
        setError(parsed.error || 'Invalid STVES QR code.');
        return;
      }

      const response = await api.verifyByQR(parsed.raw);
      const normalized = normalizePublicResult(response, parsed);

      setResult(normalized);
    } catch (err) {
      console.error('Public QR verification failed:', err);
      setError(err.message || 'QR verification failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qrFromUrl) {
      verifyQR(qrFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrFromUrl]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const value = qrValue.trim();

    if (!value) {
      setError('Please enter a QR value.');
      setResult(null);
      return;
    }

    verifyQR(value);
  };

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }

    window.location.href = '/';
  };

  const handleLogin = () => {
    if (typeof onLogin === 'function') {
      onLogin();
      return;
    }

    window.location.href = '/';
  };

  const goToLandingSection = (sectionId = '') => {
    if (typeof onBack === 'function') {
      onBack();

      if (sectionId) {
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({
            behavior: 'smooth',
          });
        }, 120);
      }

      return;
    }

    window.location.href = sectionId ? `/#${sectionId}` : '/';
  };

  const handleSampleClick = (value) => {
    setQrValue(value);
    setError('');
    setResult(null);
  };

  const resultCardClass = result?.valid
    ? 'border-green-200 bg-green-50'
    : 'border-red-200 bg-red-50';

  const resultTitleClass = result?.valid ? 'text-green-700' : 'text-red-700';

  return (
    <div className="public-verify-wrapper min-h-screen bg-slate-100">
      <header className="public-verify-nav">
        <div className="public-verify-nav-shell">
          <div className="public-verify-nav-content">
            <BrandLogo
              variant="public"
              onClick={() => goToLandingSection()}
              ariaLabel="Back to landing page"
            />

            <nav className="public-verify-links" aria-label="Public verification navigation">
              <button type="button" onClick={() => goToLandingSection('features')}>
                Features
              </button>

              <button type="button" onClick={() => goToLandingSection('process')}>
                Process
              </button>

              <button type="button" onClick={() => goToLandingSection('roles')}>
                Roles
              </button>

              <span className="public-verify-active-link">
                Public Verify
              </span>
            </nav>

            <div className="public-verify-nav-actions">
              <button
                type="button"
                onClick={handleLogin}
                className="public-verify-login-button"
              >
                Login / Register
                <LogIn size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="public-verify-main">
        <section className="public-verify-hero">
          <div className="public-verify-kicker">
            <Lock size={14} />
            Limited public document validity check
          </div>

          <h1>Verify STVES QR Code</h1>

          <p>
            Check limited public validity information for vehicle and driving
            license QR codes without exposing sensitive personal data.
          </p>
        </section>

        <section className="public-verify-card">
          <div className="public-verify-card-header">
            <div className="public-verify-card-icon">
              <QrCode size={26} />
            </div>

            <div>
              <h2>Public Verification</h2>
              <p>Enter a STVES QR value or use a sample below.</p>
            </div>
          </div>

          <div className="public-verify-body">
            <form onSubmit={handleSubmit} className="public-verify-form">
              <label className="public-verify-label">QR Code Value</label>

              <div className="public-verify-search-row">
                <input
                  value={qrValue}
                  onChange={(event) => setQrValue(event.target.value)}
                  placeholder="STVES-VEH:SYL-METRO-GA-11-1234"
                  className="public-verify-input"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="public-verify-button"
                >
                  {loading ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Search size={17} />
                  )}
                  Verify
                </button>
              </div>

              <p className="public-verify-help">
                Supported format: <span>STVES-VEH:&lt;plate&gt;</span> or{' '}
                <span>STVES-LIC:&lt;license&gt;</span>
              </p>
            </form>

            <div className="public-verify-samples">
              {sampleQRValues.map((sample) => {
                const Icon = sample.icon;

                return (
                  <button
                    key={sample.value}
                    type="button"
                    onClick={() => handleSampleClick(sample.value)}
                    className="public-verify-sample-chip"
                  >
                    <Icon size={15} />
                    <span>{sample.label}</span>
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="public-verify-loading rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
                <Loader2
                  size={36}
                  className="mx-auto text-blue-600 animate-spin mb-2"
                />
                <p className="text-sm font-medium text-blue-700">
                  Verifying QR code...
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="public-verify-error rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3">
                <XCircle size={24} className="text-red-500 shrink-0" />

                <div>
                  <h3 className="font-semibold text-red-700">
                    Verification Failed
                  </h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {!loading && result && (
              <div className={`public-verify-result rounded-2xl border p-5 ${resultCardClass}`}>
                <div className="public-verify-result-head flex items-start gap-3">
                  {result.valid ? (
                    <ShieldCheck size={30} className="text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle size={30} className="text-red-500 shrink-0" />
                  )}

                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${resultTitleClass}`}>
                      {result.valid ? 'Valid Document' : 'Invalid / Not Active'}
                    </h3>

                    <p className="text-sm text-slate-600 mt-1">
                      {result.message}
                    </p>
                  </div>
                </div>

                <div className="public-verify-info-box mt-5 bg-white/80 rounded-xl border border-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <QrCode size={16} />
                    {result.title}
                  </div>

                  <div className="public-verify-info-grid grid grid-cols-2 gap-3 text-sm">
                    <InfoItem label="Identifier" value={result.identifier} />
                    <InfoItem label="Status" value={result.status} capitalize />

                    {result.type === 'vehicle' && (
                      <>
                        <InfoItem label="Brand" value={result.brand} />
                        <InfoItem label="Model" value={result.model} />
                        <InfoItem label="Year" value={result.year} />
                        <InfoItem label="Color" value={result.color} />
                      </>
                    )}

                    {result.type === 'license' && (
                      <>
                        <InfoItem label="Holder" value={result.holderName} />
                        <InfoItem label="Class" value={result.licenseClass} />
                      </>
                    )}

                    <div className="col-span-2">
                      <InfoItem label="Risk Level" value={result.riskLevel} />
                    </div>
                  </div>
                </div>

                {Array.isArray(result.issues) && result.issues.length > 0 && (
                  <div className="public-verify-issues mt-4 rounded-xl bg-white/70 border border-white p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Compliance Issues
                    </p>

                    <ul className="space-y-2">
                      {result.issues.slice(0, 3).map((issue, index) => (
                        <li
                          key={`${issue.code || issue.message || 'issue'}-${index}`}
                          className="text-xs text-slate-600 flex gap-2"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          <span>{issue.message || issue.code || 'Issue detected'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="public-verify-privacy-note">
                  Privacy note: Public verification only displays limited validity
                  information. Sensitive personal data is hidden.
                </p>
              </div>
            )}
          </div>
        </section>

        <p className="public-verify-footer">
          Smart Traffic Verification and Enforcement System
        </p>
      </main>
    </div>
  );
}

function InfoItem({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`font-medium text-slate-700 ${capitalize ? 'capitalize' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  );
}