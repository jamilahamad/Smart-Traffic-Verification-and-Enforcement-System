import {
  Users,
  Car,
  FileWarning,
  Shield,
  AlertTriangle,
  TrendingUp,
  Clock,
  Ban,
  RefreshCw,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/AdminDashboard.css';

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount) => {
  return `৳${safeNumber(amount).toLocaleString()}`;
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A').replace(/[-_]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getCaseStatusClass = (status) => {
  if (status === 'pending') {
    return 'bg-orange-100 text-orange-700';
  }

  if (status === 'approved') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'paid') {
    return 'bg-blue-100 text-blue-700';
  }

  if (status === 'dismissed') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getPaymentStatusClass = (status) => {
  if (status === 'paid') {
    return 'bg-blue-100 text-blue-700';
  }

  if (status === 'waived') {
    return 'bg-purple-100 text-purple-700';
  }

  if (status === 'unpaid') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getActivityDotClass = (type) => {
  if (type === 'verification') {
    return 'bg-blue-400';
  }

  if (type === 'case') {
    return 'bg-orange-400';
  }

  if (type === 'admin') {
    return 'bg-red-400';
  }

  if (type === 'auth') {
    return 'bg-green-400';
  }

  return 'bg-gray-400';
};

const formatActivityTime = (timestamp) => {
  if (!timestamp) {
    return 'N/A';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentStatus = (violation = {}) => {
  const status = String(violation.status || '').toLowerCase();
  const paymentStatus = String(violation.paymentStatus || '').toLowerCase();

  if (status === 'paid' || paymentStatus === 'paid') {
    return 'paid';
  }

  if (status === 'dismissed') {
    return 'waived';
  }

  if (status === 'unpaid' || paymentStatus === 'unpaid') {
    return 'unpaid';
  }

  return paymentStatus || 'unpaid';
};

const getReviewStatus = (violation = {}) => {
  const status = String(violation.status || '').toLowerCase();

  if (status === 'unpaid') {
    return 'approved';
  }

  return status || 'pending';
};

const getVehiclePlate = (violation = {}) => {
  return (
    violation.registrationNumber ||
    violation.plateNumber ||
    violation.vehicle?.registrationNumber ||
    violation.vehicle?.plateNumber ||
    'Unknown Vehicle'
  );
};

const getOfficerName = (violation = {}) => {
  return violation.officerName || violation.officer?.name || 'Unknown Officer';
};

const getViolationTitle = (violation = {}) => {
  return (
    violation.violationType ||
    violation.violationLabel ||
    violation.description ||
    'Traffic Violation'
  );
};

const getActivityTitle = (log = {}) => {
  const action = String(log.action || '').trim();

  if (!action) {
    return 'System Activity';
  }

  if (action.toLowerCase() === 'system verification') {
    return 'Verification activity recorded';
  }

  return formatLabel(action);
};

const getActivityDetails = (log = {}) => {
  const details = String(log.details || '').trim();

  if (details && details.toLowerCase() !== 'no details available') {
    return details;
  }

  if (log.type === 'verification') {
    return 'A vehicle or license verification event was captured in STVES.';
  }

  if (log.type === 'case') {
    return 'An E-Challan case activity was recorded.';
  }

  if (log.type === 'auth') {
    return 'A user authentication event was recorded.';
  }

  if (log.type === 'admin') {
    return 'An administrator action was recorded.';
  }

  return 'System event recorded successfully.';
};

const rememberAllCasesFilter = (filter) => {
  try {
    window.sessionStorage.setItem('stves_admin_cases_filter', filter);
  } catch {
    // Ignore storage errors and continue navigation.
  }
};

export default function AdminDashboard({ onNavigate = () => { } }) {
  useStore((state) => state.stats);

  const getStats = useStore((state) => state.getStats);
  const violations = useStore((state) => state.violations);
  const activityLogs = useStore((state) => state.activityLogs);
  const isLoading = useStore((state) => state.isLoading);
  const apiError = useStore((state) => state.apiError);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);

  const stats = getStats();
  const violationList = Array.isArray(violations) ? violations : [];

  const paidFine = violationList
    .filter((item) => getPaymentStatus(item) === 'paid')
    .reduce((sum, item) => sum + safeNumber(item.fineAmount), 0);

  const unpaidFine = violationList
    .filter((item) => getPaymentStatus(item) === 'unpaid')
    .reduce((sum, item) => sum + safeNumber(item.fineAmount), 0);

  const metrics = [
    {
      label: 'Total Users',
      value: safeNumber(stats.totalUsers),
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      trend: '+3 this month',
    },
    {
      label: 'STVES Registered Vehicles',
      value: safeNumber(stats.stvesRegisteredVehicles ?? stats.totalVehicles),
      icon: Car,
      color: 'bg-green-50 text-green-600',
      trend: `${safeNumber(
        stats.activeStvesRegisteredVehicles ?? stats.activeVehicles
      )} active in STVES`,
    },
    {
      label: 'BRTA Vehicle Records',
      value: safeNumber(stats.brtaVehicleRecords ?? stats.totalBrtaVehicles),
      icon: Car,
      color: 'bg-emerald-50 text-emerald-600',
      trend: `${safeNumber(
        stats.activeBrtaVehicleRecords ?? stats.activeBrtaVehicles
      )} active BRTA records`,
    },
    {
      label: 'Total Cases',
      value: safeNumber(stats.totalViolations),
      icon: FileWarning,
      color: 'bg-orange-50 text-orange-600',
      trend: `${safeNumber(stats.pendingCases)} pending review`,
    },
    {
      label: 'Total Fines Issued',
      value: formatMoney(stats.totalFines),
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      trend: `Paid ${formatMoney(paidFine)} • Unpaid ${formatMoney(unpaidFine)}`,
    },
    {
      label: 'Police Officers',
      value: safeNumber(stats.totalPolice),
      icon: Shield,
      color: 'bg-cyan-50 text-cyan-600',
      trend: 'Active',
    },
    {
      label: 'Pending Review',
      value: safeNumber(stats.pendingCases),
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
      trend: 'Awaiting approval',
    },
    {
      label: 'Suspended Vehicles',
      value: safeNumber(stats.suspendedVehicles),
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      trend: 'Under review',
    },
    {
      label: 'Blacklisted',
      value: safeNumber(stats.blacklistedVehicles),
      icon: Ban,
      color: 'bg-gray-100 text-gray-600',
      trend: 'Permanently blocked',
    },
  ];

  const recentCases = violationList.slice(0, 5);
  const recentActivities = Array.isArray(activityLogs) ? activityLogs.slice(0, 5) : [];

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  const handleReviewCases = () => {
    rememberAllCasesFilter('pending');
    onNavigate('all-cases');
  };

  const handleViewAllCases = () => {
    rememberAllCasesFilter('all');
    onNavigate('all-cases');
  };

  return (
    <div className="admin-dashboard-wrapper animate-fade-in space-y-6">
      <header className="admin-dashboard-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="admin-dashboard-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">System Administrator Dashboard</h1>
            <p className="text-blue-200 text-sm mt-1">
              Welcome back, Admin. Here's your system overview.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="admin-dashboard-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {apiError && (
        <div className="admin-dashboard-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="admin-dashboard-metrics grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="admin-dashboard-metric-card bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div
                className={`admin-dashboard-metric-icon w-10 h-10 rounded-lg ${metric.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} />
              </div>

              <p className="text-2xl font-bold text-gray-800">{metric.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{metric.label}</p>
              <p className="admin-dashboard-metric-trend text-[10px] text-gray-400 mt-1">
                {metric.trend}
              </p>
            </article>
          );
        })}
      </section>

      <section className="admin-dashboard-actions grid sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={handleReviewCases}
          className="admin-dashboard-action-card bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group"
        >
          <FileWarning size={24} className="text-orange-500 mb-2" />
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-gray-800">Review Cases</p>
            <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Open
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {safeNumber(stats.pendingCases)} pending approval
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('manage-users')}
          className="admin-dashboard-action-card bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group"
        >
          <Users size={24} className="text-blue-500 mb-2" />
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-gray-800">Manage Users</p>
            <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Open
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {safeNumber(stats.totalUsers)} registered users
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('blacklist')}
          className="admin-dashboard-action-card bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left group"
        >
          <Shield size={24} className="text-red-500 mb-2" />
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-gray-800">Blacklist & Suspensions</p>
            <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Open
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {safeNumber(stats.suspendedVehicles) + safeNumber(stats.blacklistedVehicles)} flagged
          </p>
        </button>
      </section>

      <section className="admin-dashboard-lists grid lg:grid-cols-2 gap-6">
        <div className="admin-dashboard-list-card bg-white rounded-2xl border border-gray-100 p-5">
          <div className="admin-dashboard-list-head flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Cases</h3>

            <button
              type="button"
              onClick={handleViewAllCases}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="admin-dashboard-list-body space-y-3">
            {recentCases.length > 0 ? (
              recentCases.map((violation) => {
                const reviewStatus = getReviewStatus(violation);
                const paymentStatus = getPaymentStatus(violation);

                return (
                  <div
                    key={violation.id || violation._id || violation.caseId}
                    className="admin-dashboard-case-item p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {violation.caseId || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {getVehiclePlate(violation)} • {getViolationTitle(violation)}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          By {getOfficerName(violation)} • {formatMoney(violation.fineAmount)}
                        </p>
                      </div>

                      <div className="admin-dashboard-case-badges flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                        <span
                          className={`admin-dashboard-status-badge px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getCaseStatusClass(
                            reviewStatus
                          )}`}
                        >
                          {formatLabel(reviewStatus)}
                        </span>

                        <span
                          className={`admin-dashboard-payment-badge px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPaymentStatusClass(
                            paymentStatus
                          )}`}
                        >
                          {formatLabel(paymentStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="admin-dashboard-empty-state bg-gray-50 rounded-xl p-6 text-center">
                <FileWarning size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No recent cases found</p>
                <p className="text-xs text-gray-400 mt-1">
                  New E-Challan cases will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="admin-dashboard-list-card bg-white rounded-2xl border border-gray-100 p-5">
          <div className="admin-dashboard-list-head flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Activity</h3>

            <button
              type="button"
              onClick={() => onNavigate('activity-logs')}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="admin-dashboard-list-body space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((log) => (
                <div
                  key={log.id || log._id || `${log.action}-${log.timestamp}`}
                  className="admin-dashboard-activity-item flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`admin-dashboard-activity-dot w-2 h-2 rounded-full mt-1.5 shrink-0 ${getActivityDotClass(
                      log.type
                    )}`}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {getActivityTitle(log)}
                    </p>

                    <p className="text-xs text-gray-500 truncate">
                      {getActivityDetails(log)}
                    </p>

                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {log.userName || 'System'} • {formatActivityTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-dashboard-empty-state bg-gray-50 rounded-xl p-6 text-center">
                <Clock size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No recent activity found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Verification and admin actions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
