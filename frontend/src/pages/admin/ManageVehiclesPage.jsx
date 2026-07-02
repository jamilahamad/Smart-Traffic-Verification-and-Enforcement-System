import { useMemo, useState } from 'react';
import {
  Car,
  Search,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  FileCheck2,
  UsersRound,
  X,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/ManageVehiclesPage.css';

const statusFilters = ['all', 'active', 'suspended', 'blacklisted'];

const statusBadgeColors = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  blacklisted: 'bg-red-100 text-red-700',
};

const actionConfig = {
  activate: {
    status: 'active',
    title: 'Activate Vehicle',
    message: 'This vehicle will become available for normal verification and enforcement flow again.',
    buttonText: 'Activate',
    buttonClass: 'bg-green-600 hover:bg-green-700',
  },
  suspend: {
    status: 'suspended',
    title: 'Suspend Vehicle',
    message: 'This vehicle will be marked as suspended until an admin activates it again.',
    buttonText: 'Suspend',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
  },
  blacklist: {
    status: 'blacklisted',
    title: 'Blacklist Vehicle',
    message: 'This is a strict enforcement action. Use it only for serious compliance or legal issues.',
    buttonText: 'Blacklist',
    buttonClass: 'bg-red-600 hover:bg-red-700',
  },
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getVehicleId = (vehicle) => {
  return vehicle?.id || vehicle?._id || '';
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.plateNumber || vehicle?.registrationNumber || 'N/A';
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

const getSafetyColorClass = (score) => {
  const safeScore = Number(score || 0);

  if (safeScore >= 80) {
    return 'bg-green-500';
  }

  if (safeScore >= 50) {
    return 'bg-yellow-500';
  }

  return 'bg-red-500';
};

const getAssignedDriverCount = (vehicle = {}) => {
  if (Number.isFinite(Number(vehicle.assignedDriverCount))) {
    return Number(vehicle.assignedDriverCount);
  }

  if (Array.isArray(vehicle.assignedDrivers)) {
    return vehicle.assignedDrivers.length;
  }

  if (Array.isArray(vehicle.authorizedDrivers)) {
    return vehicle.authorizedDrivers.length;
  }

  if (Array.isArray(vehicle.drivers)) {
    return vehicle.drivers.length;
  }

  return 0;
};

const hasValidDocumentDate = (value) => {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const hasVehicleAttention = (vehicle = {}) => {
  const status = String(vehicle.status || 'active').toLowerCase();

  return (
    status !== 'active' ||
    isExpiredDate(vehicle.registrationExpiry) ||
    isExpiredDate(vehicle.fitnessExpiry) ||
    isExpiredDate(vehicle.taxTokenExpiry) ||
    isExpiredDate(vehicle.routePermitExpiry) ||
    isExpiredDate(vehicle.insuranceExpiry) ||
    Number(vehicle.safetyScore || 0) < 80
  );
};

const isBrtaVerifiedVehicle = (vehicle = {}) => {
  return Boolean(
    vehicle.dataSource === 'BRTA_MOCK' ||
    vehicle.brtaProvider ||
    vehicle.documents ||
    vehicle.qrCode ||
    hasValidDocumentDate(vehicle.registrationExpiry) ||
    hasValidDocumentDate(vehicle.fitnessExpiry) ||
    hasValidDocumentDate(vehicle.taxTokenExpiry) ||
    hasValidDocumentDate(vehicle.routePermitExpiry) ||
    hasValidDocumentDate(vehicle.insuranceExpiry)
  );
};

export default function ManageVehiclesPage() {
  const vehicles = useStore((state) => state.vehicles);
  const suspendVehicle = useStore((state) => state.suspendVehicle);
  const blacklistVehicle = useStore((state) => state.blacklistVehicle);
  const activateVehicle = useStore((state) => state.activateVehicle);
  const addLog = useStore((state) => state.addLog);
  const currentUser = useStore((state) => state.currentUser);
  const apiError = useStore((state) => state.apiError);

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const vehicleList = useMemo(() => {
    return Array.isArray(vehicles) ? vehicles : [];
  }, [vehicles]);

  const vehicleStats = useMemo(() => {
    const activeVehicles = vehicleList.filter((vehicle) => vehicle.status === 'active').length;
    const suspendedVehicles = vehicleList.filter((vehicle) => vehicle.status === 'suspended').length;
    const blacklistedVehicles = vehicleList.filter((vehicle) => vehicle.status === 'blacklisted').length;
    const verifiedVehicles = vehicleList.filter(isBrtaVerifiedVehicle).length;
    const attentionVehicles = vehicleList.filter(hasVehicleAttention).length;
    const averageSafety = vehicleList.length
      ? Math.round(
        vehicleList.reduce((total, vehicle) => total + Number(vehicle.safetyScore || 0), 0) /
        vehicleList.length
      )
      : 0;

    return [
      {
        label: 'BRTA Vehicle Records',
        value: vehicleList.length,
        note: `${activeVehicles} active BRTA records`,
        icon: Car,
        tone: 'blue',
      },
      {
        label: 'Verified Registry Records',
        value: verifiedVehicles,
        note: 'Matched with BRTA registry',
        icon: ShieldCheck,
        tone: 'green',
      },
      {
        label: 'Need Attention',
        value: attentionVehicles,
        note: 'Status or document issue',
        icon: AlertTriangle,
        tone: 'orange',
      },
      {
        label: 'Restricted',
        value: suspendedVehicles + blacklistedVehicles,
        note: `${suspendedVehicles} suspended, ${blacklistedVehicles} blacklisted`,
        icon: Ban,
        tone: 'red',
      },
      {
        label: 'Avg Safety',
        value: `${averageSafety}/100`,
        note: 'Current BRTA fleet score',
        icon: FileCheck2,
        tone: 'indigo',
      },
    ];
  }, [vehicleList]);

  const filteredVehicles = useMemo(() => {
    let nextVehicles =
      statusFilter === 'all'
        ? vehicleList
        : vehicleList.filter((vehicle) => vehicle.status === statusFilter);

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextVehicles;
    }

    nextVehicles = nextVehicles.filter((vehicle) => {
      return (
        String(vehicle.plateNumber || '').toLowerCase().includes(query) ||
        String(vehicle.registrationNumber || '').toLowerCase().includes(query) ||
        String(vehicle.ownerName || '').toLowerCase().includes(query) ||
        String(vehicle.brand || '').toLowerCase().includes(query) ||
        String(vehicle.model || '').toLowerCase().includes(query) ||
        String(vehicle.vehicleType || '').toLowerCase().includes(query) ||
        String(vehicle.color || '').toLowerCase().includes(query) ||
        String(vehicle.engineNumber || '').toLowerCase().includes(query) ||
        String(vehicle.chassisNumber || '').toLowerCase().includes(query)
      );
    });

    return nextVehicles;
  }, [vehicleList, searchQ, statusFilter]);

  const writeVehicleLog = ({ vehicle, action }) => {
    if (!currentUser) {
      return;
    }

    const plate = getVehiclePlate(vehicle);

    addLog({
      userId: currentUser.id || currentUser._id,
      userName: currentUser.name,
      action: `Vehicle ${action === 'activate'
        ? 'Activated'
        : action === 'suspend'
          ? 'Suspended'
          : 'Blacklisted'
        }`,
      details: `Vehicle ${plate} has been ${action === 'activate'
        ? 'activated'
        : action === 'suspend'
          ? 'suspended'
          : 'blacklisted'
        } by ${currentUser.name}.`,
      type: 'admin',
    });
  };

  const openActionConfirmation = (vehicle, action) => {
    const vehicleId = getVehicleId(vehicle);

    if (!vehicleId) {
      return;
    }

    setPendingAction({
      vehicle,
      action,
      config: actionConfig[action],
    });
  };

  const closeActionConfirmation = () => {
    setPendingAction(null);
  };

  const handleConfirmedVehicleAction = async () => {
    if (!pendingAction?.vehicle || !pendingAction?.action) {
      return;
    }

    const { vehicle, action } = pendingAction;
    const vehicleId = getVehicleId(vehicle);

    if (!vehicleId) {
      return;
    }

    try {
      setUpdatingId(vehicleId);

      if (action === 'suspend') {
        await suspendVehicle(vehicleId);
      } else if (action === 'blacklist') {
        await blacklistVehicle(vehicleId);
      } else {
        await activateVehicle(vehicleId);
      }

      writeVehicleLog({ vehicle, action });
      closeActionConfirmation();
    } finally {
      setUpdatingId('');
    }
  };

  const toggleDetails = (vehicleId) => {
    setSelectedVehicleId((current) => (current === vehicleId ? '' : vehicleId));
  };

  return (
    <div className="manage-vehicles-wrapper animate-fade-in space-y-6">
      <header className="manage-vehicles-header flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="manage-vehicles-title-block">
          <h1 className="text-2xl font-bold text-gray-800">Manage Vehicles</h1>

          <p className="text-sm text-gray-500 mt-1">
            {vehicleList.length} BRTA vehicle records monitored for verification and enforcement.
          </p>
        </div>

        <div className="manage-vehicles-source-note inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
          <ShieldCheck size={15} />
          BRTA registry records only
        </div>
      </header>

      {apiError && (
        <div className="manage-vehicles-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="manage-vehicles-stats-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {vehicleStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className={`manage-vehicles-stat-card manage-vehicles-stat-card-${stat.tone} bg-white rounded-2xl border border-gray-100 p-4`}
            >
              <div className="manage-vehicles-stat-content flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {stat.label}
                  </p>

                  <h2 className="text-2xl font-bold text-gray-800 mt-1">
                    {stat.value}
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">{stat.note}</p>
                </div>

                <div className="manage-vehicles-stat-icon rounded-2xl p-2.5">
                  <Icon size={20} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="manage-vehicles-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="manage-vehicles-filter-row flex flex-col sm:flex-row gap-3">
          <div className="manage-vehicles-search-wrap relative flex-1">
            <Search
              size={18}
              className="manage-vehicles-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search by plate, owner, brand, model, type, color, engine, or chassis..."
              className="manage-vehicles-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            />
          </div>

          <div className="manage-vehicles-status-filters flex gap-2 flex-wrap">
            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`manage-vehicles-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === status
                  ? 'bg-[#0f4c81] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {formatLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredVehicles.length === 0 ? (
        <section className="manage-vehicles-empty-card bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Car size={42} className="mx-auto mb-3 opacity-30" />

          <p className="text-sm font-medium">No vehicles found</p>

          <p className="text-xs mt-1">
            Try changing the search keyword or selected status filter.
          </p>
        </section>
      ) : (
        <section className="manage-vehicles-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {filteredVehicles.map((vehicle) => {
            const vehicleId = getVehicleId(vehicle);
            const plate = getVehiclePlate(vehicle);
            const isUpdating = updatingId === vehicleId;
            const isDetailsOpen = selectedVehicleId === vehicleId;
            const status = vehicle.status || 'active';
            const safetyScore = Number(vehicle.safetyScore || 0);
            const assignedDriverCount = getAssignedDriverCount(vehicle);
            const brtaVerified = isBrtaVerifiedVehicle(vehicle);
            const issueCount = Array.isArray(vehicle.issues) ? vehicle.issues.length : 0;

            return (
              <article
                key={vehicleId || plate}
                className="manage-vehicles-card bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="manage-vehicles-card-head flex items-start justify-between mb-3">
                  <div className="manage-vehicles-plate-block flex items-center gap-2 min-w-0">
                    <Car size={18} className="text-gray-400 shrink-0" />

                    <span className="font-bold text-gray-800 truncate">
                      {plate}
                    </span>
                  </div>

                  <span
                    className={`manage-vehicles-status-badge px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColors[status] || 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    {formatLabel(status)}
                  </span>
                </div>

                <div className="manage-vehicles-card-body space-y-1.5 text-sm">
                  <div className="manage-vehicles-badge-row flex flex-wrap items-center gap-2">
                    {brtaVerified && (
                      <span className="manage-vehicles-source-badge inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        <ShieldCheck size={12} />
                        BRTA Verified
                      </span>
                    )}

                    {vehicle.qrCode && (
                      <span className="manage-vehicles-qr-badge inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600">
                        QR Ready
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600">
                    {vehicle.brand || 'Unknown Brand'} {vehicle.model || ''}
                    {vehicle.year ? ` (${vehicle.year})` : ''}
                  </p>

                  <p className="text-gray-400 text-xs">
                    Owner: {vehicle.ownerName || 'N/A'}
                  </p>

                  <p className="text-gray-400 text-xs">
                    Type: {vehicle.vehicleType || 'N/A'} | Color:{' '}
                    {vehicle.color || 'N/A'}
                  </p>

                  <div className="manage-vehicles-safety-row flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Safety:</span>

                    <div className="manage-vehicles-safety-track flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`manage-vehicles-safety-fill h-full rounded-full ${getSafetyColorClass(
                          safetyScore
                        )}`}
                        style={{ width: `${Math.min(Math.max(safetyScore, 0), 100)}%` }}
                      />
                    </div>

                    <span className="text-xs font-medium text-gray-700">
                      {safetyScore}
                    </span>
                  </div>

                  <div className="manage-vehicles-mini-stats grid grid-cols-3 gap-2 pt-3">
                    <div className="manage-vehicles-mini-stat rounded-xl bg-gray-50 px-3 py-2">
                      <UsersRound size={14} className="text-[#0f4c81]" />
                      <p className="mt-1 text-sm font-bold text-gray-800">{assignedDriverCount}</p>
                      <p className="text-[10px] text-gray-400">Drivers</p>
                    </div>

                    <div className="manage-vehicles-mini-stat rounded-xl bg-gray-50 px-3 py-2">
                      <AlertTriangle size={14} className={issueCount > 0 ? 'text-orange-600' : 'text-[#0f4c81]'} />
                      <p className="mt-1 text-sm font-bold text-gray-800">{issueCount}</p>
                      <p className="text-[10px] text-gray-400">Issues</p>
                    </div>

                    <div className="manage-vehicles-mini-stat rounded-xl bg-gray-50 px-3 py-2">
                      <FileCheck2 size={14} className="text-[#0f4c81]" />
                      <p className="mt-1 text-sm font-bold text-gray-800">{vehicle.qrCode ? 'Yes' : 'No'}</p>
                      <p className="text-[10px] text-gray-400">QR</p>
                    </div>
                  </div>
                </div>

                <div className="manage-vehicles-actions mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDetails(vehicleId)}
                    className="manage-vehicles-details-button flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 flex items-center justify-center gap-1"
                    title={isDetailsOpen ? 'Hide vehicle document details' : 'View vehicle document details'}
                    aria-label={`${isDetailsOpen ? 'Hide' : 'View'} details for ${plate}`}
                  >
                    <Eye size={14} />
                    {isDetailsOpen ? 'Hide Details' : 'View Details'}
                  </button>

                  {status !== 'active' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => openActionConfirmation(vehicle, 'activate')}
                      className="manage-vehicles-icon-button p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                      title={`Activate ${plate}`}
                      aria-label={`Activate ${plate}`}
                    >
                      {isUpdating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                    </button>
                  )}

                  {status !== 'suspended' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => openActionConfirmation(vehicle, 'suspend')}
                      className="manage-vehicles-icon-button p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
                      title={`Suspend ${plate}`}
                      aria-label={`Suspend ${plate}`}
                    >
                      {isUpdating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <AlertTriangle size={14} />
                      )}
                    </button>
                  )}

                  {status !== 'blacklisted' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => openActionConfirmation(vehicle, 'blacklist')}
                      className="manage-vehicles-icon-button p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                      title={`Blacklist ${plate}`}
                      aria-label={`Blacklist ${plate}`}
                    >
                      {isUpdating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Ban size={14} />
                      )}
                    </button>
                  )}
                </div>

                {isDetailsOpen && (
                  <div className="manage-vehicles-detail-box mt-4 border-t border-gray-100 pt-4 text-xs animate-fade-in">
                    <div className="manage-vehicles-detail-section rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                      <p className="manage-vehicles-detail-title mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Vehicle Identity
                      </p>

                      <DetailRow label="Engine No." value={vehicle.engineNumber} />
                      <DetailRow label="Chassis No." value={vehicle.chassisNumber} />
                      <DetailRow label="Verification Source" value={brtaVerified ? 'BRTA Registry' : 'N/A'} />
                    </div>

                    <div className="manage-vehicles-detail-section mt-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                      <p className="manage-vehicles-detail-title mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Document Expiry
                      </p>

                      <DetailRow
                        label="Registration Expiry"
                        value={vehicle.registrationExpiry}
                        isDate
                      />
                      <DetailRow
                        label="Fitness Expiry"
                        value={vehicle.fitnessExpiry}
                        isDate
                      />
                      <DetailRow
                        label="Tax Token Expiry"
                        value={vehicle.taxTokenExpiry}
                        isDate
                      />
                      <DetailRow
                        label="Route Permit Expiry"
                        value={vehicle.routePermitExpiry}
                        isDate
                      />
                      <DetailRow
                        label="Insurance Expiry"
                        value={vehicle.insuranceExpiry}
                        isDate
                      />
                    </div>

                    <div className="manage-vehicles-detail-section mt-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                      <p className="manage-vehicles-detail-title mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Assignment & QR
                      </p>

                      <DetailRow
                        label="Drivers Assigned"
                        value={String(assignedDriverCount)}
                      />
                      <DetailRow
                        label="QR Status"
                        value={vehicle.qrCode ? 'Generated' : 'Not Generated'}
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {pendingAction && (
        <div className="manage-vehicles-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <section className="manage-vehicles-confirm-modal w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeActionConfirmation}
              className="manage-vehicles-confirm-close absolute right-4 top-4 rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Close confirmation"
              aria-label="Close confirmation modal"
            >
              <X size={16} />
            </button>

            <div className="manage-vehicles-confirm-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <AlertTriangle size={22} />
            </div>

            <div className="manage-vehicles-confirm-content mt-4 text-center">
              <h2 className="text-lg font-bold text-gray-800">
                {pendingAction.config.title}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to update
                {' '}
                <span className="font-semibold text-gray-700">
                  {getVehiclePlate(pendingAction.vehicle)}
                </span>
                ? {pendingAction.config.message}
              </p>
            </div>

            <div className="manage-vehicles-confirm-actions mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={closeActionConfirmation}
                className="manage-vehicles-cancel-button rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmedVehicleAction}
                disabled={Boolean(updatingId)}
                className={`manage-vehicles-confirm-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${pendingAction.config.buttonClass}`}
              >
                {updatingId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {pendingAction.config.buttonText}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, isDate = false }) {
  const displayValue = isDate ? formatDate(value) : value || 'N/A';
  const expired = isDate && isExpiredDate(value);

  return (
    <div className="manage-vehicles-detail-row flex justify-between gap-3 py-1">
      <span className="text-gray-400">{label}</span>

      <span
        className={`font-medium text-right ${expired ? 'text-red-600' : 'text-gray-700'
          }`}
      >
        {displayValue} {expired && '⚠️'}
      </span>
    </div>
  );
}