import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Car,
  CheckCircle,
  FileWarning,
  Plus,
  Shield,
  Users,
} from 'lucide-react';

import api from '../../lib/api';
import useStore from '../../store/useStore';
import '../../styles/OwnerDashboard.css';

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

const formatLabel = (value = '') => {
  const text = String(value || 'N/A');
  return text.charAt(0).toUpperCase() + text.slice(1);
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

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getVehicleTitle = (vehicle) => {
  const title = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim();
  return title || 'Unknown Vehicle';
};

const getVehicleOwnerId = (vehicle) => {
  return getId(vehicle?.owner) || vehicle?.ownerId || '';
};

const getVehicleStatusClass = (status) => {
  if (status === 'active') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'suspended') {
    return 'bg-orange-100 text-orange-700';
  }

  if (status === 'blacklisted') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-600';
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

const getVehicleSafetyScore = (vehicle) => {
  if (typeof vehicle?.safetyScore === 'number') {
    return Math.max(0, Math.min(100, vehicle.safetyScore));
  }

  let score = 100;

  const documentDates = [
    vehicle?.registrationExpiry,
    vehicle?.fitnessExpiry,
    vehicle?.taxTokenExpiry,
    vehicle?.routePermitExpiry,
    vehicle?.insuranceExpiry,
  ];

  documentDates.forEach((dateValue) => {
    if (isExpiredDate(dateValue)) {
      score -= 15;
    }
  });

  if (vehicle?.status && vehicle.status !== 'active') {
    score -= 30;
  }

  return Math.max(0, Math.min(100, score));
};

const getSafetyColorClass = (score) => {
  if (score >= 80) {
    return 'bg-green-500';
  }

  if (score >= 50) {
    return 'bg-yellow-500';
  }

  return 'bg-red-500';
};

const getVehicleIssueCount = (vehicle) => {
  const documentDates = [
    vehicle?.registrationExpiry,
    vehicle?.fitnessExpiry,
    vehicle?.taxTokenExpiry,
    vehicle?.routePermitExpiry,
    vehicle?.insuranceExpiry,
  ];

  let count = documentDates.filter((dateValue) => isExpiredDate(dateValue)).length;

  if (vehicle?.status && vehicle.status !== 'active') {
    count += 1;
  }

  return count;
};

const getViolationVehicleId = (violation) => {
  return getId(violation?.vehicle) || violation?.vehicleId || '';
};

const getViolationPlate = (violation) => {
  return (
    violation?.plateNumber ||
    violation?.registrationNumber ||
    violation?.vehicle?.registrationNumber ||
    violation?.vehicle?.plateNumber ||
    'N/A'
  );
};

const getViolationText = (violation) => {
  return (
    violation?.violationLabel ||
    violation?.violationType ||
    violation?.description ||
    'Traffic Violation'
  );
};

const getActiveAssignmentsForVehicle = (vehicle, assignments) => {
  const vehicleId = getId(vehicle);
  const vehiclePlate = getVehiclePlate(vehicle);

  return assignments.filter((assignment) => {
    const status = String(assignment?.status || '').toLowerCase();
    const assignmentVehicleId = assignment.vehicleId || getId(assignment.vehicle);
    const assignmentPlate =
      assignment.registrationNumber ||
      assignment.vehicleRegistrationNumber ||
      assignment.vehicle?.registrationNumber ||
      assignment.vehicle?.plateNumber ||
      '';

    const sameVehicleId =
      vehicleId &&
      assignmentVehicleId &&
      String(assignmentVehicleId) === String(vehicleId);

    const sameVehiclePlate =
      vehiclePlate &&
      vehiclePlate !== 'N/A' &&
      assignmentPlate &&
      String(assignmentPlate) === String(vehiclePlate);

    return status === 'active' && (sameVehicleId || sameVehiclePlate);
  });
};

const uniqueCount = (items) => {
  const values = items.map((item) => String(item || '')).filter(Boolean);
  return new Set(values).size;
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

export default function OwnerDashboard({ onNavigate = () => { } }) {
  const currentUser = useStore((state) => state.currentUser);
  const vehicles = useStore((state) => state.vehicles);
  const violations = useStore((state) => state.violations);
  const assignments = useStore((state) => state.assignments);
  const apiError = useStore((state) => state.apiError);
  const [localAssignments, setLocalAssignments] = useState([]);

  const currentUserId = getId(currentUser);
  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const violationList = Array.isArray(violations) ? violations : [];
  const storeAssignmentList = Array.isArray(assignments) ? assignments : [];
  const assignmentList = localAssignments.length > 0 ? localAssignments : storeAssignmentList;

  const ownerVehicles = vehicleList;
  const ownerViolations = violationList;

  const activeAssignments = assignmentList.filter((assignment) => {
    return String(assignment?.status || '').toLowerCase() === 'active';
  });

  const pendingAssignments = assignmentList.filter((assignment) => {
    return String(assignment?.status || '').toLowerCase() === 'pending_driver_approval';
  });

  const invitationAssignments = assignmentList.filter((assignment) => {
    return String(assignment?.status || '').toLowerCase() === 'invitation_pending';
  });

  const uniqueDrivers = uniqueCount(
    activeAssignments.map((assignment) => assignment.driverId || getId(assignment.driver))
  );

  const vehiclesWithIssues = ownerVehicles.filter((vehicle) => {
    return getVehicleIssueCount(vehicle) > 0;
  }).length;

  const hasVehicles = ownerVehicles.length > 0;

  const averageSafety = hasVehicles
    ? Math.round(
      ownerVehicles.reduce((sum, vehicle) => {
        return sum + getVehicleSafetyScore(vehicle);
      }, 0) / ownerVehicles.length
    )
    : null;

  const averageSafetyDisplay = averageSafety === null ? 'N/A' : averageSafety;

  const unpaidFine = ownerViolations
    .filter((violation) => violation.status !== 'paid' && violation.paymentStatus !== 'paid')
    .reduce((sum, violation) => {
      return sum + safeNumber(violation.fineAmount);
    }, 0);

  const recentVehicles = ownerVehicles.slice(0, 4);
  const recentViolations = ownerViolations.slice(0, 4);

  const summaryCards = [
    {
      label: 'My Vehicles',
      value: ownerVehicles.length,
      icon: Car,
      color: 'bg-blue-50 text-blue-600',
      note: hasVehicles ? `${vehiclesWithIssues} vehicles need attention` : 'No vehicles registered',
      page: 'my-vehicles',
    },
    {
      label: 'Assigned Drivers',
      value: uniqueDrivers,
      icon: Users,
      color: 'bg-green-50 text-green-600',
      note:
        pendingAssignments.length > 0 || invitationAssignments.length > 0
          ? `${pendingAssignments.length} pending • ${invitationAssignments.length} invitation(s)`
          : uniqueDrivers > 0
            ? 'Active assignments'
            : 'No active assignments',
      page: 'assign-drivers',
    },
    {
      label: 'Vehicle Violations',
      value: ownerViolations.length,
      icon: FileWarning,
      color: 'bg-orange-50 text-orange-600',
      note: unpaidFine > 0 ? `${formatMoney(unpaidFine)} unpaid` : 'No unpaid fines',
      page: 'owner-violations',
    },
    {
      label: 'Avg Safety Score',
      value: averageSafetyDisplay,
      icon: Shield,
      color:
        averageSafety === null
          ? 'bg-gray-50 text-gray-500'
          : averageSafety >= 80
            ? 'bg-purple-50 text-purple-600'
            : 'bg-red-50 text-red-600',
      note: hasVehicles ? 'Document compliance' : 'No vehicle data',
      page: 'my-vehicles',
    },
  ];

  const loadOwnerAssignments = async () => {
    if (typeof api.getMyAssignments !== 'function') {
      return;
    }

    try {
      const response = await api.getMyAssignments();
      setLocalAssignments(extractAssignmentsFromResponse(response));
    } catch (error) {
      console.error('Failed to load owner assignments:', error);
    }
  };

  useEffect(() => {
    loadOwnerAssignments();
  }, []);

  return (
    <div className="owner-dashboard-wrapper animate-fade-in space-y-6">
      <header className="owner-dashboard-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="owner-dashboard-header-content flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-blue-100">Welcome,</p>

            <h1 className="text-2xl font-bold mt-1">
              {currentUser?.name || 'Vehicle Owner'}
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Monitor your vehicles, assigned drivers, compliance status, and violations.
            </p>
          </div>
        </div>
      </header>

      {apiError && (
        <div className="owner-dashboard-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="owner-dashboard-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.page)}
              className="owner-dashboard-summary-card bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md text-left"
            >
              <div
                className={`owner-dashboard-summary-icon w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} />
              </div>

              <p className="text-2xl font-bold text-gray-800">{card.value}</p>

              <p className="text-xs text-gray-500 mt-1">{card.label}</p>

              <p className="text-[10px] text-gray-400 mt-1">{card.note}</p>
            </button>
          );
        })}
      </section>

      <section className="owner-dashboard-action-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('my-vehicles')}
          className="owner-dashboard-action-card bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md"
        >
          <Plus size={24} className="text-blue-500 mb-3" />
          <p className="font-semibold text-gray-800">Register Vehicle</p>
          <p className="text-xs text-gray-400 mt-1">
            Add a new vehicle under your ownership.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('assign-drivers')}
          className="owner-dashboard-action-card bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md"
        >
          <Users size={24} className="text-green-500 mb-3" />
          <p className="font-semibold text-gray-800">Assign Drivers</p>
          <p className="text-xs text-gray-400 mt-1">
            Manage authorized drivers for your vehicles.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('owner-violations')}
          className="owner-dashboard-action-card bg-white rounded-xl border border-gray-100 p-5 text-left hover:shadow-md"
        >
          <FileWarning size={24} className="text-orange-500 mb-3" />
          <p className="font-semibold text-gray-800">View Violations</p>
          <p className="text-xs text-gray-400 mt-1">
            Track vehicle violation and payment records.
          </p>
        </button>
      </section>

      <section className="owner-dashboard-main-grid grid lg:grid-cols-3 gap-6">
        <article className="owner-dashboard-vehicle-card lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="owner-dashboard-card-head flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">My Vehicles</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Latest vehicle compliance overview
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('my-vehicles')}
              className="owner-dashboard-link-button text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus size={14} />
              Manage
            </button>
          </div>

          {recentVehicles.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No vehicles registered"
              subtitle="Register your first vehicle to start tracking compliance."
              actionLabel="Register Vehicle"
              onAction={() => onNavigate('my-vehicles')}
            />
          ) : (
            <div className="owner-dashboard-vehicle-list divide-y divide-gray-50">
              {recentVehicles.map((vehicle) => {
                const safetyScore = getVehicleSafetyScore(vehicle);
                const issueCount = getVehicleIssueCount(vehicle);
                const vehicleAssignments = getActiveAssignmentsForVehicle(
                  vehicle,
                  activeAssignments
                );

                return (
                  <article
                    key={getId(vehicle) || getVehiclePlate(vehicle)}
                    className="owner-dashboard-vehicle-item p-5 hover:bg-gray-50"
                  >
                    <div className="owner-dashboard-vehicle-top flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800">
                            {getVehiclePlate(vehicle)}
                          </p>

                          <span
                            className={`owner-dashboard-status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${getVehicleStatusClass(
                              vehicle.status || 'active'
                            )}`}
                          >
                            {formatLabel(vehicle.status || 'active')}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mt-1">
                          {getVehicleTitle(vehicle)}
                          {vehicle.year ? ` (${vehicle.year})` : ''}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          {vehicle.vehicleType || 'Vehicle'} • {vehicle.color || 'Unknown color'} •{' '}
                          {vehicleAssignments.length} driver(s)
                        </p>
                      </div>

                      {issueCount > 0 ? (
                        <AlertTriangle size={22} className="text-red-500 shrink-0" />
                      ) : (
                        <CheckCircle size={22} className="text-green-500 shrink-0" />
                      )}
                    </div>

                    <div className="owner-dashboard-safety-row flex items-center gap-2 mt-4">
                      <span className="text-xs text-gray-400">Safety</span>

                      <div className="owner-dashboard-safety-track flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`owner-dashboard-safety-fill h-full rounded-full ${getSafetyColorClass(
                            safetyScore
                          )}`}
                          style={{ width: `${safetyScore}%` }}
                        />
                      </div>

                      <span className="text-xs font-bold text-gray-700">
                        {safetyScore}/100
                      </span>
                    </div>

                    <div className="owner-dashboard-doc-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                      <DocStatus label="Fitness" value={vehicle.fitnessExpiry} />
                      <DocStatus label="Tax Token" value={vehicle.taxTokenExpiry} />
                      <DocStatus label="Insurance" value={vehicle.insuranceExpiry} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="owner-dashboard-compliance-card bg-white rounded-2xl border border-gray-100 p-5">
          <div className="owner-dashboard-card-head mb-5">
            <h2 className="font-semibold text-gray-800">Compliance Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Quick status of your vehicle documents
            </p>
          </div>

          <div className="owner-dashboard-compliance-box rounded-2xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-5 text-white">
            <p className="text-xs text-blue-100">Average Safety Score</p>
            <p className="text-4xl font-bold mt-1">{averageSafetyDisplay}</p>
            <p className="text-xs text-blue-100 mt-2">
              {vehiclesWithIssues} vehicle(s) require attention.
            </p>
          </div>

          <div className="owner-dashboard-compliance-list space-y-3 mt-5">
            <ComplianceRow label="Active Vehicles" value={ownerVehicles.filter((item) => item.status === 'active').length} good />
            <ComplianceRow label="Suspended Vehicles" value={ownerVehicles.filter((item) => item.status === 'suspended').length} />
            <ComplianceRow label="Blacklisted Vehicles" value={ownerVehicles.filter((item) => item.status === 'blacklisted').length} />
            <ComplianceRow label="Unpaid Fine" value={formatMoney(unpaidFine)} />
          </div>
        </article>
      </section>

      <section className="owner-dashboard-violations-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="owner-dashboard-card-head flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Recent Vehicle Violations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              E-Challan cases linked with your vehicles
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('owner-violations')}
            className="text-xs text-blue-600 hover:underline"
          >
            View All
          </button>
        </div>

        {recentViolations.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No violations found"
            subtitle="Your vehicle violation records will appear here."
          />
        ) : (
          <div className="owner-dashboard-violation-list divide-y divide-gray-50">
            {recentViolations.map((violation) => (
              <article
                key={getId(violation) || violation.caseId}
                className="owner-dashboard-violation-item p-4 hover:bg-gray-50 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800">
                      {violation.caseId || 'N/A'}
                    </p>

                    <span
                      className={`owner-dashboard-status-badge px-2.5 py-1 rounded-full text-xs font-semibold ${getViolationStatusClass(
                        violation.status || 'pending'
                      )}`}
                    >
                      {formatLabel(violation.status || 'pending')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    {getViolationText(violation)}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {getViolationPlate(violation)} • {formatDate(violation.createdAt)}
                  </p>
                </div>

                <div className="owner-dashboard-fine-box text-right shrink-0">
                  <p className="text-xs text-gray-400">Fine</p>
                  <p className="text-base font-bold text-gray-800">
                    {formatMoney(violation.fineAmount)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DocStatus({ label, value }) {
  const expired = isExpiredDate(value);

  return (
    <div
      className={`owner-dashboard-doc-status rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 ${expired ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}
    >
      <span className="font-medium">{label}</span>
      <span>{expired ? 'Expired' : 'Valid'}</span>
    </div>
  );
}

function ComplianceRow({ label, value, good = false }) {
  return (
    <div className="owner-dashboard-compliance-row flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>

      <span className={`text-sm font-bold ${good ? 'text-green-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="owner-dashboard-empty-state p-10 text-center text-gray-400">
      <Icon size={42} className="mx-auto mb-3 opacity-30" />

      <p className="text-sm font-medium text-gray-500">{title}</p>

      <p className="text-xs mt-1">{subtitle}</p>

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="owner-dashboard-empty-button mt-4 rounded-xl bg-[#0f4c81] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}