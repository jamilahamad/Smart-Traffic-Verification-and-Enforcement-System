import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  FileText,
  FileWarning,
  IdCard,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  UserRound,
  Car,
} from 'lucide-react';

import api from '../../lib/api';
import useStore from '../../store/useStore';
import { VIOLATION_TYPES } from '../../store/database';
import '../../styles/CreateCasePage.css';

const cleanPlate = (value) => {
  return String(value || '')
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^STVES-VEH:/, '');
};

const cleanLicense = (value) => {
  return String(value || '')
    .trim()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^STVES-LIC:/, '');
};

const getId = (item) => {
  return item?._id || item?.id || '';
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || '';
};

const getVehicleName = (vehicle) => {
  if (!vehicle) {
    return 'Vehicle not selected';
  }

  return `${vehicle.brand || 'Unknown'} ${vehicle.model || ''}`.trim();
};

const getDriverName = (driver, license) => {
  return (
    driver?.name ||
    driver?.driverName ||
    license?.driverName ||
    license?.holderName ||
    'Unknown Driver'
  );
};

const formatMoney = (value) => {
  return `৳${Number(value || 0).toLocaleString()}`;
};

const getViolationByCode = (code) => {
  return VIOLATION_TYPES.find((item) => item.code === code);
};

const getViolationResponsibility = (violationType = {}) => {
  const value = String(violationType.responsibility || 'owner').toLowerCase();

  if (['owner', 'driver', 'both'].includes(value)) {
    return value;
  }

  return 'owner';
};

const getResponsibilityLabel = (responsibility) => {
  if (responsibility === 'driver') {
    return 'Driver';
  }

  if (responsibility === 'both') {
    return 'Both';
  }

  return 'Owner';
};

const getResponsibilityBadgeClass = (responsibility) => {
  if (responsibility === 'driver') {
    return 'bg-blue-50 text-blue-700 border-blue-100';
  }

  if (responsibility === 'both') {
    return 'bg-purple-50 text-purple-700 border-purple-100';
  }

  return 'bg-orange-50 text-orange-700 border-orange-100';
};

const issueToViolationMap = [
  {
    words: ['registration expired', 'expired registration', 'registration'],
    code: 'REG_EXP',
  },
  {
    words: ['fitness'],
    code: 'FIT_EXP',
  },
  {
    words: ['tax token', 'tax'],
    code: 'TAX_EXP',
  },
  {
    words: ['route permit', 'route'],
    code: 'ROUTE_EXP',
  },
  {
    words: ['insurance'],
    code: 'INS_EXP',
  },
  {
    words: ['license expired', 'expired license', 'driving license'],
    code: 'DL_EXP',
  },
  {
    words: ['unauthorized', 'not authorized'],
    code: 'UNAUTH_DRV',
  },
  {
    words: ['blacklisted', 'suspended'],
    code: 'BLACKLIST',
  },
];

const getStatusBadgeClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (['active', 'valid', 'approved'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }

  if (['pending', 'warning'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (['expired', 'suspended', 'blacklisted', 'invalid'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const formatStatus = (status) => {
  const text = String(status || 'unknown');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function CreateCasePage({ verificationResult: verificationResultProp }) {
  const currentUser = useStore((state) => state.currentUser);
  const vehicles = useStore((state) => state.vehicles);
  const licenses = useStore((state) => state.licenses);
  const addLog = useStore((state) => state.addLog);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const apiError = useStore((state) => state.apiError);
  const storedVerificationResult = useStore((state) => state.verificationResult);

  const verificationResult = verificationResultProp || storedVerificationResult || null;

  const verificationVehicle = verificationResult?.vehicle || null;
  const verificationLicense = verificationResult?.license || verificationResult?.linkedLicense || null;
  const verificationDriver = verificationResult?.driver || verificationLicense?.driver || null;

  const [plateNumber, setPlateNumber] = useState(
    cleanPlate(getVehiclePlate(verificationVehicle))
  );
  const [licenseNumber, setLicenseNumber] = useState(
    cleanLicense(verificationLicense?.licenseNumber || verificationDriver?.licenseNumber || '')
  );
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCaseIds, setCreatedCaseIds] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const vehicle = useMemo(() => {
    const cleanValue = cleanPlate(plateNumber);

    if (!cleanValue) {
      return verificationVehicle || null;
    }

    const matchedVehicle = vehicles.find((item) => {
      return cleanPlate(getVehiclePlate(item)) === cleanValue;
    });

    return matchedVehicle || verificationVehicle || null;
  }, [vehicles, plateNumber, verificationVehicle]);

  const selectedLicense = useMemo(() => {
    const cleanValue = cleanLicense(licenseNumber);

    if (!cleanValue) {
      return verificationLicense || null;
    }

    const matchedLicense = licenses.find((item) => {
      return cleanLicense(item.licenseNumber) === cleanValue;
    });

    return matchedLicense || verificationLicense || null;
  }, [licenses, licenseNumber, verificationLicense]);

  useEffect(() => {
    const nextPlate = cleanPlate(getVehiclePlate(verificationVehicle));
    const nextLicense = cleanLicense(
      verificationLicense?.licenseNumber || verificationDriver?.licenseNumber || ''
    );

    if (nextPlate) {
      setPlateNumber(nextPlate);
    }

    if (nextLicense) {
      setLicenseNumber(nextLicense);
    }
  }, [verificationVehicle, verificationLicense, verificationDriver]);

  const driver = verificationDriver || selectedLicense?.driver || null;

  const totalFine = selectedViolations.reduce((sum, code) => {
    const violationType = getViolationByCode(code);
    return sum + Number(violationType?.fine || 0);
  }, 0);

  const selectedViolationDetails = selectedViolations
    .map((code) => getViolationByCode(code))
    .filter(Boolean);

  const selectedDriverLinkedViolations = selectedViolationDetails.filter((violationType) => {
    const responsibility = getViolationResponsibility(violationType);
    return responsibility === 'driver' || responsibility === 'both';
  });

  const requiresDriverLicense = selectedDriverLinkedViolations.length > 0;

  const hasVehicleInput = Boolean(cleanPlate(plateNumber));
  const hasLicenseInput = Boolean(cleanLicense(licenseNumber));
  const noViolationsSelected = selectedViolations.length === 0;
  const submitDisabled = submitting || noViolationsSelected;

  const toggleViolation = (code) => {
    setSelectedViolations((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      }

      return [...current, code];
    });
  };

  const handleAutoDetect = () => {
    const issues = verificationResult?.issues || verificationResult?.verification?.issues || [];

    if (!Array.isArray(issues) || issues.length === 0) {
      setError('No verification issues found for auto detection.');
      return;
    }

    const detected = [];

    issues.forEach((issue) => {
      const issueText =
        typeof issue === 'string'
          ? issue.toLowerCase()
          : String(issue?.message || issue?.code || '').toLowerCase();

      issueToViolationMap.forEach((item) => {
        if (item.words.some((word) => issueText.includes(word))) {
          detected.push(item.code);
        }
      });
    });

    if (selectedLicense?.status === 'expired') {
      detected.push('DL_EXP');
    }

    const uniqueDetected = [...new Set(detected)];

    if (uniqueDetected.length === 0) {
      setError('No matching violation type detected automatically.');
      return;
    }

    setError('');
    setSelectedViolations(uniqueDetected);
  };

  const validateForm = () => {
    if (!cleanPlate(plateNumber)) {
      return 'Please enter vehicle registration number.';
    }

    if (selectedViolations.length === 0) {
      return 'Please select at least one violation type.';
    }

    if (requiresDriverLicense && !cleanLicense(licenseNumber || selectedLicense?.licenseNumber)) {
      return 'Driver or both-responsibility E-Challan requires a valid driver license number. Please verify/enter the driver license first.';
    }

    if (!location.trim()) {
      return 'Please enter violation location.';
    }

    return '';
  };

  const buildEvidence = () => {
    const evidence = [];

    if (evidenceNote.trim()) {
      evidence.push({
        type: 'note',
        description: evidenceNote.trim(),
      });
    }

    if (verificationResult?.issues?.length > 0) {
      evidence.push({
        type: 'text',
        description: `Auto verification issues: ${verificationResult.issues
          .map((issue) =>
            typeof issue === 'string' ? issue : issue?.message || issue?.code || 'Issue'
          )
          .join(', ')}`,
      });
    }

    return evidence;
  };

  const buildLocationPayload = () => {
    return {
      address: location.trim(),
      city: city.trim(),
      district: city.trim(),
    };
  };

  const createSingleCase = async (violationType) => {
    const registrationNumber = cleanPlate(plateNumber);
    const finalLicenseNumber = cleanLicense(licenseNumber || selectedLicense?.licenseNumber);
    const responsibility = getViolationResponsibility(violationType);
    const shouldSendLicense = responsibility === 'driver' || responsibility === 'both';

    const payload = {
      registrationNumber,
      licenseNumber: shouldSendLicense && finalLicenseNumber ? finalLicenseNumber : undefined,
      violationType: violationType.label,
      violationCode: violationType.code,
      responsibility,
      description: `${violationType.label}${description.trim() ? `. ${description.trim()}` : ''}`,
      fineAmount: violationType.fine,
      location: buildLocationPayload(),
      evidence: buildEvidence(),
    };

    const response = await api.createViolation(payload);

    return response?.violation?.caseId || response?.caseId || 'Created';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');
    setCreatedCaseIds([]);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const confirmed = window.confirm(
      [
        'Confirm E-Challan issue?',
        '',
        `Vehicle: ${cleanPlate(plateNumber)}`,
        `Driver License: ${cleanLicense(licenseNumber || selectedLicense?.licenseNumber) || 'N/A'}`,
        `Violations: ${selectedViolationDetails.map((item) => item.label).join(', ')}`,
        `Total Fine: ${formatMoney(totalFine)}`,
        '',
        'Do you want to issue this E-Challan now?',
      ].join('\n')
    );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      const caseIds = [];

      for (const violationType of selectedViolationDetails) {
        const caseId = await createSingleCase(violationType);
        caseIds.push(caseId);
      }

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }

      if (currentUser && typeof addLog === 'function') {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'Police Officer',
          action: 'E-Challan Issued',
          details: `${caseIds.length} case(s) issued for vehicle ${cleanPlate(
            plateNumber
          )}. Total fine: ${formatMoney(totalFine)}.`,
          type: 'case',
        });
      }

      setCreatedCaseIds(caseIds);
      setSuccess(`${caseIds.length} E-Challan case(s) created successfully.`);
      setSelectedViolations([]);
      setDescription('');
      setEvidenceNote('');
    } catch (err) {
      console.error('Create E-Challan failed:', err);
      setError(err.message || 'Failed to create E-Challan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-case-wrapper animate-fade-in space-y-6">
      <header className="create-case-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning size={26} />
          Create E-Challan
        </h1>

        <p className="text-sm text-blue-100 mt-1">
          Issue digital enforcement cases for detected traffic violations.
        </p>
      </header>

      {(apiError || error) && (
        <div className="create-case-alert create-case-alert-error bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error || apiError}</p>
        </div>
      )}

      {success && (
        <div className="create-case-alert create-case-alert-success bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
          <CheckCircle size={24} className="text-green-500 shrink-0 mt-0.5" />

          <div>
            <h3 className="font-semibold text-green-700">
              E-Challan Created Successfully
            </h3>

            <p className="text-sm text-green-600 mt-1">{success}</p>

            {createdCaseIds.length > 0 && (
              <p className="text-xs text-green-600 mt-2">
                Case IDs: {createdCaseIds.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-case-form space-y-6">
        <section className="create-case-card bg-white rounded-2xl border border-gray-100 p-6">
          <div className="create-case-card-head flex items-center gap-2 mb-5">
            <Car size={17} className="text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">
              Vehicle & Driver Information
            </h2>
          </div>

          <div className="create-case-input-grid grid lg:grid-cols-2 gap-4">
            <div className="create-case-field-group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Vehicle Registration Number *
              </label>

              <div className="create-case-input-wrap relative">
                <Search
                  size={18}
                  className="create-case-input-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={plateNumber}
                  onChange={(event) => setPlateNumber(event.target.value)}
                  placeholder="Example: SYL-METRO-GA-11-1234"
                  className="create-case-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                />
              </div>
            </div>

            <div className="create-case-field-group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Driver License Number
                <span className="text-gray-400 font-normal">
                  {requiresDriverLicense ? ' *' : ' — optional'}
                </span>
              </label>

              <div className="create-case-input-wrap relative">
                <IdCard
                  size={18}
                  className="create-case-input-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(event) => setLicenseNumber(event.target.value)}
                  placeholder="Example: DL-SYL-2026-001"
                  className="create-case-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                />
              </div>
            </div>
          </div>

          <div className="create-case-resolved-grid grid md:grid-cols-3 gap-3 mt-5">
            <ResolvedInfo
              icon={Car}
              label="Vehicle"
              value={
                !hasVehicleInput
                  ? 'Waiting for vehicle number'
                  : vehicle
                    ? getVehicleName(vehicle)
                    : 'Vehicle not found'
              }
              subValue={
                !hasVehicleInput
                  ? 'Enter registration number to prepare challan'
                  : vehicle
                    ? getVehiclePlate(vehicle)
                    : cleanPlate(plateNumber)
              }
              status={hasVehicleInput ? vehicle?.status : undefined}
            />

            <ResolvedInfo
              icon={UserRound}
              label="Driver"
              value={
                !hasLicenseInput
                  ? 'Optional license not provided'
                  : getDriverName(driver, selectedLicense)
              }
              subValue={
                !hasLicenseInput
                  ? 'Add license to link driver details'
                  : selectedLicense?.licenseNumber || cleanLicense(licenseNumber) || 'N/A'
              }
              status={hasLicenseInput ? selectedLicense?.status : undefined}
            />

            <ResolvedInfo
              icon={ShieldAlert}
              label="Verification"
              value={
                verificationResult
                  ? 'Verification data available'
                  : hasVehicleInput || hasLicenseInput
                    ? 'Manual case entry'
                    : 'Not checked yet'
              }
              subValue={
                verificationResult?.isCompliant === false
                  ? 'Issues detected from verification'
                  : verificationResult
                    ? 'Officer review required'
                    : 'Use Verify page first for auto-filled case details'
              }
              status={
                verificationResult?.isCompliant === false
                  ? 'suspended'
                  : verificationResult
                    ? 'pending'
                    : undefined
              }
            />
          </div>
        </section>

        <section className="create-case-card bg-white rounded-2xl border border-gray-100 p-6">
          <div className="create-case-violation-head flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={17} className="text-gray-500" />
              <h2 className="text-sm font-bold text-gray-800">Violation Type(s)</h2>
            </div>

            {verificationResult?.issues?.length > 0 && (
              <button
                type="button"
                onClick={handleAutoDetect}
                className="create-case-auto-button px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-xs font-semibold"
              >
                ⚡ Auto-detect
              </button>
            )}
          </div>

          <div className="create-case-violation-grid grid sm:grid-cols-2 gap-3">
            {VIOLATION_TYPES.map((violationType) => {
              const selected = selectedViolations.includes(violationType.code);

              return (
                <label
                  key={violationType.code}
                  className={`create-case-violation-option flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${selected
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleViolation(violationType.code)}
                    className="create-case-checkbox w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        {violationType.label}
                      </p>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${getResponsibilityBadgeClass(
                          getViolationResponsibility(violationType)
                        )}`}
                      >
                        {getResponsibilityLabel(getViolationResponsibility(violationType))}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">
                      Code: {violationType.code} • Fine: {formatMoney(violationType.fine)}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="create-case-card bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="create-case-card-head flex items-center gap-2">
            <FileText size={17} className="text-gray-500" />
            <h2 className="text-sm font-bold text-gray-800">Case Details</h2>
          </div>

          <div className="create-case-input-grid grid lg:grid-cols-2 gap-4">
            <div className="create-case-field-group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Location of Violation *
              </label>

              <div className="create-case-input-wrap relative">
                <MapPin
                  size={18}
                  className="create-case-input-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Example: Zindabazar Point"
                  className="create-case-input w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
                />
              </div>
            </div>

            <div className="create-case-field-group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City / District
              </label>

              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Example: Sylhet"
                className="create-case-input w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
              />
            </div>
          </div>

          <div className="create-case-field-group">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Write extra notes about the incident..."
              className="create-case-textarea w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81] resize-none"
            />
          </div>

          <div className="create-case-field-group">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Evidence Note
            </label>

            <textarea
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              rows={2}
              placeholder="Example: Photo captured by officer device, manual observation, witness note..."
              className="create-case-textarea w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81] resize-none"
            />
          </div>
        </section>

        {selectedViolations.length > 0 && (
          <section className="create-case-summary bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
            <h2 className="font-semibold mb-4">Case Summary</h2>

            <div className="create-case-summary-grid grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-blue-200">Total Violations</p>
                <p className="text-2xl font-bold">{selectedViolations.length}</p>
              </div>

              <div>
                <p className="text-xs text-blue-200">Total Fine</p>
                <p className="text-2xl font-bold">{formatMoney(totalFine)}</p>
              </div>

              <div>
                <p className="text-xs text-blue-200">Officer</p>
                <p className="text-sm font-semibold">
                  {currentUser?.name || 'Police Officer'}
                </p>
                <p className="text-xs text-blue-200">
                  Badge: {currentUser?.badge || 'N/A'}
                </p>
              </div>
            </div>

            <div className="create-case-summary-list flex flex-wrap gap-2">
              {selectedViolationDetails.map((item) => (
                <span
                  key={item.code}
                  className="create-case-summary-chip bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </section>
        )}

        <button
          type="submit"
          disabled={submitDisabled}
          className={`create-case-submit-button w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm ${noViolationsSelected
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-60'
            }`}
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <FileWarning size={18} />
          )}

          {submitting
            ? 'Creating E-Challan...'
            : noViolationsSelected
              ? 'Select violation to continue'
              : `Issue E-Challan (${selectedViolations.length} violation${selectedViolations.length !== 1 ? 's' : ''
              } • ${formatMoney(totalFine)})`}
        </button>
      </form>
    </div>
  );
}

function ResolvedInfo({ icon: Icon, label, value, subValue, status }) {
  return (
    <article className="create-case-resolved-card rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="create-case-resolved-icon w-9 h-9 rounded-lg bg-white text-[#0f4c81] flex items-center justify-center">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{subValue}</p>

          {status && (
            <span
              className={`create-case-status-badge inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeClass(
                status
              )}`}
            >
              {formatStatus(status)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}