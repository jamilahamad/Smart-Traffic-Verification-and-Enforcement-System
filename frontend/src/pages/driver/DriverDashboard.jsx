import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Car,
  CheckCircle,
  CreditCard,
  FileWarning,
  IdCard,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/DriverDashboard.css';
import api from '../../lib/api';

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || '';
};

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (value) => {
  return `৳${safeNumber(value).toLocaleString()}`;
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
  const text = String(value || 'N/A');
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

  return license.status || 'valid';
};

const isLicenseValid = (license) => {
  const status = String(getLicenseStatus(license)).toLowerCase();
  return ['valid', 'active', 'approved'].includes(status);
};

const getStatusBadgeClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (['valid', 'active', 'approved', 'paid'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }

  if (['pending', 'warning'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (['expired', 'suspended', 'blacklisted', 'revoked', 'missing', 'dismissed'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getViolationStatusClass = (status) => {
  if (status === 'pending') {
    return 'bg-orange-100 text-orange-700';
  }

  if (status === 'approved') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'dismissed') {
    return 'bg-red-100 text-red-700';
  }

  if (status === 'paid') {
    return 'bg-blue-100 text-blue-700';
  }

  return 'bg-gray-100 text-gray-600';
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

const getViolationText = (violation) => {
  return (
    violation?.violationLabel ||
    violation?.violationType ||
    violation?.description ||
    'Traffic Violation'
  );
};

const getViolationVehiclePlate = (violation) => {
  return (
    violation?.plateNumber ||
    violation?.registrationNumber ||
    violation?.vehicle?.registrationNumber ||
    violation?.vehicle?.plateNumber ||
    'N/A'
  );
};

const getPaymentStatus = (violation) => {
  if (violation?.status === 'paid') {
    return 'paid';
  }

  return violation?.paymentStatus || 'unpaid';
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
    color: vehicle?.color,
    vehicleType: vehicle?.vehicleType,
    status: vehicle?.status || 'active',
  };
};

export default function DriverDashboard({ onNavigate = () => { } }) {
  const currentUser = useStore((state) => state.currentUser);
  const licenses = useStore((state) => state.licenses);
  const violations = useStore((state) => state.violations);
  const vehicles = useStore((state) => state.vehicles);
  const assignments = useStore((state) => state.assignments);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const isLoading = useStore((state) => state.isLoading);
  const apiError = useStore((state) => state.apiError);

  const [serverViolations, setServerViolations] = useState([]);
  const [serverViolationsLoaded, setServerViolationsLoaded] = useState(false);
  const [serverAssignments, setServerAssignments] = useState([]);
  const [serverAssignmentsLoaded, setServerAssignmentsLoaded] = useState(false);;

  const extractDriverViolations = (response) => {
    const payload = response?.data || response || {};

    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.violations)) {
      return payload.violations;
    }

    if (Array.isArray(payload.data?.violations)) {
      return payload.data.violations;
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    return [];
  };

  const loadDriverDashboardViolations = async () => {
    try {
      const response = await api.getMyDriverViolations();
      const records = extractDriverViolations(response);

      setServerViolations(records);
      setServerViolationsLoaded(true);
    } catch (error) {
      console.error('Failed to load driver dashboard violations:', error);
      setServerViolationsLoaded(true);
      setServerViolations([]);
    }
  };

  const loadDriverAssignments = async () => {
    if (typeof api.getMyAssignments !== 'function') {
      return;
    }

    try {
      const response = await api.getMyAssignments();
      const records = extractAssignmentsFromResponse(response);

      setServerAssignments(records);
      setServerAssignmentsLoaded(true);
    } catch (error) {
      console.error('Failed to load driver assignments:', error);
      setServerAssignments([]);
      setServerAssignmentsLoaded(true);
    }
  };

  useEffect(() => {
    loadDriverDashboardViolations();
    loadDriverAssignments();
  }, []);

  const licenseList = Array.isArray(licenses) ? licenses : [];
  const violationList = Array.isArray(violations) ? violations : [];
  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const storeAssignmentList = Array.isArray(assignments) ? assignments : [];
  const assignmentList = serverAssignmentsLoaded ? serverAssignments : storeAssignmentList;

  const currentUserId = getId(currentUser);

  const myLicense =
    licenseList.find((license) => {
      const driverId = getId(license.driver) || license.driverId || license.userId;
      return driverId && currentUserId && String(driverId) === String(currentUserId);
    }) ||
    licenseList[0] ||
    null;

  const myViolations = useMemo(() => {
    if (serverViolationsLoaded) {
      return serverViolations;
    }

    return violationList.filter((violation) => {
      const driverId =
        getId(violation.driver) ||
        violation.driverId ||
        violation.userId ||
        violation.driverUserId ||
        '';

      const licenseNumber =
        violation.licenseNumber ||
        violation.license?.licenseNumber ||
        violation.driverLicenseNumber ||
        '';

      const driverName =
        violation.driver?.name ||
        violation.driverName ||
        violation.driver?.holderName ||
        '';

      return (
        (driverId && currentUserId && String(driverId) === String(currentUserId)) ||
        (licenseNumber &&
          myLicense?.licenseNumber &&
          String(licenseNumber).toUpperCase() ===
          String(myLicense.licenseNumber).toUpperCase()) ||
        (currentUser?.name && driverName === currentUser.name)
      );
    });
  }, [
    serverViolationsLoaded,
    serverViolations,
    violationList,
    currentUserId,
    currentUser?.name,
    myLicense?.licenseNumber,
  ]);

  const activeDriverAssignments = assignmentList.filter((assignment) => {
    const status = String(assignment?.status || '').toLowerCase();
    const assignmentDriverId = getAssignmentDriverId(assignment);
    const assignmentLicenseNumber = String(assignment?.licenseNumber || '').toUpperCase();
    const currentLicenseNumber = String(getLicenseNumber(myLicense) || '').toUpperCase();
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

  const myVehiclesFromStore = vehicleList.filter((vehicle) => {
    const assignedDrivers = Array.isArray(vehicle.assignedDrivers)
      ? vehicle.assignedDrivers
      : Array.isArray(vehicle.authorizedDrivers)
        ? vehicle.authorizedDrivers
        : [];

    return assignedDrivers.some((driver) => {
      return String(getId(driver) || driver) === String(currentUserId);
    });
  });

  const myVehicles = uniqueByKey([
    ...vehiclesFromAssignments,
    ...vehiclesFromLicense,
    ...myVehiclesFromStore,
  ]);

  const licenseStatus = getLicenseStatus(myLicense);
  const licenseValid = isLicenseValid(myLicense);
  const pendingViolations = myViolations.filter((item) => item.status === 'pending').length;
  const approvedViolations = myViolations.filter((item) => item.status === 'approved').length;
  const paidViolations = myViolations.filter(
    (item) => item.status === 'paid' || item.paymentStatus === 'paid'
  ).length;

  const totalFine = myViolations.reduce((sum, violation) => {
    return sum + safeNumber(violation.fineAmount);
  }, 0);

  const payableViolations = myViolations.filter((violation) => {
    return violation.status === 'approved' && getPaymentStatus(violation) !== 'paid';
  });

  const payableFine = payableViolations.reduce((sum, violation) => {
    return sum + safeNumber(violation.fineAmount);
  }, 0);

  const pendingReviewFine = myViolations
    .filter((violation) => {
      return violation.status === 'pending' && getPaymentStatus(violation) !== 'paid';
    })
    .reduce((sum, violation) => {
      return sum + safeNumber(violation.fineAmount);
    }, 0);

  const recentViolations = myViolations.slice(0, 4);
  const recentVehicles = myVehicles.slice(0, 3);

  const summaryCards = [
    {
      label: 'License Status',
      value: licenseValid ? 'Valid' : formatLabel(licenseStatus),
      icon: IdCard,
      color: licenseValid ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600',
      note: myLicense ? getLicenseNumber(myLicense) : 'No license found',
    },
    {
      label: 'My Violations',
      value: myViolations.length,
      icon: FileWarning,
      color: 'bg-orange-50 text-orange-600',
      note: `${pendingViolations} pending`,
    },
    {
      label: 'Assigned Vehicles',
      value: myVehicles.length,
      icon: Car,
      color: 'bg-blue-50 text-blue-600',
      note: 'Authorized to drive',
    },
    {
      label: 'Payable Fine',
      value: formatMoney(payableFine),
      icon: Banknote,
      color: payableFine > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
      note:
        pendingReviewFine > 0
          ? `${payableViolations.length} payable case • ${formatMoney(pendingReviewFine)} under review`
          : `${formatMoney(totalFine)} total fine`,
    },
  ];

  const handleRefresh = async () => {
    if (typeof fetchDashboardData === 'function') {
      await fetchDashboardData();
    }

    await loadDriverDashboardViolations();
    await loadDriverAssignments();
  };

  return (
    <div className="driver-dashboard-wrapper animate-fade-in space-y-6">
      <header className="driver-dashboard-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="driver-dashboard-header-content flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-blue-100">Welcome back,</p>

            <h1 className="text-2xl font-bold mt-1">
              {currentUser?.name || myLicense?.driverName || 'Driver'}
            </h1>

            <div className="driver-dashboard-user-meta flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm text-blue-100">
                Role: {formatLabel(currentUser?.role || 'driver')}
              </span>

              <span className="text-blue-300">•</span>

              <span className="text-sm text-blue-100">
                License: {myLicense ? getLicenseNumber(myLicense) : 'Not available'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="driver-dashboard-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {apiError && (
        <div className="driver-dashboard-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="driver-dashboard-status-card bg-white rounded-2xl border border-gray-100 p-5">
        <div className="driver-dashboard-status-content flex items-start gap-4">
          <div
            className={`driver-dashboard-status-icon w-12 h-12 rounded-xl flex items-center justify-center ${licenseValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
          >
            {licenseValid ? <ShieldCheck size={25} /> : <AlertTriangle size={25} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="driver-dashboard-status-head flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800">
                {licenseValid ? 'Your license is valid' : 'License attention required'}
              </h2>

              <span
                className={`driver-dashboard-status-badge inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                  licenseStatus
                )}`}
              >
                {formatLabel(licenseStatus)}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {myLicense
                ? `License ${getLicenseNumber(myLicense)} is linked with your STVES driver profile.`
                : 'No driving license record was found for your account.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('my-license')}
            className="driver-dashboard-view-button hidden sm:inline-flex rounded-xl bg-[#0f4c81] px-4 py-2 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98]"
          >
            View License
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('my-license')}
          className="driver-dashboard-view-button-mobile sm:hidden mt-4 w-full rounded-xl bg-[#0f4c81] px-4 py-3 text-sm font-semibold text-white"
        >
          View License
        </button>
      </section>

      <section className="driver-dashboard-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="driver-dashboard-summary-card bg-white rounded-xl border border-gray-100 hover:shadow-md"
            >
              <div
                className={`driver-dashboard-summary-icon ${card.color} flex items-center justify-center`}
              >
                <Icon size={20} />
              </div>

              <div className="driver-dashboard-summary-content min-w-0">
                <p className="driver-dashboard-summary-value">{card.value}</p>
                <p className="driver-dashboard-summary-label">{card.label}</p>
                <p className="driver-dashboard-summary-note">{card.note}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="driver-dashboard-main-grid grid lg:grid-cols-3 gap-6">
        <article className="driver-dashboard-license-card lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="driver-dashboard-card-head flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">License Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Your official driving license information
              </p>
            </div>

            <IdCard size={20} className="text-gray-300" />
          </div>

          {myLicense ? (
            <div className="driver-dashboard-info-grid grid sm:grid-cols-2 gap-4">
              <InfoItem label="License Number" value={getLicenseNumber(myLicense)} />
              <InfoItem label="License Type" value={getLicenseType(myLicense)} />
              <InfoItem label="Issue Date" value={formatDate(myLicense.issueDate)} />
              <InfoItem label="Expiry Date" value={formatDate(myLicense.expiryDate)} />
              <InfoItem label="Blood Group" value={myLicense.bloodGroup} />
              <InfoItem label="Driver Name" value={myLicense.driverName || currentUser?.name} />

              <div>
                <p className="text-xs text-gray-400">Status</p>

                <span
                  className={`driver-dashboard-status-badge inline-flex mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                    licenseStatus
                  )}`}
                >
                  {formatLabel(licenseStatus)}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-400">Compliance</p>

                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {licenseValid ? 'No issue detected' : 'Review required'}
                </p>
              </div>
            </div>
          ) : (
            <EmptyBox
              icon={IdCard}
              title="No license found"
              subtitle="Your license details will appear here once linked with your account."
            />
          )}
        </article>

        <article className="driver-dashboard-payment-card bg-white rounded-2xl border border-gray-100 p-5">
          <div className="driver-dashboard-card-head mb-5">
            <h2 className="font-semibold text-gray-800">Fine Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Payment status from E-Challan records
            </p>
          </div>

          <div className="driver-dashboard-fine-box rounded-2xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-5 text-white">
            <p className="text-xs text-blue-100">Payable Amount</p>
            <p className="text-3xl font-bold mt-1">{formatMoney(payableFine)}</p>
            <p className="text-xs text-blue-100 mt-2">
              {paidViolations} paid case(s), {approvedViolations} approved case(s)
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('my-violations')}
            className="driver-dashboard-payment-button mt-4 w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            View Violations
          </button>
        </article>
      </section>

      <section className="driver-dashboard-lists grid lg:grid-cols-2 gap-6">
        <article className="driver-dashboard-list-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="driver-dashboard-list-head flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">Recent Violations</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Latest E-Challan records
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('my-violations')}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          {recentViolations.length === 0 ? (
            <EmptyBox
              icon={CheckCircle}
              title="No violations found"
              subtitle="Your violation records will appear here."
            />
          ) : (
            <div className="driver-dashboard-list divide-y divide-gray-50">
              {recentViolations.map((violation) => {
                const status = violation.status || 'pending';

                return (
                  <div
                    key={getId(violation) || violation.caseId}
                    className="driver-dashboard-violation-item p-4 hover:bg-gray-50"
                  >
                    <div className="driver-dashboard-violation-top flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800">
                          {violation.caseId || 'N/A'}
                        </p>

                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {getViolationText(violation)}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          {getViolationVehiclePlate(violation)} • {formatDate(violation.createdAt)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`driver-dashboard-case-badge inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getViolationStatusClass(
                            status
                          )}`}
                        >
                          {formatLabel(status)}
                        </span>

                        <p className="text-sm font-bold text-gray-800 mt-1">
                          {formatMoney(violation.fineAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="driver-dashboard-list-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="driver-dashboard-list-head flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">Authorized Vehicles</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Vehicles linked to your license
              </p>
            </div>

            <Car size={20} className="text-gray-300" />
          </div>

          {recentVehicles.length === 0 ? (
            <EmptyBox
              icon={Car}
              title="No authorized vehicles"
              subtitle="Assigned vehicles will appear here."
            />
          ) : (
            <div className="driver-dashboard-list divide-y divide-gray-50">
              {recentVehicles.map((vehicle) => (
                <div
                  key={getId(vehicle) || getVehiclePlate(vehicle)}
                  className="driver-dashboard-vehicle-item p-4 hover:bg-gray-50 flex items-center justify-between gap-4"
                >
                  <div className="driver-dashboard-vehicle-left flex items-center gap-3 min-w-0">
                    <div className="driver-dashboard-vehicle-icon w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
                    className={`driver-dashboard-status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                      vehicle.status || 'active'
                    )}`}
                  >
                    {formatLabel(vehicle.status || 'active')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="driver-dashboard-info-item">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800 break-words">
        {value || 'N/A'}
      </p>
    </div>
  );
}

function EmptyBox({ icon: Icon, title, subtitle }) {
  return (
    <div className="driver-dashboard-empty-box p-8 text-center text-gray-400">
      <Icon size={38} className="mx-auto mb-3 opacity-30" />

      <p className="text-sm font-medium">{title}</p>

      <p className="text-xs mt-1">{subtitle}</p>
    </div>
  );
}