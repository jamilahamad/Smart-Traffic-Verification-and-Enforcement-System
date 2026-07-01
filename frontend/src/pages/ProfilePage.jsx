import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Car,
  CheckCircle,
  Edit3,
  IdCard,
  KeyRound,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Shield,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

import api from '../lib/api';
import useStore from '../store/useStore';
import UserAvatar from '../components/common/UserAvatar';
import '../styles/ProfilePage.css';

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || '';
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

const formatDateTime = (value) => {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not recorded';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (name = '') => {
  const parts = String(name || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getStatusClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (['active', 'valid', 'approved'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }

  if (['pending', 'warning'].includes(value)) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (['suspended', 'blacklisted', 'inactive', 'expired'].includes(value)) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const PRIMARY_PROFILE_GRADIENT = 'from-[#0f4c81] to-[#1a73e8]';

const getRoleMeta = (role) => {
  const value = String(role || '').toLowerCase();

  if (value === 'admin') {
    return {
      title: 'System Administrator',
      subtitle: 'Full access to users, vehicles, cases, analytics, and system logs.',
      color: PRIMARY_PROFILE_GRADIENT,
    };
  }

  if (value === 'police') {
    return {
      title: 'Traffic Police Officer',
      subtitle: 'Authorized to verify vehicles, scan QR codes, and issue E-Challan.',
      color: PRIMARY_PROFILE_GRADIENT,
    };
  }

  if (value === 'driver') {
    return {
      title: 'Registered Driver',
      subtitle: 'Access license details, assigned vehicles, and violation records.',
      color: PRIMARY_PROFILE_GRADIENT,
    };
  }

  if (value === 'owner') {
    return {
      title: 'Vehicle Owner',
      subtitle: 'Manage owned vehicles, driver assignments, and vehicle violations.',
      color: PRIMARY_PROFILE_GRADIENT,
    };
  }

  return {
    title: 'STVES User',
    subtitle: 'Smart Traffic Verification and Enforcement System profile.',
    color: PRIMARY_PROFILE_GRADIENT,
  };
};

const getUpdateProfileFunction = (currentUserId) => {
  if (typeof api.updateProfile === 'function') {
    return api.updateProfile;
  }

  if (typeof api.updateMe === 'function') {
    return api.updateMe;
  }

  if (typeof api.updateUser === 'function' && currentUserId) {
    return (payload) => api.updateUser(currentUserId, payload);
  }

  return null;
};

const buildEditableProfile = (user) => {
  return {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nid: user?.nid || '',
    address: user?.address || '',
    station: user?.station || '',
    badge: user?.badge || '',
  };
};

const getRolePermissions = (role) => {
  const value = String(role || '').toLowerCase();

  if (value === 'admin') {
    return [
      'Manage users and role access',
      'Review, approve, dismiss, and update cases',
      'Manage vehicles, licenses, and blacklist records',
      'View analytics and activity logs',
    ];
  }

  if (value === 'police') {
    return [
      'Verify vehicle and driving license records',
      'Scan STVES QR codes for instant verification',
      'Create E-Challan cases for violations',
      'Track own issued enforcement cases',
    ];
  }

  if (value === 'driver') {
    return [
      'View linked driving license information',
      'Track assigned vehicles',
      'View driver-responsibility violations',
      'Pay approved driver fines and print receipts',
    ];
  }

  if (value === 'owner') {
    return [
      'Manage owned vehicles',
      'Assign approved drivers to vehicles',
      'View owner-responsibility vehicle violations',
      'Pay approved owner fines and print receipts',
    ];
  }

  return [
    'View STVES account information',
    'Access role-based dashboard features',
  ];
};

export default function ProfilePage() {
  const currentUser = useStore((state) => state.currentUser);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const updateCurrentUser = useStore((state) => state.updateCurrentUser);
  const addLog = useStore((state) => state.addLog);
  const isLoading = useStore((state) => state.isLoading);
  const apiError = useStore((state) => state.apiError);

  const currentUserId = getId(currentUser);
  const roleMeta = getRoleMeta(currentUser?.role);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(buildEditableProfile(currentUser));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const profileItems = useMemo(() => {
    return [
      {
        label: 'Full Name',
        value: currentUser?.name,
        icon: UserRound,
      },
      {
        label: 'Email Address',
        value: currentUser?.email,
        icon: Mail,
      },
      {
        label: 'Phone Number',
        value: currentUser?.phone,
        icon: Phone,
      },
      {
        label: 'NID Number',
        value: currentUser?.nid,
        icon: IdCard,
      },
      {
        label: 'Address',
        value: currentUser?.address,
        icon: MapPin,
      },
      {
        label: 'Role',
        value: formatLabel(currentUser?.role),
        icon: Shield,
      },
    ];
  }, [currentUser]);

  const roleSpecificItems = useMemo(() => {
    if (currentUser?.role === 'police') {
      return [
        {
          label: 'Badge Number',
          value: currentUser?.badge,
          icon: BadgeCheck,
        },
        {
          label: 'Police Station',
          value: currentUser?.station,
          icon: Shield,
        },
      ];
    }

    if (currentUser?.role === 'admin') {
      return [
        {
          label: 'Access Level',
          value: 'Full System Access',
          icon: Shield,
        },
        {
          label: 'Module Permission',
          value: 'Admin Console',
          icon: BadgeCheck,
        },
      ];
    }

    if (currentUser?.role === 'driver') {
      return [
        {
          label: 'Driver Account',
          value: 'License & Violation Access',
          icon: IdCard,
        },
        {
          label: 'Verification',
          value: 'STVES Driver Profile',
          icon: BadgeCheck,
        },
      ];
    }

    if (currentUser?.role === 'owner') {
      return [
        {
          label: 'Owner Account',
          value: 'Vehicle & Driver Assignment Access',
          icon: Car,
        },
        {
          label: 'Verification',
          value: 'STVES Vehicle Owner Profile',
          icon: BadgeCheck,
        },
      ];
    }

    return [];
  }, [currentUser]);

  const rolePermissions = useMemo(() => {
    return getRolePermissions(currentUser?.role);
  }, [currentUser?.role]);

  const securityItems = useMemo(() => {
    return [
      {
        icon: CheckCircle,
        label: 'Authentication',
        value: 'JWT Protected',
        good: true,
      },
      {
        icon: BadgeCheck,
        label: 'Account Status',
        value: formatLabel(currentUser?.status || 'active'),
        good: currentUser?.status !== 'suspended' && currentUser?.status !== 'blacklisted',
      },
      {
        icon: KeyRound,
        label: 'Password',
        value: 'Encrypted',
        good: true,
      },
      {
        icon: AlertTriangle,
        label: 'Two-Factor Auth',
        value: currentUser?.twoFactorEnabled ? 'Enabled' : 'Not enabled',
        good: Boolean(currentUser?.twoFactorEnabled),
      },
    ];
  }, [currentUser]);

  const accountAuditItems = useMemo(() => {
    return [
      {
        label: 'Last Login',
        value: formatDateTime(currentUser?.lastLoginAt || currentUser?.lastLogin),
      },
      {
        label: 'Last Updated',
        value: formatDateTime(currentUser?.updatedAt),
      },
      {
        label: 'Password Updated',
        value: formatDateTime(currentUser?.passwordUpdatedAt),
      },
    ];
  }, [currentUser]);

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleStartEdit = () => {
    setForm(buildEditableProfile(currentUser));
    setLocalError('');
    setSuccess('');
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setForm(buildEditableProfile(currentUser));
    setLocalError('');
    setEditing(false);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Name is required.';
    }

    if (!form.email.trim()) {
      return 'Email is required.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Please enter a valid email address.';
    }

    return '';
  };

  const handleRefresh = async () => {
    if (typeof fetchDashboardData === 'function') {
      await fetchDashboardData();
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setLocalError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const updateProfile = getUpdateProfileFunction(currentUserId);

    if (!updateProfile) {
      setLocalError('Profile update API function not found in api.js.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        nid: form.nid.trim(),
        address: form.address.trim(),
        station: form.station.trim(),
        badge: form.badge.trim(),
      };

      const response = await updateProfile(payload);
      const updatedUser = response?.user || response?.data?.user || response?.data || {
        ...currentUser,
        ...payload,
      };

      if (typeof updateCurrentUser === 'function') {
        updateCurrentUser(updatedUser);
      } else if (typeof setCurrentUser === 'function') {
        setCurrentUser({
          ...currentUser,
          ...updatedUser,
        });
      }

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }

      if (typeof addLog === 'function' && currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'User',
          action: 'Profile Updated',
          details: `${currentUser.name || 'User'} updated profile information.`,
          type: 'system',
        });
      }

      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      console.error('Profile update failed:', err);
      setLocalError(err.message || 'Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="profile-page-wrapper animate-fade-in">
        <section className="profile-empty-card bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <UserRound size={48} className="mx-auto mb-4 opacity-30" />

          <h2 className="text-base font-semibold text-gray-600">No profile found</h2>

          <p className="text-sm mt-2">
            Please login again to view your profile information.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper animate-fade-in space-y-6">
      <header className="profile-page-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="profile-page-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserRound size={26} />
              My Profile
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Manage your STVES account details and role-based profile information.
            </p>
          </div>

          <div className="profile-page-header-actions flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="profile-page-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {!editing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="profile-page-edit-button bg-white text-[#0f4c81] rounded-xl px-4 py-2 text-sm font-semibold hover:shadow-lg flex items-center gap-2"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </header>

      {(apiError || localError) && (
        <div className="profile-page-alert bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>{localError || apiError}</span>
        </div>
      )}

      {success && (
        <div className="profile-page-alert bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <section className="profile-page-hero-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className={`profile-page-hero-top bg-gradient-to-br ${roleMeta.color} p-6 text-white`}>
          <div className="profile-page-hero-content flex items-start gap-5">
            <UserAvatar
              user={currentUser}
              size="lg"
              radius="square"
              className="profile-page-avatar border border-white/30 shadow-lg"
            />

            <div className="flex-1 min-w-0">
              <div className="profile-page-name-row flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">{currentUser.name || 'STVES User'}</h2>

                <span
                  className={`profile-page-status-badge px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                    currentUser.status || 'active'
                  )}`}
                >
                  {formatLabel(currentUser.status || 'active')}
                </span>
              </div>

              <p className="text-sm text-white/80 mt-1">{roleMeta.title}</p>
              {currentUser.avatarSource === 'brta' && (
                <p className="text-xs text-white/75 mt-1">
                  Synced from BRTA official record
                </p>
              )}

              <p className="text-sm text-white/70 mt-2 max-w-2xl">{roleMeta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="profile-page-hero-bottom grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          <MiniInfo icon={Shield} label="Role" value={formatLabel(currentUser.role)} />
          <MiniInfo icon={Mail} label="Email" value={currentUser.email || 'N/A'} />
          <MiniInfo icon={Phone} label="Phone" value={currentUser.phone || 'N/A'} />
          <MiniInfo icon={BadgeCheck} label="Joined" value={formatDate(currentUser.createdAt)} />
        </div>
      </section>

      {editing ? (
        <section className="profile-page-form-card bg-white rounded-2xl border border-gray-100 p-6">
          <div className="profile-page-form-head flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Edit Profile Information</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update your basic account information.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelEdit}
              className="profile-page-cancel-button rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 flex items-center gap-1"
            >
              <X size={14} />
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} className="profile-page-form space-y-5">
            <div className="profile-page-form-grid grid md:grid-cols-2 gap-4">
              <FormInput
                label="Full Name *"
                value={form.name}
                onChange={(value) => setField('name', value)}
                placeholder="Enter full name"
              />

              <FormInput
                label="Email Address *"
                type="email"
                value={form.email}
                onChange={(value) => setField('email', value)}
                placeholder="example@email.com"
              />

              <FormInput
                label="Phone Number"
                value={form.phone}
                onChange={(value) => setField('phone', value)}
                placeholder="01XXXXXXXXX"
              />

              <FormInput
                label="NID Number"
                value={form.nid}
                onChange={(value) => setField('nid', value)}
                placeholder="National ID number"
              />

              <FormInput
                label="Address"
                value={form.address}
                onChange={(value) => setField('address', value)}
                placeholder="Address"
              />

              {currentUser.role === 'police' && (
                <>
                  <FormInput
                    label="Badge Number"
                    value={form.badge}
                    onChange={(value) => setField('badge', value)}
                    placeholder="Badge number"
                  />

                  <FormInput
                    label="Police Station"
                    value={form.station}
                    onChange={(value) => setField('station', value)}
                    placeholder="Police station"
                  />
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="profile-page-save-button w-full rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-5 py-3 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving Profile...' : 'Save Changes'}
            </button>
          </form>
        </section>
      ) : (
        <section className="profile-page-details-grid grid lg:grid-cols-3 gap-6">
          <article className="profile-page-info-card lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="profile-page-section-head flex items-center gap-2 mb-5">
              <UserRound size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-800">Account Information</h2>
            </div>

            <div className="profile-page-info-grid grid sm:grid-cols-2 gap-4">
              {profileItems.map((item) => (
                <InfoItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>
          </article>

          <article className="profile-page-role-card bg-white rounded-2xl border border-gray-100 p-5">
            <div className="profile-page-section-head flex items-center gap-2 mb-5">
              <Shield size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-800">Role Details</h2>
            </div>

            <div className="profile-page-role-box rounded-2xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-5 text-white">
              <p className="text-xs text-blue-100">Current Role</p>
              <p className="text-2xl font-bold mt-1">{formatLabel(currentUser.role)}</p>
              <p className="text-xs text-blue-100 mt-2">{roleMeta.title}</p>
            </div>

            <div className="profile-page-role-list space-y-3 mt-5">
              {roleSpecificItems.map((item) => (
                <InfoItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  compact
                />
              ))}
            </div>
            <div className="profile-page-permissions-box mt-5 rounded-2xl border border-blue-50 bg-blue-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks size={17} className="text-[#0f4c81]" />
                <h3 className="text-sm font-bold text-gray-800">Role Permissions</h3>
              </div>

              <div className="space-y-2">
                {rolePermissions.map((permission) => (
                  <div
                    key={permission}
                    className="profile-page-permission-item flex items-start gap-2 text-xs font-medium text-gray-600"
                  >
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
                    <span>{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      )}

      <section className="profile-page-security-card bg-white rounded-2xl border border-gray-100 p-5">
        <div className="profile-page-section-head flex items-center gap-2 mb-5">
          <Shield size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-800">Account Security</h2>
        </div>

        <div className="profile-page-security-grid grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {securityItems.map((item) => (
            <SecurityTile
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              good={item.good}
            />
          ))}
        </div>

        <div className="profile-page-audit-grid grid md:grid-cols-3 gap-4 mt-4">
          {accountAuditItems.map((item) => (
            <div
              key={item.label}
              className="profile-page-audit-item rounded-xl border border-gray-100 bg-white px-4 py-3"
            >
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="profile-page-form-group">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="profile-page-input w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"
      />
    </div>
  );
}

function MiniInfo({ icon: Icon, label, value }) {
  return (
    <div className="profile-page-mini-info rounded-xl bg-gray-50 p-4">
      <Icon size={17} className="text-[#0f4c81] mb-2" />

      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-800 truncate mt-1">{value || 'Not added'}</p>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, compact = false }) {
  return (
    <div
      className={`profile-page-info-item rounded-xl bg-gray-50 ${compact ? 'p-3' : 'p-4'
        }`}
    >
      <div className="flex items-start gap-3">
        <div className="profile-page-info-icon w-9 h-9 rounded-lg bg-white text-[#0f4c81] flex items-center justify-center">
          <Icon size={16} />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-semibold text-gray-800 break-words mt-1">
            {value || 'Not added'}
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityTile({ icon: Icon, label, value, good }) {
  return (
    <article className="profile-page-security-tile rounded-xl bg-gray-50 p-4">
      <div
        className={`profile-page-security-icon w-10 h-10 rounded-xl flex items-center justify-center ${good ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}
      >
        <Icon size={20} />
      </div>

      <p className="text-xs text-gray-400 mt-4">{label}</p>

      <p className="text-sm font-bold text-gray-800 mt-1">{value}</p>
    </article>
  );
}