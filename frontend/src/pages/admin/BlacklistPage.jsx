import { useMemo, useState } from 'react';
import {
  ShieldAlert,
  Car,
  Ban,
  CheckCircle,
  AlertTriangle,
  Search,
  Loader2,
  Users,
  X,
  ShieldCheck,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/BlacklistPage.css';

const tabOptions = [
  {
    id: 'vehicles',
    label: 'Vehicles',
    icon: Car,
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
  },
];

const statusFilters = ['all', 'active', 'suspended', 'blacklisted'];

const statusBadgeColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-orange-100 text-orange-700',
  blacklisted: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-blue-100 text-blue-700',
};

const roleBadgeColors = {
  admin: 'bg-red-100 text-red-700',
  police: 'bg-blue-100 text-blue-700',
  driver: 'bg-green-100 text-green-700',
  owner: 'bg-purple-100 text-purple-700',
};

const actionConfig = {
  vehicle: {
    active: {
      title: 'Activate Vehicle',
      message: 'This vehicle will return to normal verification and enforcement flow.',
      buttonText: 'Activate',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    suspended: {
      title: 'Suspend Vehicle',
      message: 'This vehicle will be temporarily restricted until an admin activates it again.',
      buttonText: 'Suspend',
      buttonClass: 'bg-orange-600 hover:bg-orange-700',
    },
    blacklisted: {
      title: 'Blacklist Vehicle',
      message: 'This is a strict enforcement action for serious compliance or legal issues.',
      buttonText: 'Blacklist',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
  },
  user: {
    active: {
      title: 'Activate User',
      message: 'This user will be able to access the system again.',
      buttonText: 'Activate',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    suspended: {
      title: 'Suspend User',
      message: 'This user will be blocked temporarily until an admin activates the account again.',
      buttonText: 'Suspend',
      buttonClass: 'bg-orange-600 hover:bg-orange-700',
    },
    blacklisted: {
      title: 'Blacklist User',
      message: 'This is a strong restriction. Use it only for serious account abuse or security concerns.',
      buttonText: 'Blacklist',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
  },
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A');

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getVehicleId = (vehicle) => {
  return vehicle?.id || vehicle?._id || '';
};

const getUserId = (user) => {
  return user?.id || user?._id || '';
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.plateNumber || vehicle?.registrationNumber || 'N/A';
};

const getSafetyColorClass = (score) => {
  const safeScore = Number(score || 0);

  if (safeScore >= 80) {
    return 'text-green-600';
  }

  if (safeScore >= 50) {
    return 'text-yellow-600';
  }

  return 'text-red-600';
};

const getEntityLabel = (pendingAction) => {
  if (!pendingAction) return '';

  if (pendingAction.entityType === 'vehicle') {
    return getVehiclePlate(pendingAction.entity);
  }

  return pendingAction.entity?.name || pendingAction.entity?.email || 'this user';
};

const getActionText = (status) => {
  if (status === 'active') return 'Activated';
  if (status === 'suspended') return 'Suspended';
  return 'Blacklisted';
};

export default function BlacklistPage() {
  const vehicles = useStore((state) => state.vehicles);
  const users = useStore((state) => state.users);
  const suspendVehicle = useStore((state) => state.suspendVehicle);
  const blacklistVehicle = useStore((state) => state.blacklistVehicle);
  const activateVehicle = useStore((state) => state.activateVehicle);
  const updateUserStatus = useStore((state) => state.updateUserStatus);
  const addLog = useStore((state) => state.addLog);
  const currentUser = useStore((state) => state.currentUser);
  const apiError = useStore((state) => state.apiError);

  const [activeTab, setActiveTab] = useState('vehicles');
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const vehicleList = useMemo(() => (Array.isArray(vehicles) ? vehicles : []), [vehicles]);
  const userList = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  const manageableUsers = useMemo(() => {
    return userList.filter((user) => user.role !== 'admin');
  }, [userList]);

  const suspendedVehicles = vehicleList.filter((vehicle) => vehicle.status === 'suspended');
  const blacklistedVehicles = vehicleList.filter((vehicle) => vehicle.status === 'blacklisted');
  const restrictedUsers = manageableUsers.filter((user) => user.status !== 'active');

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
        String(vehicle.registrationNumber || '').toLowerCase().includes(query) ||
        String(vehicle.plateNumber || '').toLowerCase().includes(query) ||
        String(vehicle.ownerName || '').toLowerCase().includes(query) ||
        String(vehicle.brand || '').toLowerCase().includes(query) ||
        String(vehicle.model || '').toLowerCase().includes(query) ||
        String(vehicle.vehicleType || '').toLowerCase().includes(query) ||
        String(vehicle.color || '').toLowerCase().includes(query) ||
        String(vehicle.status || '').toLowerCase().includes(query)
      );
    });

    return nextVehicles;
  }, [vehicleList, searchQ, statusFilter]);

  const filteredUsers = useMemo(() => {
    let nextUsers =
      statusFilter === 'all'
        ? manageableUsers
        : manageableUsers.filter((user) => user.status === statusFilter);

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextUsers;
    }

    nextUsers = nextUsers.filter((user) => {
      return (
        String(user.name || '').toLowerCase().includes(query) ||
        String(user.email || '').toLowerCase().includes(query) ||
        String(user.phone || '').toLowerCase().includes(query) ||
        String(user.nid || '').toLowerCase().includes(query) ||
        String(user.role || '').toLowerCase().includes(query) ||
        String(user.status || '').toLowerCase().includes(query)
      );
    });

    return nextUsers;
  }, [manageableUsers, searchQ, statusFilter]);

  const summaryCards = [
    {
      label: 'Total Vehicles',
      value: vehicleList.length,
      note: 'Available for enforcement action',
      icon: Car,
      tone: 'blue',
    },
    {
      label: 'Suspended Vehicles',
      value: suspendedVehicles.length,
      note: 'Temporarily restricted',
      icon: AlertTriangle,
      tone: 'orange',
    },
    {
      label: 'Blacklisted Vehicles',
      value: blacklistedVehicles.length,
      note: 'Strictly restricted',
      icon: Ban,
      tone: 'red',
    },
    {
      label: 'Restricted Users',
      value: restrictedUsers.length,
      note: 'Suspended or blacklisted accounts',
      icon: Users,
      tone: 'purple',
    },
  ];

  const activeListCount =
    activeTab === 'vehicles' ? filteredVehicles.length : filteredUsers.length;

  const activeTotalCount = activeTab === 'vehicles' ? vehicleList.length : manageableUsers.length;

  const resetFiltersForTab = (tabId) => {
    setActiveTab(tabId);
    setSearchQ('');
    setStatusFilter('all');
  };

  const writeActionLog = ({ entityType, entity, status }) => {
    if (!currentUser) {
      return;
    }

    const actionText = getActionText(status);
    const target = entityType === 'vehicle' ? getVehiclePlate(entity) : entity.name || 'Unknown User';

    addLog({
      userId: currentUser.id || currentUser._id,
      userName: currentUser.name,
      action: `${formatLabel(entityType)} ${actionText}`,
      details: `${formatLabel(entityType)} ${target} has been ${status} by admin.`,
      type: 'admin',
    });
  };

  const openConfirmation = ({ entityType, entity, status }) => {
    const entityId = entityType === 'vehicle' ? getVehicleId(entity) : getUserId(entity);

    if (!entityId) {
      return;
    }

    setPendingAction({
      entityType,
      entity,
      status,
      config: actionConfig[entityType][status],
    });
  };

  const closeConfirmation = () => {
    setPendingAction(null);
  };

  const handleConfirmedAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { entityType, entity, status } = pendingAction;
    const entityId = entityType === 'vehicle' ? getVehicleId(entity) : getUserId(entity);

    if (!entityId) {
      return;
    }

    try {
      setUpdatingId(entityId);

      if (entityType === 'vehicle') {
        if (status === 'active') {
          await activateVehicle(entityId);
        } else if (status === 'suspended') {
          await suspendVehicle(entityId);
        } else {
          await blacklistVehicle(entityId);
        }
      } else {
        await updateUserStatus(entityId, status);
      }

      writeActionLog({ entityType, entity, status });
      closeConfirmation();
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="blacklist-page-wrapper animate-fade-in space-y-6">
      <header className="blacklist-page-header flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="blacklist-page-title-block">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldAlert size={24} className="text-red-500" />
            Blacklist & Suspensions
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage vehicle and user restrictions from one secure admin workspace.
          </p>
        </div>

        <div className="blacklist-page-note inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <ShieldCheck size={15} />
          Admin-only enforcement controls
        </div>
      </header>

      {apiError && (
        <div className="blacklist-page-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="blacklist-summary-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className={`blacklist-summary-card blacklist-summary-card-${card.tone} bg-white rounded-2xl border border-gray-100 p-5`}
            >
              <div className="blacklist-summary-content flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {card.label}
                  </p>

                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {card.value}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {card.note}
                  </p>
                </div>

                <div className="blacklist-summary-icon w-11 h-11 rounded-xl flex items-center justify-center">
                  <Icon size={22} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="blacklist-toolbar-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="blacklist-toolbar-row flex flex-col gap-3">
          <div className="blacklist-toolbar-top flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="blacklist-tabs flex gap-2 flex-wrap">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                const total = tab.id === 'vehicles' ? vehicleList.length : manageableUsers.length;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => resetFiltersForTab(tab.id)}
                    className={`blacklist-tab-button px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-[#0f4c81] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label} ({total} total)
                  </button>
                );
              })}
            </div>

            <div className="blacklist-search-wrap relative">
              <Search
                size={17}
                className="blacklist-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchQ}
                onChange={(event) => setSearchQ(event.target.value)}
                placeholder={
                  activeTab === 'vehicles'
                    ? 'Search by plate, owner, vehicle, type, or status...'
                    : 'Search by name, email, phone, NID, role, or status...'
                }
                className="blacklist-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
              />
            </div>
          </div>

          <div className="blacklist-status-filter-row flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`blacklist-status-filter-button rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  statusFilter === status
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

      {activeTab === 'vehicles' ? (
        <VehicleTable
          vehicles={filteredVehicles}
          updatingId={updatingId}
          openConfirmation={openConfirmation}
        />
      ) : (
        <UserTable
          users={filteredUsers}
          updatingId={updatingId}
          openConfirmation={openConfirmation}
        />
      )}

      <p className="blacklist-page-count text-xs text-gray-400">
        Showing {activeListCount} of {activeTotalCount}{' '}
        {activeTab === 'vehicles' ? 'vehicles' : 'users'}.
      </p>

      {pendingAction && (
        <div className="blacklist-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <section className="blacklist-confirm-modal w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeConfirmation}
              className="blacklist-confirm-close absolute right-4 top-4 rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Close confirmation"
              aria-label="Close confirmation modal"
            >
              <X size={16} />
            </button>

            <div className="blacklist-confirm-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <AlertTriangle size={22} />
            </div>

            <div className="blacklist-confirm-content mt-4 text-center">
              <h2 className="text-lg font-bold text-gray-800">
                {pendingAction.config.title}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to update{' '}
                <span className="font-semibold text-gray-700">
                  {getEntityLabel(pendingAction)}
                </span>
                ? {pendingAction.config.message}
              </p>
            </div>

            <div className="blacklist-confirm-actions mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={closeConfirmation}
                className="blacklist-cancel-button rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmedAction}
                disabled={Boolean(updatingId)}
                className={`blacklist-confirm-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${pendingAction.config.buttonClass}`}
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

function VehicleTable({ vehicles, updatingId, openConfirmation }) {
  return (
    <section className="blacklist-table-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="blacklist-table-toolbar flex flex-col gap-1 border-b border-gray-100 bg-gray-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-gray-700">Vehicle Enforcement List</p>

        <p className="blacklist-scroll-hint text-xs text-gray-400">
          Scroll horizontally on small screens to see all columns.
        </p>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          subtitle="Try changing your search keyword or status filter."
        />
      ) : (
        <div className="blacklist-table-scroll overflow-x-auto">
          <table className="blacklist-table w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="blacklist-sticky-col text-left px-5 py-3 font-semibold text-gray-600">
                  Plate
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Vehicle
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Owner
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Safety
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {vehicles.map((vehicle) => {
                const vehicleId = getVehicleId(vehicle);
                const plate = getVehiclePlate(vehicle);
                const status = vehicle.status || 'active';
                const safetyScore = Number(vehicle.safetyScore || 0);
                const isUpdating = updatingId === vehicleId;

                return (
                  <tr
                    key={vehicleId || plate}
                    className="blacklist-table-row hover:bg-gray-50"
                  >
                    <td className="blacklist-sticky-col px-5 py-3 font-medium text-gray-800">
                      {plate}
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {vehicle.brand || 'Unknown'} {vehicle.model || ''}
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {vehicle.ownerName || 'N/A'}
                    </td>

                    <td className="px-5 py-3">
                      <span className={`font-medium ${getSafetyColorClass(safetyScore)}`}>
                        {safetyScore}/100
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`blacklist-status-badge px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusBadgeColors[status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {formatLabel(status)}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <ActionButtons
                        entityType="vehicle"
                        entity={vehicle}
                        status={status}
                        isUpdating={isUpdating}
                        openConfirmation={openConfirmation}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UserTable({ users, updatingId, openConfirmation }) {
  return (
    <section className="blacklist-table-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="blacklist-table-toolbar flex flex-col gap-1 border-b border-gray-100 bg-gray-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-gray-700">User Restriction List</p>

        <p className="blacklist-scroll-hint text-xs text-gray-400">
          Admin accounts are protected and hidden from this enforcement list.
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          subtitle="Try changing your search keyword or status filter."
        />
      ) : (
        <div className="blacklist-table-scroll overflow-x-auto">
          <table className="blacklist-table w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="blacklist-sticky-col text-left px-5 py-3 font-semibold text-gray-600">
                  User
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Role
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Phone
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {users.map((user) => {
                const userId = getUserId(user);
                const status = user.status || 'active';
                const role = user.role || 'user';
                const isUpdating = updatingId === userId;

                return (
                  <tr
                    key={userId || user.email}
                    className="blacklist-table-row hover:bg-gray-50"
                  >
                    <td className="blacklist-sticky-col px-5 py-3">
                      <p className="font-medium text-gray-800">
                        {user.name || 'Unnamed User'}
                      </p>

                      <p className="text-xs text-gray-400">
                        {user.email || 'No email'}
                      </p>
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`blacklist-role-badge px-2 py-0.5 rounded-full text-xs font-medium ${
                          roleBadgeColors[role] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {formatLabel(role)}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {user.phone || 'N/A'}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`blacklist-status-badge px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusBadgeColors[status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {formatLabel(status)}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <ActionButtons
                        entityType="user"
                        entity={user}
                        status={status}
                        isUpdating={isUpdating}
                        openConfirmation={openConfirmation}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ActionButtons({ entityType, entity, status, isUpdating, openConfirmation }) {
  const entityName = entityType === 'vehicle' ? getVehiclePlate(entity) : entity?.name || 'user';

  return (
    <div className="blacklist-action-group flex gap-1">
      {status !== 'active' && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => openConfirmation({ entityType, entity, status: 'active' })}
          className="blacklist-icon-button p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
          title={`Activate ${entityName}`}
          aria-label={`Activate ${entityName}`}
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
          onClick={() => openConfirmation({ entityType, entity, status: 'suspended' })}
          className="blacklist-icon-button p-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
          title={`Suspend ${entityName}`}
          aria-label={`Suspend ${entityName}`}
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
          onClick={() => openConfirmation({ entityType, entity, status: 'blacklisted' })}
          className="blacklist-icon-button p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
          title={`Blacklist ${entityName}`}
          aria-label={`Blacklist ${entityName}`}
        >
          {isUpdating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Ban size={14} />
          )}
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="blacklist-empty-state p-12 text-center text-gray-400">
      <Icon size={42} className="mx-auto mb-3 opacity-30" />

      <p className="text-sm font-medium">{title}</p>

      <p className="text-xs mt-1">{subtitle}</p>
    </div>
  );
}