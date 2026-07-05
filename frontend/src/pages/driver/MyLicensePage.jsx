import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle,
  Clock,
  FileText,
  IdCard,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import useStore from '../../store/useStore';
import '../../styles/MyLicensePage.css';

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || '';
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10) || 'N/A';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
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

const getDaysLeft = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const difference = date.getTime() - today.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
};

const getLicenseNumber = (license) => {
  return license?.licenseNumber || license?.number || 'N/A';
};

const getLicenseType = (license) => {
  return license?.licenseType || license?.licenseClass || license?.category || 'N/A';
};

const getLicenseStatus = (license) => {
  if (!license) {
    return 'missing';
  }

  if (isExpiredDate(license.expiryDate || license.expiry || license.validTill)) {
    return 'expired';
  }

  return license.status || 'active';
};

const isLicenseValid = (license) => {
  const status = String(getLicenseStatus(license)).toLowerCase();
  return ['active', 'valid', 'approved'].includes(status);
};

const getStatusBadgeClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (['active', 'valid', 'approved'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }

  if (['submitted', 'under_review', 'pending', 'warning'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (['expired', 'suspended', 'blacklisted', 'revoked', 'missing', 'rejected'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getRenewalActionLabel = (status = '') => {
  const value = String(status || '').toLowerCase();

  if (value === 'submitted') return 'Proof submitted';
  if (value === 'under_review') return 'Proof under review';
  if (value === 'approved') return 'Renewal approved';
  if (value === 'rejected') return 'Renewal rejected';

  return 'Submit Renewal Proof';
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getVehicleTitle = (vehicle) => {
  if (!vehicle) {
    return 'N/A';
  }

  const title = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
  return title || getVehiclePlate(vehicle);
};

const uniqueByKey = (items) => {
  const map = new Map();

  items.forEach((item) => {
    if (!item) {
      return;
    }

    const key = getId(item) || item.registrationNumber || item.plateNumber || JSON.stringify(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
};

const extractRenewalRequests = (response) => {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.requests)) {
    return payload.requests;
  }

  if (Array.isArray(payload.data?.requests)) {
    return payload.data.requests;
  }

  return [];
};

const extractAssignmentRequests = (response) => {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.requests)) {
    return payload.requests;
  }

  if (Array.isArray(payload.data?.requests)) {
    return payload.data.requests;
  }

  return [];
};

const extractAssignmentsFromResponse = (response) => {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.assignments)) {
    return payload.assignments;
  }

  if (Array.isArray(payload.data?.assignments)) {
    return payload.data.assignments;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const getAssignmentDriverId = (assignment) => {
  return getId(assignment?.driver) || assignment?.driverId || '';
};

const getAssignmentVehicle = (assignment) => {
  const vehicle =
    typeof assignment?.vehicle === 'object' && assignment.vehicle
      ? assignment.vehicle
      : {};

  return {
    ...vehicle,
    _id: getId(vehicle) || getId(assignment?.vehicle) || assignment?.registrationNumber,
    registrationNumber:
      assignment?.registrationNumber ||
      vehicle?.registrationNumber ||
      vehicle?.plateNumber ||
      'N/A',
    brand: vehicle?.brand,
    model: vehicle?.model,
    status: assignment?.status || vehicle?.status || 'active',
  };
};

const getNextYearDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 3);
  return date.toISOString().slice(0, 10);
};

export default function MyLicensePage() {
  const currentUser = useStore((state) => state.currentUser);
  const licenses = useStore((state) => state.licenses);
  const vehicles = useStore((state) => state.vehicles);
  const assignments = useStore((state) => state.assignments);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const apiError = useStore((state) => state.apiError);

  const [renewalRequests, setRenewalRequests] = useState([]);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalError, setRenewalError] = useState('');
  const [renewalSuccess, setRenewalSuccess] = useState('');

  const [assignmentRequests, setAssignmentRequests] = useState([]);
  const [assignmentRequestLoading, setAssignmentRequestLoading] = useState(false);
  const [assignmentRequestActionId, setAssignmentRequestActionId] = useState('');
  const [assignmentRequestError, setAssignmentRequestError] = useState('');
  const [assignmentRequestSuccess, setAssignmentRequestSuccess] = useState('');
  const [localAssignments, setLocalAssignments] = useState([]);

  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    proofType: 'brta_receipt',
    proofReference: '',
    proofNote: '',
    requestedExpiryDate: getNextYearDate(),
  });

  const licenseList = Array.isArray(licenses) ? licenses : [];
  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const storeAssignmentList = Array.isArray(assignments) ? assignments : [];
  const assignmentList = localAssignments.length > 0 ? localAssignments : storeAssignmentList;
  const currentUserId = getId(currentUser);

  const myLicense =
    licenseList.find((license) => {
      const driverId = getId(license.driver) || license.driverId || license.userId;
      return driverId && currentUserId && String(driverId) === String(currentUserId);
    }) ||
    licenseList[0] ||
    null;

  const licenseNumber = getLicenseNumber(myLicense);

  const latestRenewalRequest =
    renewalRequests.find((request) => {
      return String(request.licenseNumber || '').toUpperCase() === String(licenseNumber).toUpperCase();
    }) ||
    renewalRequests[0] ||
    null;

  const renewalStatus = String(latestRenewalRequest?.status || '').toLowerCase();

  const renewalLocked = ['submitted', 'under_review'].includes(renewalStatus);
  const renewalActionLabel = getRenewalActionLabel(renewalStatus);

  const activeDriverAssignments = assignmentList.filter((assignment) => {
    const status = String(assignment?.status || '').toLowerCase();
    const assignmentDriverId = getAssignmentDriverId(assignment);
    const assignmentLicenseNumber = String(assignment?.licenseNumber || '').toUpperCase();
    const currentLicenseNumber = String(licenseNumber || '').toUpperCase();
    const assignmentVehicle = getAssignmentVehicle(assignment);
    const hasVehicle = getVehiclePlate(assignmentVehicle) !== 'N/A';

    return (
      status === 'active' &&
      hasVehicle &&
      (
        String(assignmentDriverId) === String(currentUserId) ||
        Boolean(currentLicenseNumber && assignmentLicenseNumber === currentLicenseNumber)
      )
    );
  });

  const vehiclesFromAssignments = activeDriverAssignments.map((assignment) => {
    return getAssignmentVehicle(assignment);
  });

  const vehiclesFromLicense = Array.isArray(myLicense?.authorizedVehicles)
    ? myLicense.authorizedVehicles
    : Array.isArray(myLicense?.assignedVehicles)
      ? myLicense.assignedVehicles
      : [];

  const vehiclesFromStore = vehicleList.filter((vehicle) => {
    const assignedDrivers = Array.isArray(vehicle.assignedDrivers)
      ? vehicle.assignedDrivers
      : Array.isArray(vehicle.authorizedDrivers)
        ? vehicle.authorizedDrivers
        : [];

    return assignedDrivers.some((driver) => {
      return String(getId(driver) || driver) === String(currentUserId);
    });
  });

  const authorizedVehicles = uniqueByKey([
    ...vehiclesFromAssignments,
    ...vehiclesFromLicense,
    ...vehiclesFromStore,
  ]);

  const status = getLicenseStatus(myLicense);
  const valid = isLicenseValid(myLicense);
  const expiryDate = myLicense?.expiryDate || myLicense?.expiry || myLicense?.validTill;
  const daysLeft = getDaysLeft(expiryDate);

  const loadRenewalRequests = async () => {
    if (typeof api.getMyRenewalRequests !== 'function') {
      return;
    }

    try {
      const response = await api.getMyRenewalRequests();
      setRenewalRequests(extractRenewalRequests(response));
    } catch (error) {
      console.error('Failed to load renewal requests:', error);
    }
  };

  const loadAssignmentRequests = async () => {
    if (typeof api.getMyAssignmentRequests !== 'function') {
      return;
    }

    try {
      setAssignmentRequestLoading(true);
      const response = await api.getMyAssignmentRequests();
      setAssignmentRequests(extractAssignmentRequests(response));
    } catch (error) {
      console.error('Failed to load assignment requests:', error);
      setAssignmentRequests([]);
    } finally {
      setAssignmentRequestLoading(false);
    }
  };

  const loadMyAssignments = async () => {
    if (typeof api.getMyAssignments !== 'function') {
      return;
    }

    try {
      const response = await api.getMyAssignments();
      setLocalAssignments(extractAssignmentsFromResponse(response));
    } catch (error) {
      console.error('Failed to load my assignments:', error);
      setLocalAssignments([]);
    }
  };

  useEffect(() => {
    loadRenewalRequests();
    loadAssignmentRequests();
    loadMyAssignments();
  }, []);

  const handleRenewalInputChange = (event) => {
    const { name, value } = event.target;

    setRenewalForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmitRenewalProof = async (event) => {
    event.preventDefault();

    setRenewalError('');
    setRenewalSuccess('');

    if (!renewalForm.proofReference.trim()) {
      setRenewalError('Proof reference is required.');
      return;
    }

    if (!renewalForm.requestedExpiryDate) {
      setRenewalError('Requested expiry date is required.');
      return;
    }

    setRenewalLoading(true);

    try {
      const payload = {
        licenseId: myLicense?.appLicenseId || getId(myLicense),
        licenseNumber,
        proofType: renewalForm.proofType,
        proofReference: renewalForm.proofReference.trim(),
        proofNote: renewalForm.proofNote.trim(),
        requestedExpiryDate: renewalForm.requestedExpiryDate,
      };

      await api.submitLicenseRenewalProof(payload);

      setRenewalSuccess('Renewal proof submitted successfully. Waiting for admin review.');
      setShowRenewalForm(false);
      setRenewalForm({
        proofType: 'brta_receipt',
        proofReference: '',
        proofNote: '',
        requestedExpiryDate: getNextYearDate(),
      });

      await loadRenewalRequests();

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }
    } catch (error) {
      setRenewalError(error?.message || 'Failed to submit renewal proof.');
    } finally {
      setRenewalLoading(false);
    }
  };

  const handleAssignmentResponse = async (assignmentId, action) => {
    if (!assignmentId) {
      setAssignmentRequestError('Assignment request ID not found.');
      return;
    }

    try {
      setAssignmentRequestActionId(assignmentId);
      setAssignmentRequestError('');
      setAssignmentRequestSuccess('');

      await api.respondToAssignmentRequest(assignmentId, { action });

      setAssignmentRequestSuccess(
        action === 'accept'
          ? 'Assignment request accepted successfully.'
          : 'Assignment request rejected successfully.'
      );

      await loadAssignmentRequests();
      await loadMyAssignments();

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Assignment response failed:', error);
      setAssignmentRequestError(
        error?.message || 'Failed to respond to assignment request.'
      );
    } finally {
      setAssignmentRequestActionId('');
    }
  };

  return (
    <div className="my-license-wrapper animate-fade-in space-y-6">
      <header className="my-license-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="my-license-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IdCard size={26} />
              My Driving License
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              View your official license details, expiry status, and authorized vehicles.
            </p>
          </div>
        </div>
      </header>

      {apiError && (
        <div className="my-license-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      {renewalError && (
        <div className="my-license-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {renewalError}
        </div>
      )}

      {renewalSuccess && (
        <div className="my-license-success bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          {renewalSuccess}
        </div>
      )}

      {assignmentRequestError && (
        <div className="my-license-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {assignmentRequestError}
        </div>
      )}

      {assignmentRequestSuccess && (
        <div className="my-license-success bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          {assignmentRequestSuccess}
        </div>
      )}

      {!myLicense ? (
        <section className="my-license-empty-card bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <IdCard size={48} className="mx-auto mb-4 opacity-30" />

          <h2 className="text-base font-semibold text-gray-600">No license found</h2>

          <p className="text-sm mt-2 max-w-md mx-auto">
            Your driving license information will appear here after the system admin links a license
            with your driver account.
          </p>
        </section>
      ) : (
        <>
          <section
            className={`my-license-status-card rounded-2xl border p-5 ${valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
          >
            <div className="my-license-status-content flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className={`my-license-status-icon w-12 h-12 rounded-xl flex items-center justify-center ${valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}
                >
                  {valid ? <ShieldCheck size={26} /> : <AlertTriangle size={26} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="my-license-status-head flex items-center gap-2 flex-wrap">
                    <h2
                      className={`text-lg font-bold ${valid ? 'text-green-700' : 'text-red-700'
                        }`}
                    >
                      {valid ? 'License is valid' : 'License needs attention'}
                    </h2>

                    <span
                      className={`my-license-status-badge inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                        status
                      )}`}
                    >
                      {formatLabel(status)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    License Number: {licenseNumber}
                  </p>

                  {daysLeft !== null && (
                    <p className="text-xs text-gray-500 mt-2">
                      {daysLeft >= 0
                        ? `${daysLeft} day(s) remaining before expiry.`
                        : `Expired ${Math.abs(daysLeft)} day(s) ago.`}
                    </p>
                  )}

                  {latestRenewalRequest && (
                    <p className="text-xs text-gray-500 mt-2">
                      Renewal request:{' '}
                      <span
                        className={`font-semibold ${renewalStatus === 'approved'
                          ? 'text-green-600'
                          : renewalStatus === 'rejected'
                            ? 'text-red-600'
                            : 'text-orange-600'
                          }`}
                      >
                        {formatLabel(latestRenewalRequest.status)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {!valid && (
                <div className="my-license-renewal-action shrink-0">
                  {renewalLocked ? (
                    <div className="rounded-xl bg-white/70 border border-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                      {renewalActionLabel}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRenewalError('');
                        setRenewalSuccess('');
                        setShowRenewalForm(true);
                      }}
                      className="my-license-renew-button bg-[#0f4c81] hover:bg-[#0b3f6c] text-white rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <FileText size={16} />
                      Submit Renewal Proof
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="my-license-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="my-license-card-top bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f4c81] p-6 text-white">
              <div className="my-license-card-brand flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-blue-200 uppercase tracking-wider">
                    Smart Traffic Verification & Enforcement System
                  </p>

                  <h2 className="text-xl font-bold mt-2">Digital Driving License</h2>
                </div>

                <div className="my-license-card-icon w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <IdCard size={26} />
                </div>
              </div>

              <div className="my-license-card-number mt-8">
                <p className="text-xs text-blue-200">License Number</p>
                <p className="text-2xl font-bold tracking-wide mt-1">
                  {licenseNumber}
                </p>
              </div>
            </div>

            <div className="my-license-card-body p-6">
              <div className="my-license-info-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoItem label="Driver Name" value={myLicense.driverName || currentUser?.name} />
                <InfoItem label="Email" value={currentUser?.email || myLicense.email} />
                <InfoItem label="Phone" value={currentUser?.phone || myLicense.phone} />
                <InfoItem label="NID" value={currentUser?.nid || myLicense.nid} />
                <InfoItem label="License Type" value={getLicenseType(myLicense)} />
                <InfoItem label="Blood Group" value={myLicense.bloodGroup} />
                <InfoItem label="Date of Birth" value={formatDate(myLicense.dateOfBirth)} />
                <InfoItem label="Issue Date" value={formatDate(myLicense.issueDate)} />
                <InfoItem label="Expiry Date" value={formatDate(expiryDate)} />

                <div>
                  <p className="text-xs text-gray-400">Current Status</p>

                  <span
                    className={`my-license-status-badge inline-flex mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                      status
                    )}`}
                  >
                    {formatLabel(status)}
                  </span>
                </div>

                <InfoItem label="Address" value={myLicense.address || currentUser?.address} />
                <InfoItem label="Issuing Authority" value={myLicense.issuingAuthority || 'BRTA'} />
              </div>
            </div>
          </section>

          <section className="my-license-expiry-grid grid md:grid-cols-3 gap-4">
            <StatusTile
              icon={CalendarDays}
              label="Issue Date"
              value={formatDate(myLicense.issueDate)}
              status="Issued"
              good
            />

            <StatusTile
              icon={Clock}
              label="Expiry Date"
              value={formatDate(expiryDate)}
              status={daysLeft !== null && daysLeft < 0 ? 'Expired' : 'Valid'}
              good={daysLeft === null || daysLeft >= 0}
            />

            <StatusTile
              icon={valid ? CheckCircle : XCircle}
              label="Compliance"
              value={valid ? 'Clear' : 'Attention Required'}
              status={formatLabel(status)}
              good={valid}
            />
          </section>

          <section className="my-license-requests-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="my-license-section-head flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <UserRound size={18} />
                  Assignment Requests
                </h2>

                <p className="text-xs text-gray-400 mt-0.5">
                  Review owner requests before becoming an authorized driver.
                </p>
              </div>

              <span className="my-license-count-badge bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                {assignmentRequests.length}
              </span>
            </div>

            {assignmentRequestLoading ? (
              <div className="p-8 text-center text-gray-400">
                <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-50" />
                <p className="text-sm font-medium">Loading assignment requests...</p>
              </div>
            ) : assignmentRequests.length === 0 ? (
              <div className="my-license-empty-box p-10 text-center text-gray-400">
                <UserRound size={40} className="mx-auto mb-3 opacity-30" />

                <p className="text-sm font-medium">No pending assignment requests</p>

                <p className="text-xs mt-1">
                  Owner requests will appear here for your approval.
                </p>
              </div>
            ) : (
              <div className="my-license-request-list divide-y divide-gray-50">
                {assignmentRequests.map((request) => {
                  const requestId = getId(request);
                  const isResponding = assignmentRequestActionId === requestId;

                  return (
                    <article
                      key={requestId}
                      className="my-license-request-item p-5 hover:bg-gray-50"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-800">
                              {request.registrationNumber || getVehiclePlate(request.vehicle)}
                            </h3>

                            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-semibold text-yellow-700">
                              {formatLabel(request.status || 'pending_driver_approval')}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-gray-500">
                            Owner: {request.owner?.name || 'Vehicle Owner'}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            License: {request.licenseNumber || licenseNumber}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Start Date: {formatDate(request.startDate || request.createdAt)}
                          </p>

                          {(request.requestNote || request.notes) && (
                            <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
                              {request.requestNote || request.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAssignmentResponse(requestId, 'accept')}
                            disabled={isResponding}
                            className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
                          >
                            {isResponding ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            Accept
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAssignmentResponse(requestId, 'reject')}
                            disabled={isResponding}
                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 inline-flex items-center gap-2"
                          >
                            {isResponding ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="my-license-vehicles-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="my-license-section-head flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Car size={18} />
                  Current Authorized Vehicles
                </h2>

                <p className="text-xs text-gray-400 mt-0.5">
                  Vehicles currently assigned by an owner or admin. Violation history may still appear based on your driving license.
                </p>
              </div>

              <span className="my-license-count-badge bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                {authorizedVehicles.length}
              </span>
            </div>

            {authorizedVehicles.length === 0 ? (
              <div className="my-license-empty-box p-10 text-center text-gray-400">
                <Car size={40} className="mx-auto mb-3 opacity-30" />

                <p className="text-sm font-medium">No active vehicle assignments</p>

                <p className="text-xs mt-1">
                  Current vehicle assignments will appear here once added by an owner or admin.
                </p>
              </div>
            ) : (
              <div className="my-license-vehicle-list divide-y divide-gray-50">
                {authorizedVehicles.map((vehicle) => (
                  <article
                    key={getId(vehicle) || getVehiclePlate(vehicle)}
                    className="my-license-vehicle-item p-4 hover:bg-gray-50 flex items-center justify-between gap-4"
                  >
                    <div className="my-license-vehicle-left flex items-center gap-3 min-w-0">
                      <div className="my-license-vehicle-icon w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Car size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {getVehiclePlate(vehicle)}
                        </p>

                        <p className="text-xs text-gray-500 truncate">
                          {getVehicleTitle(vehicle)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`my-license-status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                        vehicle.status || 'active'
                      )}`}
                    >
                      {formatLabel(vehicle.status || 'active')}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="my-license-owner-card bg-white rounded-2xl border border-gray-100 p-5">
            <div className="my-license-section-head-inline flex items-center gap-2 mb-5">
              <UserRound size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-800">Profile Summary</h2>
            </div>

            <div className="my-license-info-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <InfoItem label="Name" value={currentUser?.name || myLicense.driverName} />
              <InfoItem label="Email" value={currentUser?.email} />
              <InfoItem label="Phone" value={currentUser?.phone} />
              <InfoItem label="Role" value={formatLabel(currentUser?.role || 'driver')} />
            </div>
          </section>
        </>
      )}

      {showRenewalForm && (
        <div className="my-license-modal-overlay fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
          <section className="my-license-modal bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="my-license-modal-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] text-white px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={22} />
                  Submit Renewal Proof
                </h2>

                <p className="text-sm text-blue-100 mt-1">
                  Submit BRTA renewal proof for {licenseNumber}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRenewalForm(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRenewalProof} className="my-license-modal-body p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Proof Type
                </label>

                <select
                  name="proofType"
                  value={renewalForm.proofType}
                  onChange={handleRenewalInputChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f4c81]"
                >
                  <option value="brta_receipt">BRTA Receipt</option>
                  <option value="renewal_application">Renewal Application</option>
                  <option value="digital_slip">Digital Slip</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Proof Reference *
                </label>

                <input
                  name="proofReference"
                  value={renewalForm.proofReference}
                  onChange={handleRenewalInputChange}
                  placeholder="Example: BRTA-RENEW-2026-001"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f4c81]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Requested New Expiry Date *
                </label>

                <input
                  type="date"
                  name="requestedExpiryDate"
                  value={renewalForm.requestedExpiryDate}
                  onChange={handleRenewalInputChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f4c81]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note
                </label>

                <textarea
                  name="proofNote"
                  value={renewalForm.proofNote}
                  onChange={handleRenewalInputChange}
                  rows={4}
                  placeholder="Write short renewal proof details..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f4c81] resize-none"
                />
              </div>

              <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-xs text-orange-700">
                Proof submit korlei license active hobe na. Admin/BRTA verification approve korle
                license valid hobe.
              </div>

              <div className="my-license-modal-actions flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewalForm(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={renewalLoading}
                  className="rounded-xl bg-[#0f4c81] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0b3f6c] disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {renewalLoading && <RefreshCw size={16} className="animate-spin" />}
                  Submit Proof
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="my-license-info-item">
      <p className="text-xs text-gray-400">{label}</p>

      <p className="mt-1 text-sm font-semibold text-gray-800 break-words">
        {value || 'N/A'}
      </p>
    </div>
  );
}

function StatusTile({ icon: Icon, label, value, status, good }) {
  return (
    <article className="my-license-status-tile bg-white rounded-2xl border border-gray-100 p-5">
      <div
        className={`my-license-tile-icon w-10 h-10 rounded-xl flex items-center justify-center ${good ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
      >
        <Icon size={20} />
      </div>

      <p className="text-xs text-gray-400 mt-4">{label}</p>

      <p className="text-lg font-bold text-gray-800 mt-1">{value}</p>

      <p className={`text-xs font-semibold mt-1 ${good ? 'text-green-600' : 'text-red-600'}`}>
        {status}
      </p>
    </article>
  );
}