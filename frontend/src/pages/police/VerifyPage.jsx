import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle,
  FileWarning,
  IdCard,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import useStore from '../../store/useStore';
import '../../styles/VerifyPage.css';

const cleanInput = (value) => {
  return String(value || '')
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^STVES-VEH:/, '')
    .replace(/^STVES-LIC:/, '');
};

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'object') {
    return item._id || item.id || '';
  }

  return String(item);
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getPersonName = (person) => {
  if (!person) {
    return 'N/A';
  }

  if (typeof person === 'object') {
    return person.name || person.fullName || person.driverName || 'N/A';
  }

  return 'N/A';
};

const getStatusText = (status) => {
  const text = String(status || 'N/A');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getStatusColor = (status) => {
  const value = String(status || '').toLowerCase();

  if (['active', 'valid', 'approved', 'paid', 'authorized'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }

  if (['pending', 'warning'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (['expired', 'suspended', 'blacklisted', 'revoked', 'invalid'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const normalizeIssues = (issues = []) => {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map((issue) => {
    if (typeof issue === 'string') {
      return issue;
    }

    if (issue && typeof issue === 'object') {
      return issue.message || issue.code || 'Issue detected.';
    }

    return String(issue || 'Issue detected.');
  });
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const isExpiredDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date < today;
};

const getResponseObject = (response) => {
  return response?.data || response || {};
};

const normalizeVehicleResult = (response, linkedLicenseResponse = null) => {
  const data = getResponseObject(response);
  const linkedLicenseData = linkedLicenseResponse ? getResponseObject(linkedLicenseResponse) : null;

  const vehicle = data.vehicle || data.data?.vehicle || data.data || null;
  const linkedLicense =
    linkedLicenseData?.license ||
    linkedLicenseData?.data?.license ||
    linkedLicenseData?.data ||
    null;

  const issues = normalizeIssues(
    data.verification?.issues ||
    data.issues ||
    vehicle?.issues ||
    []
  );

  const verificationResult =
    data.verification?.result ||
    data.verification?.status ||
    data.result ||
    vehicle?.verificationStatus ||
    'valid';

  const isCompliant = Boolean(
    data.verification?.isCompliant ??
    data.isCompliant ??
    (verificationResult === 'valid' && issues.length === 0)
  );

  return {
    type: 'vehicle',
    found: Boolean(vehicle),
    vehicle,
    linkedLicense,
    owner: vehicle?.owner || data.owner || null,
    authorizedDrivers: data.authorizedDrivers || data.drivers || [],
    driverAuthorization: data.driverAuthorization || null,
    verification: data.verification || {
      result: verificationResult,
      issues,
      isCompliant,
    },
    issues,
    isCompliant,
    message: response?.message || data.message || 'Vehicle verification completed.',
  };
};

const normalizeLicenseResult = (response) => {
  const data = getResponseObject(response);
  const license = data.license || data.data?.license || data.data || null;

  const issues = normalizeIssues(
    data.verification?.issues ||
    data.issues ||
    license?.issues ||
    []
  );

  const verificationResult =
    data.verification?.result ||
    data.verification?.status ||
    data.result ||
    license?.verificationStatus ||
    'valid';

  const isCompliant = Boolean(
    data.verification?.isCompliant ??
    data.isCompliant ??
    (verificationResult === 'valid' && issues.length === 0)
  );

  return {
    type: 'license',
    found: Boolean(license),
    license,
    driver: license?.driver || data.driver || null,
    authorizedVehicles: data.authorizedVehicles || data.vehicles || [],
    verification: data.verification || {
      result: verificationResult,
      issues,
      isCompliant,
    },
    issues,
    isCompliant,
    message: response?.message || data.message || 'License verification completed.',
  };
};

const getAuthorizedDriverList = ({ authorizedDrivers = [], driverAuthorization, linkedLicense }) => {
  const list = Array.isArray(authorizedDrivers) ? [...authorizedDrivers] : [];

  if (!driverAuthorization?.authorized) {
    return list;
  }

  const rawDriver =
    driverAuthorization?.driver ||
    linkedLicense?.driver ||
    null;

  const sourceDriver =
    rawDriver && typeof rawDriver === 'object'
      ? rawDriver
      : {};

  const sourceName = getPersonName(sourceDriver);
  const licenseNumber =
    driverAuthorization?.licenseNumber ||
    linkedLicense?.licenseNumber ||
    sourceDriver?.licenseNumber ||
    '';

  const checkedDriver = {
    ...sourceDriver,
    _id:
      getId(sourceDriver) ||
      getId(driverAuthorization?.assignment?.driver) ||
      `checked-${licenseNumber || 'driver'}`,
    name:
      sourceDriver?.name ||
      sourceDriver?.driverName ||
      linkedLicense?.holderName ||
      (sourceName !== 'N/A' ? sourceName : 'Checked Driver'),
    email: sourceDriver?.email || '',
    phone: sourceDriver?.phone || '',
    nid: sourceDriver?.nid || '',
    licenseNumber,
    status: 'authorized',
  };

  const checkedKey = getId(checkedDriver) || checkedDriver.licenseNumber || checkedDriver.name;

  const alreadyExists = list.some((driver) => {
    const driverKey = getId(driver) || driver?.licenseNumber || driver?.name || driver?.driverName;
    const sameLicense =
      checkedDriver.licenseNumber &&
      driver?.licenseNumber &&
      String(driver.licenseNumber).toUpperCase() === String(checkedDriver.licenseNumber).toUpperCase();

    return String(driverKey) === String(checkedKey) || sameLicense;
  });

  if (!alreadyExists) {
    list.unshift(checkedDriver);
  }

  return list;
};

const documentRows = [
  {
    label: 'Registration',
    key: 'registrationExpiry',
  },
  {
    label: 'Fitness Certificate',
    key: 'fitnessExpiry',
  },
  {
    label: 'Tax Token',
    key: 'taxTokenExpiry',
  },
  {
    label: 'Route Permit',
    key: 'routePermitExpiry',
  },
  {
    label: 'Insurance',
    key: 'insuranceExpiry',
  },
];

const vehicleQuickExamples = [
  {
    label: 'SYL-METRO-GA-11-1234',
    plate: 'SYL-METRO-GA-11-1234',
    license: '',
  },
  {
    label: 'SYL-METRO-GA-22-5678 + DL-SYL-2026-001',
    plate: 'SYL-METRO-GA-22-5678',
    license: 'DL-SYL-2026-001',
  },
];

const licenseQuickExamples = [
  {
    label: 'DL-SYL-2026-001',
    license: 'DL-SYL-2026-001',
  },
];

export default function VerifyPage({ onNavigate = () => { }, setVerificationResult }) {
  const currentUser = useStore((state) => state.currentUser);
  const addLog = useStore((state) => state.addLog);
  const qrVerificationPayload = useStore((state) => state.qrVerificationPayload);
  const clearQRVerificationPayload = useStore((state) => state.clearQRVerificationPayload);

  const [mode, setMode] = useState('vehicle');
  const [searchValue, setSearchValue] = useState('');
  const [driverLicenseValue, setDriverLicenseValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetResult = () => {
    setResult(null);
    setError('');
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setSearchValue('');
    setDriverLicenseValue('');
    resetResult();
  };

  const writeVerificationLog = ({ action, details }) => {
    if (!currentUser || typeof addLog !== 'function') {
      return;
    }

    addLog({
      userId: currentUser.id || currentUser._id,
      userName: currentUser.name || 'Police Officer',
      action,
      details,
      type: 'verification',
    });
  };

  const runLicenseVerification = async (licenseNumber) => {
    const cleanLicense = cleanInput(licenseNumber);

    const licenseResponse = await api.verifyLicense(cleanLicense);
    const normalized = normalizeLicenseResult(licenseResponse);

    setResult(normalized);

    writeVerificationLog({
      action: 'License Verified',
      details: `License ${cleanLicense} verification completed.`,
    });
  };

  const runVehicleVerification = async (registrationNumber, licenseNumber = '') => {
    const cleanRegistrationNumber = cleanInput(registrationNumber);
    const cleanDriverLicenseNumber = cleanInput(licenseNumber);

    let linkedLicenseResponse = null;

    if (cleanDriverLicenseNumber) {
      linkedLicenseResponse = await api.verifyLicense(cleanDriverLicenseNumber);
    }

    const vehicleResponse = await api.verifyVehicle(
      cleanRegistrationNumber,
      cleanDriverLicenseNumber
    );

    const normalized = normalizeVehicleResult(vehicleResponse, linkedLicenseResponse);

    setResult(normalized);

    writeVerificationLog({
      action: 'Vehicle Verified',
      details: `Vehicle ${cleanRegistrationNumber} verification completed${cleanDriverLicenseNumber ? ` with driver license ${cleanDriverLicenseNumber}` : ''
        }.`,
    });
  };

  const handleAuthorizedLicenseClick = async (licenseNumber) => {
    const cleanLicense = cleanInput(licenseNumber);

    if (!cleanLicense) {
      setError('License number was not found for this authorized driver.');
      return;
    }

    try {
      setMode('driver');
      setSearchValue(cleanLicense);
      setDriverLicenseValue('');
      setLoading(true);
      setError('');
      setResult(null);

      await runLicenseVerification(cleanLicense);
    } catch (err) {
      console.error('License verification failed:', err);
      setError(err.message || 'License verification failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!qrVerificationPayload?.type || !qrVerificationPayload?.value) {
      return;
    }

    let cancelled = false;

    const runQRHandoffVerification = async () => {
      const payloadType = qrVerificationPayload.type;
      const payloadValue = cleanInput(qrVerificationPayload.value);

      try {
        setLoading(true);
        setError('');
        setResult(null);
        setDriverLicenseValue('');

        if (payloadType === 'vehicle') {
          setMode('vehicle');
          setSearchValue(payloadValue);

          await runVehicleVerification(payloadValue);
        } else if (payloadType === 'license') {
          setMode('driver');
          setSearchValue(payloadValue);

          await runLicenseVerification(payloadValue);
        } else {
          throw new Error('Unsupported QR verification type.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('QR handoff verification failed:', err);
          setError(err.message || 'QR verification failed.');
          setResult(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);

          if (typeof clearQRVerificationPayload === 'function') {
            clearQRVerificationPayload();
          }
        }
      }
    };

    runQRHandoffVerification();

    return () => {
      cancelled = true;
    };
  }, [qrVerificationPayload]);

  const handleVerify = async (event) => {
    event.preventDefault();

    const cleanSearchValue = cleanInput(searchValue);
    const cleanDriverLicenseValue = cleanInput(driverLicenseValue);

    if (!cleanSearchValue) {
      setError(
        mode === 'vehicle'
          ? 'Please enter a vehicle registration number.'
          : 'Please enter a driving license number.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      if (mode === 'driver') {
        await runLicenseVerification(cleanSearchValue);
        return;
      }

      await runVehicleVerification(cleanSearchValue, cleanDriverLicenseValue);
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = () => {
    if (!result || result.type !== 'vehicle' || !result.vehicle) {
      return;
    }

    const vehicle = result.vehicle;
    const linkedLicense = result.linkedLicense;

    const driver =
      result.driverAuthorization?.driver ||
      linkedLicense?.driver ||
      result.authorizedDrivers?.[0] ||
      null;

    const preparedResult = {
      ...result,
      found: true,
      vehicle: {
        ...vehicle,
        id: getId(vehicle),
        _id: getId(vehicle),
        plateNumber: getVehiclePlate(vehicle),
        registrationNumber: getVehiclePlate(vehicle),
      },
      driver,
      license: linkedLicense,
      issues: result.issues || [],
      isCompliant: result.isCompliant,
    };

    if (typeof setVerificationResult === 'function') {
      setVerificationResult(preparedResult);
    }

    onNavigate('create-case');
  };

  return (
    <div className="verify-page-wrapper animate-fade-in space-y-6">
      <header className="verify-page-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck size={26} />
          Verify Vehicle / Driver
        </h1>

        <p className="text-sm text-blue-100 mt-1">
          Check vehicle documents, driving license status, and driver authorization in real time.
        </p>
      </header>

      <section className="verify-search-card bg-white rounded-2xl border border-gray-100 p-5">
        <div className="verify-mode-tabs grid grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => handleModeChange('vehicle')}
            className={`verify-mode-button rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'vehicle'
              ? 'bg-[#0f4c81] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Car size={18} />
            Vehicle
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('driver')}
            className={`verify-mode-button rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'driver'
              ? 'bg-[#0f4c81] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <IdCard size={18} />
            Driver License
          </button>
        </div>

        <form onSubmit={handleVerify} className="verify-search-form space-y-4">
          <div className="verify-search-grid grid lg:grid-cols-2 gap-4">
            <div className="verify-field-group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {mode === 'vehicle'
                  ? 'Vehicle Registration Number'
                  : 'Driving License Number'}
              </label>

              <div className="verify-input-wrap relative">
                {mode === 'vehicle' ? (
                  <Car
                    size={18}
                    className="verify-input-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                ) : (
                  <IdCard
                    size={18}
                    className="verify-input-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                )}

                <input
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={
                    mode === 'vehicle'
                      ? 'Example: SYL-METRO-GA-11-1234'
                      : 'Example: DL-SYL-2026-001'
                  }
                  className="verify-search-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                />
              </div>
            </div>

            {mode === 'vehicle' ? (
              <div className="verify-field-group">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Driver License Number
                  <span className="text-gray-400 font-normal"> — optional</span>
                </label>

                <div className="verify-input-wrap relative">
                  <IdCard
                    size={18}
                    className="verify-input-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={driverLicenseValue}
                    onChange={(event) => setDriverLicenseValue(event.target.value)}
                    placeholder="Enter license number to verify vehicle-driver authorization"
                    className="verify-search-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                  />
                </div>
              </div>
            ) : (
              <div className="verify-field-group rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-blue-700">
                  Driver license verification
                </p>

                <p className="mt-1 text-xs text-blue-600">
                  Search a license number to check license validity, driver profile, and authorized vehicles.
                </p>
              </div>
            )}
          </div>

          <div className="verify-sample-row flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">
              Try:
            </span>

            {(mode === 'vehicle' ? vehicleQuickExamples : licenseQuickExamples).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (mode === 'vehicle') {
                    setSearchValue(item.plate);
                    setDriverLicenseValue(item.license || '');
                  } else {
                    setSearchValue(item.license);
                    setDriverLicenseValue('');
                  }

                  setError('');
                  setResult(null);
                }}
                className="verify-example-chip rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-[#0f4c81]"
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="verify-submit-button w-full rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-6 py-3 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {mode === 'vehicle' ? 'Verify Vehicle / Driver' : 'Verify Driver License'}
          </button>
        </form>
      </section>

      {error && (
        <section className="verify-error-card rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <XCircle size={26} className="text-red-500 shrink-0" />

          <div>
            <h3 className="font-semibold text-red-700">Verification Failed</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </section>
      )}

      {loading && (
        <section className="verify-loading-card rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
          <Loader2 size={40} className="text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-blue-700">
            Checking BRTA records and STVES database...
          </p>
        </section>
      )}

      {!loading && !error && !result && (
        <VerificationEmptyState mode={mode} />
      )}

      {!loading && result?.type === 'vehicle' && (
        <VehicleResult
          result={result}
          onCreateCase={handleCreateCase}
          onLicenseClick={handleAuthorizedLicenseClick}
        />
      )}

      {!loading && result?.type === 'license' && (
        <LicenseResult result={result} />
      )}
    </div>
  );
}

function VehicleResult({ result, onCreateCase, onLicenseClick = () => { } }) {
  const vehicle = result.vehicle;
  const owner = result.owner || vehicle?.owner;
  const issues = result.issues || [];
  const rawAuthorizedDrivers = Array.isArray(result.authorizedDrivers)
    ? result.authorizedDrivers
    : [];

  const driverAuthorization = result.driverAuthorization;
  const linkedLicense = result.linkedLicense;

  const authorizedDrivers = getAuthorizedDriverList({
    authorizedDrivers: rawAuthorizedDrivers,
    driverAuthorization,
    linkedLicense,
  });

  if (!vehicle) {
    return null;
  }

  return (
    <section className="verify-result-area space-y-4">
      <div
        className={`verify-result-banner rounded-2xl border p-5 flex items-center gap-4 ${result.isCompliant
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
          }`}
      >
        {result.isCompliant ? (
          <CheckCircle size={34} className="text-green-500 shrink-0" />
        ) : (
          <AlertTriangle size={34} className="text-red-500 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg font-bold ${result.isCompliant ? 'text-green-700' : 'text-red-700'
              }`}
          >
            {result.isCompliant ? 'Vehicle is Compliant' : 'Vehicle Has Issues'}
          </h3>

          <p className="text-sm text-gray-600 mt-1 truncate">
            {getVehiclePlate(vehicle)} — {vehicle.brand || 'N/A'} {vehicle.model || ''}
          </p>
        </div>

        {!result.isCompliant && (
          <button
            type="button"
            onClick={onCreateCase}
            className="verify-create-case-button hidden sm:flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <FileWarning size={16} />
            Issue E-Challan
          </button>
        )}
      </div>

      {!result.isCompliant && (
        <button
          type="button"
          onClick={onCreateCase}
          className="verify-create-case-button-mobile sm:hidden w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
        >
          <FileWarning size={16} />
          Issue E-Challan
        </button>
      )}

      <InfoCard icon={Car} title="Vehicle Information">
        <div className="verify-info-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <InfoItem label="Plate Number" value={getVehiclePlate(vehicle)} />
          <InfoItem
            label="Brand / Model"
            value={`${vehicle.brand || 'N/A'} ${vehicle.model || ''}`}
          />
          <InfoItem label="Type" value={vehicle.vehicleType} />
          <InfoItem label="Color" value={vehicle.color} />
          <InfoItem label="Year" value={vehicle.year} />
          <InfoItem label="Engine No." value={vehicle.engineNumber} />
          <InfoItem label="Chassis No." value={vehicle.chassisNumber} />
          <InfoItem label="Safety Score" value={`${vehicle.safetyScore ?? 100}/100`} />

          <div>
            <p className="text-xs text-gray-400">Status</p>
            <div className="mt-1">
              <StatusBadge>{vehicle.status || 'active'}</StatusBadge>
            </div>
          </div>
        </div>
      </InfoCard>

      <InfoCard icon={CalendarDays} title="Document Expiry Status">
        <div className="verify-document-grid grid sm:grid-cols-2 gap-3">
          {documentRows.map((row) => {
            const value = vehicle[row.key];
            const expired = isExpiredDate(value);

            return (
              <div
                key={row.key}
                className={`verify-document-row flex items-center justify-between rounded-xl border px-4 py-3 ${expired
                  ? 'border-red-200 bg-red-50'
                  : 'border-green-200 bg-green-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {expired ? (
                    <AlertTriangle size={15} className="text-red-600" />
                  ) : (
                    <CheckCircle size={15} className="text-green-600" />
                  )}

                  <span className="text-sm font-semibold text-gray-800">
                    {row.label}
                  </span>
                </div>

                <div className="text-right">
                  <p
                    className={`text-xs font-bold ${expired ? 'text-red-700' : 'text-green-700'
                      }`}
                  >
                    {expired ? 'EXPIRED' : 'VALID'}
                  </p>
                  <p className="text-[11px] text-gray-500">{formatDate(value)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </InfoCard>

      {owner && (
        <InfoCard icon={UserRound} title="Owner Information">
          <div className="verify-info-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoItem label="Name" value={owner.name} />
            <InfoItem label="Email" value={owner.email} />
            <InfoItem label="Phone" value={owner.phone} />
            <InfoItem label="NID" value={owner.nid} />
            <InfoItem label="Role" value={owner.role} />

            <div>
              <p className="text-xs text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge>{owner.status || 'active'}</StatusBadge>
              </div>
            </div>
          </div>
        </InfoCard>
      )}

      {linkedLicense && (
        <InfoCard icon={IdCard} title="Checked Driver License">
          <div className="verify-info-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoItem label="License Number" value={linkedLicense.licenseNumber} />
            <InfoItem label="Driver" value={getPersonName(linkedLicense.driver)} />
            <InfoItem label="License Type" value={linkedLicense.licenseType || linkedLicense.licenseClass} />
            <InfoItem label="Issue Date" value={formatDate(linkedLicense.issueDate)} />
            <InfoItem label="Expiry Date" value={formatDate(linkedLicense.expiryDate)} />

            <div>
              <p className="text-xs text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge>{linkedLicense.status}</StatusBadge>
              </div>
            </div>
          </div>
        </InfoCard>
      )}

      {driverAuthorization?.checked && (
        <DriverAuthorizationCard driverAuthorization={driverAuthorization} />
      )}

      <InfoCard icon={ShieldCheck} title={`Authorized Drivers (${authorizedDrivers.length})`}>
        {authorizedDrivers.length === 0 ? (
          <p className="text-sm text-gray-500">No authorized driver found.</p>
        ) : (
          <div className="verify-authorized-list space-y-3">
            {authorizedDrivers.map((driver, index) => (
              <div
                key={getId(driver) || index}
                className="verify-authorized-driver flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {driver.name || driver.driverName || driver.holderName || 'Authorized Driver'}
                  </p>

                  <p className="text-xs text-gray-500 truncate">
                    {driver.licenseNumber ? (
                      <button
                        type="button"
                        onClick={() => onLicenseClick(driver.licenseNumber)}
                        className="font-semibold text-[#0f4c81] hover:underline"
                        title="Click to verify this driver license"
                      >
                        {driver.licenseNumber}
                      </button>
                    ) : (
                      driver.email || 'License N/A'
                    )}
                    {driver.phone ? ` • ${driver.phone}` : ''}
                  </p>
                </div>

                <StatusBadge>{driver.authorizationStatus || driver.status || 'authorized'}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {issues.length > 0 && (
        <InfoCard icon={AlertTriangle} title={`Issues Found (${issues.length})`} danger>
          <ul className="verify-issue-list space-y-2">
            {issues.map((issue, index) => (
              <li
                key={`${issue}-${index}`}
                className="verify-issue-item flex items-start gap-2 text-sm text-red-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
    </section>
  );
}

function LicenseResult({ result }) {
  const license = result.license;
  const driver = result.driver || license?.driver;
  const issues = result.issues || [];
  const authorizedVehicles = result.authorizedVehicles || [];

  if (!license) {
    return null;
  }

  return (
    <section className="verify-result-area space-y-4">
      <div
        className={`verify-result-banner rounded-2xl border p-5 flex items-center gap-4 ${result.isCompliant
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
          }`}
      >
        {result.isCompliant ? (
          <CheckCircle size={34} className="text-green-500 shrink-0" />
        ) : (
          <AlertTriangle size={34} className="text-red-500 shrink-0" />
        )}

        <div className="min-w-0">
          <h3
            className={`text-lg font-bold ${result.isCompliant ? 'text-green-700' : 'text-red-700'
              }`}
          >
            {result.isCompliant ? 'License is Valid' : 'License Has Issues'}
          </h3>

          <p className="text-sm text-gray-600 mt-1 truncate">
            {license.licenseNumber || 'N/A'} — {getPersonName(driver)}
          </p>
        </div>
      </div>

      <InfoCard icon={IdCard} title="License Information">
        <div className="verify-info-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <InfoItem label="License Number" value={license.licenseNumber} />
          <InfoItem label="Driver Name" value={getPersonName(driver)} />
          <InfoItem label="License Type" value={license.licenseType || license.licenseClass} />
          <InfoItem label="Blood Group" value={license.bloodGroup} />
          <InfoItem label="Issue Date" value={formatDate(license.issueDate)} />
          <InfoItem label="Expiry Date" value={formatDate(license.expiryDate)} />

          <div>
            <p className="text-xs text-gray-400">Status</p>
            <div className="mt-1">
              <StatusBadge>{license.status}</StatusBadge>
            </div>
          </div>
        </div>
      </InfoCard>

      {driver && (
        <InfoCard icon={UserRound} title="Driver Information">
          <div className="verify-info-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoItem label="Name" value={driver.name} />
            <InfoItem label="Email" value={driver.email} />
            <InfoItem label="Phone" value={driver.phone} />
            <InfoItem label="NID" value={driver.nid} />
            <InfoItem label="Address" value={driver.address} />

            <div>
              <p className="text-xs text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge>{driver.status || 'active'}</StatusBadge>
              </div>
            </div>
          </div>
        </InfoCard>
      )}

      <InfoCard icon={Car} title={`Authorized Vehicles (${authorizedVehicles.length})`}>
        {authorizedVehicles.length === 0 ? (
          <p className="text-sm text-gray-500">
            No authorized vehicle found for this driver.
          </p>
        ) : (
          <div className="verify-authorized-list space-y-3">
            {authorizedVehicles.map((vehicle, index) => (
              <div
                key={getId(vehicle) || index}
                className="verify-authorized-driver flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {getVehiclePlate(vehicle)}
                  </p>

                  <p className="text-xs text-gray-500 truncate">
                    {vehicle.brand || 'N/A'} {vehicle.model || ''}
                  </p>
                </div>

                <StatusBadge>{vehicle.status || 'active'}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {issues.length > 0 && (
        <InfoCard icon={AlertTriangle} title={`Issues Found (${issues.length})`} danger>
          <ul className="verify-issue-list space-y-2">
            {issues.map((issue, index) => (
              <li
                key={`${issue}-${index}`}
                className="verify-issue-item flex items-start gap-2 text-sm text-red-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
    </section>
  );
}

function DriverAuthorizationCard({ driverAuthorization }) {
  return (
    <div
      className={`verify-driver-auth-card rounded-2xl border p-5 ${driverAuthorization.authorized
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
        }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`verify-driver-auth-icon w-11 h-11 rounded-xl flex items-center justify-center ${driverAuthorization.authorized ? 'bg-green-100' : 'bg-red-100'
            }`}
        >
          {driverAuthorization.authorized ? (
            <CheckCircle size={24} className="text-green-600" />
          ) : (
            <AlertTriangle size={24} className="text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg font-bold ${driverAuthorization.authorized ? 'text-green-700' : 'text-red-700'
              }`}
          >
            {driverAuthorization.authorized ? 'Driver Authorized' : 'Unauthorized Driver'}
          </h3>

          <p className="text-sm text-gray-600 mt-1">
            {driverAuthorization.message || 'Driver authorization check completed.'}
          </p>

          {driverAuthorization.driver && (
            <div className="verify-info-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <InfoItem label="Driver Name" value={driverAuthorization.driver.name} />
              <InfoItem label="Email" value={driverAuthorization.driver.email} />
              <InfoItem label="Phone" value={driverAuthorization.driver.phone} />
              <InfoItem label="NID" value={driverAuthorization.driver.nid} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationEmptyState({ mode }) {
  const isVehicleMode = mode === 'vehicle';

  return (
    <section className="verify-empty-card rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0f4c81]">
        {isVehicleMode ? <Car size={28} /> : <IdCard size={28} />}
      </div>

      <h3 className="mt-4 text-base font-bold text-gray-700">
        No verification performed yet
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
        {isVehicleMode
          ? 'Enter a vehicle registration number to check document validity. Add a driver license number to verify vehicle-driver authorization.'
          : 'Enter a driving license number to verify license validity, driver information, and authorized vehicles.'}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-3 py-1">
          BRTA registry check
        </span>

        <span className="rounded-full bg-gray-100 px-3 py-1">
          STVES assignment check
        </span>

        <span className="rounded-full bg-gray-100 px-3 py-1">
          Compliance result
        </span>
      </div>
    </section>
  );
}

function InfoCard({ icon: Icon, title, children, danger = false }) {
  return (
    <div
      className={`verify-info-card bg-white rounded-2xl border p-5 ${danger ? 'border-red-100' : 'border-gray-100'
        }`}
    >
      <div className="verify-info-card-head flex items-center gap-2 mb-5">
        <Icon size={16} className={danger ? 'text-red-600' : 'text-gray-600'} />
        <h4 className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-gray-800'}`}>
          {title}
        </h4>
      </div>

      {children}
    </div>
  );
}

const formatInfoValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatInfoValue(item))
      .filter((item) => item && item !== 'N/A')
      .join(', ') || 'N/A';
  }

  if (typeof value === 'object') {
    const addressParts = [
      value.line,
      value.area,
      value.city,
      value.district,
      value.division,
      value.country,
    ]
      .filter(Boolean)
      .map((item) => String(item).trim());

    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }

    return (
      value.name ||
      value.fullName ||
      value.driverName ||
      value.ownerName ||
      value.email ||
      value.phone ||
      value.licenseNumber ||
      value.registrationNumber ||
      'N/A'
    );
  }

  return String(value);
};

function InfoItem({ label, value }) {
  return (
    <div className="verify-info-item">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800 break-words">
        {formatInfoValue(value)}
      </p>
    </div>
  );
}

function StatusBadge({ children }) {
  return (
    <span
      className={`verify-status-badge inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
        children
      )}`}
    >
      {getStatusText(children)}
    </span>
  );
}