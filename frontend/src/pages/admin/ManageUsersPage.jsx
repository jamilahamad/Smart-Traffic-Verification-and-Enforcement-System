import { useMemo, useState } from 'react';
import {
  Search,
  Ban,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Users,
  UserPlus,
  X,
  Save,
  ShieldCheck,
  BadgeCheck,
  UserRoundCheck,
  Car,
  Building2,
  Briefcase,
  LockKeyhole,
} from 'lucide-react';

import useStore from '../../store/useStore';
import UserAvatar from '../../components/common/UserAvatar';
import '../../styles/ManageUsersPage.css';

const roleFilters = ['all', 'admin', 'police', 'driver', 'owner'];

const initialStaffForm = {
  name: '',
  email: '',
  phone: '',
  badge: '',
  station: '',
  rank: '',
  password: '',
};

const roleBadgeColors = {
  admin: 'bg-red-100 text-red-700',
  police: 'bg-blue-100 text-blue-700',
  driver: 'bg-green-100 text-green-700',
  owner: 'bg-purple-100 text-purple-700',
};

const statusBadgeColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-orange-100 text-orange-700',
  blacklisted: 'bg-red-100 text-red-700',
};

const actionConfig = {
  active: {
    title: 'Activate User',
    message: 'This user will be able to access the system again.',
    buttonText: 'Activate',
    buttonClass: 'bg-green-600 hover:bg-green-700',
  },
  suspended: {
    title: 'Suspend User',
    message: 'This user will be blocked temporarily until reactivated.',
    buttonText: 'Suspend',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
  },
  blacklisted: {
    title: 'Blacklist User',
    message: 'This is a strong restriction. Use it only for serious cases.',
    buttonText: 'Blacklist',
    buttonClass: 'bg-red-600 hover:bg-red-700',
  },
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getUserId = (user) => {
  return user?.id || user?._id || '';
};

export default function ManageUsersPage() {
  const users = useStore((state) => state.users);
  const createUser = useStore((state) => state.createUser);
  const updateUserStatus = useStore((state) => state.updateUserStatus);
  const addLog = useStore((state) => state.addLog);
  const currentUser = useStore((state) => state.currentUser);
  const apiError = useStore((state) => state.apiError);
  const isLoading = useStore((state) => state.isLoading);

  const [searchQ, setSearchQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState(initialStaffForm);
  const [staffFormError, setStaffFormError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const userList = useMemo(() => {
    return Array.isArray(users) ? users : [];
  }, [users]);

  const userStats = useMemo(() => {
    const activeUsers = userList.filter((user) => user.status === 'active').length;
    const policeUsers = userList.filter((user) => user.role === 'police').length;
    const driverUsers = userList.filter((user) => user.role === 'driver').length;
    const ownerUsers = userList.filter((user) => user.role === 'owner').length;
    const restrictedUsers = userList.filter((user) =>
      ['suspended', 'blacklisted'].includes(user.status)
    ).length;

    return [
      {
        label: 'Total Users',
        value: userList.length,
        note: 'All registered accounts',
        icon: Users,
        tone: 'blue',
      },
      {
        label: 'Active Users',
        value: activeUsers,
        note: 'Can login now',
        icon: UserRoundCheck,
        tone: 'green',
      },
      {
        label: 'Police Staff',
        value: policeUsers,
        note: 'Admin managed staff',
        icon: ShieldCheck,
        tone: 'indigo',
      },
      {
        label: 'Drivers / Owners',
        value: driverUsers + ownerUsers,
        note: `${driverUsers} drivers, ${ownerUsers} owners`,
        icon: Car,
        tone: 'purple',
      },
      {
        label: 'Restricted',
        value: restrictedUsers,
        note: 'Suspended or blacklisted',
        icon: Ban,
        tone: 'red',
      },
    ];
  }, [userList]);

  const filteredUsers = useMemo(() => {
    let nextUsers = roleFilter === 'all'
      ? userList
      : userList.filter((user) => user.role === roleFilter);

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
        String(user.badge || '').toLowerCase().includes(query) ||
        String(user.station || '').toLowerCase().includes(query)
      );
    });

    return nextUsers;
  }, [userList, roleFilter, searchQ]);

  const resetStaffModal = () => {
    setStaffForm(initialStaffForm);
    setStaffFormError('');
    setStaffModalOpen(false);
  };

  const updateStaffField = (field, value) => {
    setStaffForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateStaffForm = () => {
    if (!staffForm.name.trim()) return 'Staff name is required.';
    if (!staffForm.email.trim()) return 'Staff email is required.';
    if (!staffForm.password || staffForm.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (!staffForm.badge.trim()) return 'Police badge ID is required.';
    if (!staffForm.station.trim()) return 'Police station is required.';

    return '';
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();

    const error = validateStaffForm();

    if (error) {
      setStaffFormError(error);
      return;
    }

    const result = await createUser({
      name: staffForm.name.trim(),
      email: staffForm.email.trim().toLowerCase(),
      phone: staffForm.phone.trim(),
      password: staffForm.password,
      role: 'police',
      badge: staffForm.badge.trim(),
      station: staffForm.station.trim(),
      rank: staffForm.rank.trim(),
      status: 'active',
    });

    if (!result.success) {
      setStaffFormError(result.message || 'Staff account creation failed.');
      return;
    }

    if (currentUser) {
      addLog({
        userId: currentUser.id || currentUser._id,
        userName: currentUser.name,
        action: 'Police Staff Created',
        details: `${staffForm.name.trim()} has been added as police staff.`,
        type: 'admin',
      });
    }

    resetStaffModal();
  };

  const openStatusConfirmation = (user, status) => {
    setPendingAction({
      user,
      status,
      config: actionConfig[status],
    });
  };

  const closeStatusConfirmation = () => {
    setPendingAction(null);
  };

  const handleStatusChange = async () => {
    if (!pendingAction?.user || !pendingAction?.status) {
      return;
    }

    const user = pendingAction.user;
    const status = pendingAction.status;
    const userId = getUserId(user);

    if (!userId) {
      return;
    }

    try {
      setUpdatingId(userId);

      await updateUserStatus(userId, status);

      if (currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name,
          action: `User ${status === 'active' ? 'Activated' : status === 'suspended' ? 'Suspended' : 'Blacklisted'}`,
          details: `User ${user.name || 'Unknown User'} has been ${status} by admin.`,
          type: 'admin',
        });
      }

      closeStatusConfirmation();
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="manage-users-wrapper animate-fade-in space-y-6">
      <header className="manage-users-header flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="manage-users-title-block">
          <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>

          <p className="text-sm text-gray-500 mt-1">
            Review users, manage access, and add police staff accounts only.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStaffModalOpen(true)}
          className="manage-users-add-staff-button inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f4c81] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b3b66] focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/25"
          title="Add police staff account"
        >
          <UserPlus size={17} />
          Add Staff
        </button>
      </header>

      {apiError && (
        <div className="manage-users-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="manage-users-stats-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {userStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className={`manage-users-stat-card manage-users-stat-card-${stat.tone} bg-white rounded-2xl border border-gray-100 p-4`}
            >
              <div className="manage-users-stat-content flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {stat.label}
                  </p>

                  <h2 className="text-2xl font-bold text-gray-800 mt-1">
                    {stat.value}
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">{stat.note}</p>
                </div>

                <div className="manage-users-stat-icon rounded-2xl p-2.5">
                  <Icon size={20} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="manage-users-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="manage-users-filter-row flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="manage-users-search-wrap relative flex-1">
            <Search
              size={18}
              className="manage-users-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search by name, email, phone, NID, badge, or station..."
              className="manage-users-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            />
          </div>

          <div className="manage-users-role-filters flex gap-2 flex-wrap">
            {roleFilters.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`manage-users-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${roleFilter === role
                    ? 'bg-[#0f4c81] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {formatLabel(role)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="manage-users-table-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="manage-users-table-toolbar flex flex-col gap-1 border-b border-gray-100 bg-gray-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-700">
            User Directory
          </p>

          <p className="manage-users-scroll-hint text-xs text-gray-400">
            On small screens, scroll horizontally to see all columns.
          </p>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="manage-users-empty-state p-12 text-center text-gray-400">
            <Users size={42} className="mx-auto mb-3 opacity-30" />

            <p className="text-sm font-medium">No users found</p>

            <p className="text-xs mt-1">
              Try changing the search keyword or selected role filter.
            </p>
          </div>
        ) : (
          <div className="manage-users-table-scroll overflow-x-auto">
            <table className="manage-users-table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="manage-users-sticky-col text-left px-5 py-3 font-semibold text-gray-600">
                    User
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Phone
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    NID / Badge
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Station
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
                {filteredUsers.map((user) => {
                  const userId = getUserId(user);
                  const isUpdating = updatingId === userId;
                  const status = user.status || 'active';
                  const role = user.role || 'user';
                  const isAdminUser = role === 'admin';

                  return (
                    <tr
                      key={userId || user.email}
                      className="manage-users-table-row hover:bg-gray-50"
                    >
                      <td className="manage-users-sticky-col px-5 py-3">
                        <div className="manage-users-user-cell flex items-center gap-3">
                          <UserAvatar
                            user={user}
                            size="xs"
                            radius="circle"
                            className="manage-users-avatar"
                          />

                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {user.name || 'Unnamed User'}
                            </p>

                            <p className="text-xs text-gray-400 truncate">
                              {user.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`manage-users-role-badge inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[role] || 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {formatLabel(role)}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {user.phone || 'N/A'}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        <p className="font-mono text-xs">
                          {user.nid || user.badge || 'N/A'}
                        </p>

                        {user.badge && user.nid && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Badge: {user.badge}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {user.station || user.rank || 'N/A'}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`manage-users-status-badge inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColors[status] || 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {formatLabel(status)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        {isAdminUser ? (
                          <span className="manage-users-protected-label inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                            <LockKeyhole size={12} />
                            Protected
                          </span>
                        ) : (
                          <div className="manage-users-action-group flex items-center gap-1">
                            {status !== 'active' && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => openStatusConfirmation(user, 'active')}
                                className="manage-users-icon-button p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                                title="Activate user"
                                aria-label={`Activate ${user.name || 'user'}`}
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
                                onClick={() => openStatusConfirmation(user, 'suspended')}
                                className="manage-users-icon-button p-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
                                title="Suspend user"
                                aria-label={`Suspend ${user.name || 'user'}`}
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
                                onClick={() => openStatusConfirmation(user, 'blacklisted')}
                                className="manage-users-icon-button p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                title="Blacklist user"
                                aria-label={`Blacklist ${user.name || 'user'}`}
                              >
                                {isUpdating ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Ban size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {staffModalOpen && (
        <div className="manage-users-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <section className="manage-users-staff-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="manage-users-modal-header flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0f4c81]">
                  Admin Staff Control
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-800">
                  Add Police Staff
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  This form creates police staff only. Owner and driver accounts use their own registration flow.
                </p>
              </div>

              <button
                type="button"
                onClick={resetStaffModal}
                className="manage-users-modal-close rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Close Add Staff form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="manage-users-staff-form px-6 py-5">
              {staffFormError && (
                <div className="manage-users-form-error mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {staffFormError}
                </div>
              )}

              <div className="manage-users-form-grid grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <Users size={14} />
                    Staff Name
                  </span>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(event) => updateStaffField('name', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="e.g. Sergeant Rahim"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <BadgeCheck size={14} />
                    Badge ID
                  </span>
                  <input
                    type="text"
                    value={staffForm.badge}
                    onChange={(event) => updateStaffField('badge', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="e.g. SMP-1024"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <ShieldCheck size={14} />
                    Role
                  </span>
                  <input
                    type="text"
                    value="Police Staff"
                    readOnly
                    className="manage-users-form-input manage-users-readonly-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 focus:outline-none"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <Building2 size={14} />
                    Station
                  </span>
                  <input
                    type="text"
                    value={staffForm.station}
                    onChange={(event) => updateStaffField('station', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="e.g. Sylhet Traffic Police"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <Briefcase size={14} />
                    Rank
                  </span>
                  <input
                    type="text"
                    value={staffForm.rank}
                    onChange={(event) => updateStaffField('rank', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="e.g. Sergeant"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <Building2 size={14} />
                    Phone
                  </span>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={(event) => updateStaffField('phone', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="e.g. 01700000000"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <BadgeCheck size={14} />
                    Email
                  </span>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(event) => updateStaffField('email', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="staff@example.com"
                  />
                </label>

                <label className="manage-users-form-field">
                  <span className="manage-users-field-label flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <LockKeyhole size={14} />
                    Temporary Password
                  </span>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(event) => updateStaffField('password', event.target.value)}
                    className="manage-users-form-input mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
                    placeholder="Minimum 6 characters"
                  />
                </label>
              </div>

              <div className="manage-users-policy-note mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Owner and driver accounts are intentionally disabled here for safer role separation.
              </div>

              <div className="manage-users-modal-actions mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetStaffModal}
                  className="manage-users-cancel-button rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="manage-users-save-button inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f4c81] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b3b66] disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Create Staff
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingAction && (
        <div className="manage-users-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <section className="manage-users-confirm-modal w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="manage-users-confirm-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <AlertTriangle size={22} />
            </div>

            <div className="manage-users-confirm-content mt-4 text-center">
              <h2 className="text-lg font-bold text-gray-800">
                {pendingAction.config.title}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to update
                {' '}
                <span className="font-semibold text-gray-700">
                  {pendingAction.user.name || 'this user'}
                </span>
                ? {pendingAction.config.message}
              </p>
            </div>

            <div className="manage-users-confirm-actions mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={closeStatusConfirmation}
                className="manage-users-cancel-button rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStatusChange}
                disabled={Boolean(updatingId)}
                className={`manage-users-confirm-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${pendingAction.config.buttonClass}`}
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