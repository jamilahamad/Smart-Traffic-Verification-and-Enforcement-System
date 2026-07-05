import {
  Search,
  QrCode,
  FileWarning,
  Shield,
  AlertTriangle,
  Clock,
  Car,
  CheckCircle,
  CreditCard,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/PoliceDashboard.css';

const getUserId = (user) => {
  return user?.id || user?._id || '';
};

const getViolationId = (violation) => {
  return violation?.id || violation?._id || violation?.caseId || '';
};

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount) => {
  return `৳${safeNumber(amount).toLocaleString()}`;
};

const isToday = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
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

const formatStatus = (status = '') => {
  const text = String(status || 'unknown').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getStatusBadgeClass = (status) => {
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

const getStatusDotClass = (status) => {
  if (status === 'pending') {
    return 'bg-orange-400';
  }

  if (status === 'approved') {
    return 'bg-green-400';
  }

  if (status === 'dismissed') {
    return 'bg-red-400';
  }

  if (status === 'paid') {
    return 'bg-blue-400';
  }

  return 'bg-gray-400';
};

const getCaseVehicleDisplay = (caseItem) => {
  return (
    caseItem?.plateNumber ||
    caseItem?.registrationNumber ||
    caseItem?.vehicle?.registrationNumber ||
    caseItem?.vehicle?.plateNumber ||
    'Vehicle not linked'
  );
};

const getCaseDriverDisplay = (caseItem) => {
  return (
    caseItem?.driverName ||
    caseItem?.driver?.name ||
    caseItem?.license?.holderName ||
    'No assigned driver'
  );
};

const getActivityTitle = (activity) => {
  const searchType = activity?.searchType || activity?.type;

  if (searchType) {
    return `${formatStatus(searchType)} verification`;
  }

  return activity?.action || 'Verification Activity';
};

const getActivityDetails = (activity) => {
  const searchValue =
    activity?.searchValue ||
    activity?.registrationNumber ||
    activity?.plateNumber ||
    activity?.licenseNumber ||
    activity?.details ||
    '';

  const result = activity?.result || activity?.status || '';

  if (searchValue && result) {
    return `${searchValue} • ${formatStatus(result)}`;
  }

  if (searchValue) {
    return searchValue;
  }

  return 'Verification record captured';
};

const getActivityResultClass = (activity) => {
  const result = String(activity?.result || activity?.status || '').toLowerCase();

  if (['valid', 'success', 'approved', 'active'].includes(result)) {
    return 'bg-green-50 text-green-600';
  }

  if (['invalid', 'failed', 'rejected', 'expired', 'suspended'].includes(result)) {
    return 'bg-red-50 text-red-600';
  }

  return 'bg-blue-50 text-blue-600';
};

export default function PoliceDashboard({ onNavigate = () => { } }) {
  const currentUser = useStore((state) => state.currentUser);
  const violations = useStore((state) => state.violations);
  const vehicles = useStore((state) => state.vehicles);
  const verificationLogs = useStore((state) => state.verificationLogs);
  const activityLogs = useStore((state) => state.activityLogs);
  const apiError = useStore((state) => state.apiError);

  const currentUserId = getUserId(currentUser);
  const violationList = Array.isArray(violations) ? violations : [];
  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const logList = Array.isArray(verificationLogs) ? verificationLogs : [];
  const activityList = Array.isArray(activityLogs) ? activityLogs : [];

  const myCases = violationList.filter((violation) => {
    if (!currentUserId) {
      return false;
    }

    return (
      violation.officerId === currentUserId ||
      violation.officer === currentUserId ||
      violation.officer?._id === currentUserId ||
      violation.officer?.id === currentUserId
    );
  });

  const pendingCases = myCases.filter((violation) => violation.status === 'pending').length;
  const approvedCases = myCases.filter((violation) => violation.status === 'approved').length;
  const paidCases = myCases.filter(
    (violation) => violation.status === 'paid' || violation.paymentStatus === 'paid'
  ).length;
  const todayCases = myCases.filter((violation) => isToday(violation.createdAt)).length;

  const todayVerifications = logList.filter((log) => isToday(log.timestamp || log.createdAt)).length;

  const totalFineIssued = myCases.reduce((sum, violation) => {
    return sum + safeNumber(violation.fineAmount);
  }, 0);

  const stats = [
    {
      label: 'Total Cases Issued',
      value: myCases.length,
      icon: FileWarning,
      color: 'bg-blue-50 text-blue-600',
      note: `${approvedCases} approved`,
    },
    {
      label: 'Pending Review',
      value: pendingCases,
      icon: Clock,
      color: 'bg-orange-50 text-orange-600',
      note: 'Awaiting admin approval',
    },
    {
      label: "Today's E-Challans",
      value: todayCases,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      note: `${todayVerifications} verification checks`,
    },
    {
      label: 'Vehicles in System',
      value: vehicleList.length,
      icon: Car,
      color: 'bg-green-50 text-green-600',
      note: 'Available for verification',
    },
  ];

  const quickActions = [
    {
      label: 'Verify Vehicle / Driver',
      description: 'Search vehicle or license information',
      icon: Search,
      page: 'verify',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Scan QR Code',
      description: 'Scan STVES QR for instant verification',
      icon: QrCode,
      page: 'qr-scan',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Create E-Challan',
      description: 'Issue a new digital violation case',
      icon: FileWarning,
      page: 'create-case',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const recentCases = myCases.slice(0, 5);
  const recentActivities = (logList.length > 0 ? logList : activityList).slice(0, 5);

  return (
    <div className="police-dashboard-wrapper animate-fade-in space-y-6">
      <header className="police-dashboard-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="police-dashboard-header-content flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm">Welcome back,</p>

            <h1 className="text-2xl font-bold mt-1">
              {currentUser?.name || 'Police Officer'}
            </h1>

            <div className="police-dashboard-user-meta flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm text-blue-200">
                Badge: {currentUser?.badge || 'N/A'}
              </span>

              <span className="text-blue-300">•</span>

              <span className="text-sm text-blue-200">
                {currentUser?.station || 'Traffic Police Station'}
              </span>
            </div>
          </div>

          <div className="police-dashboard-header-actions flex items-center gap-3">

            <div className="police-dashboard-shield w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield size={24} />
            </div>
          </div>
        </div>
      </header>

      {apiError && (
        <div className="police-dashboard-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="police-dashboard-stats grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="police-dashboard-stat-card bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div
                className={`police-dashboard-stat-icon w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} />
              </div>

              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>

              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>

              <p className="text-[10px] text-gray-400 mt-1">{stat.note}</p>
            </article>
          );
        })}
      </section>

      <section className="police-dashboard-summary-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="police-dashboard-summary-card bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="police-dashboard-summary-icon w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle size={22} />
            </div>

            <div>
              <p className="text-2xl font-bold text-gray-800">{approvedCases}</p>
              <p className="text-xs text-gray-500">Approved Cases</p>
            </div>
          </div>
        </article>

        <article className="police-dashboard-summary-card bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="police-dashboard-summary-icon w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={22} />
            </div>

            <div>
              <p className="text-2xl font-bold text-gray-800">{paidCases}</p>
              <p className="text-xs text-gray-500">Paid Cases</p>
            </div>
          </div>
        </article>

        <article className="police-dashboard-summary-card bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="police-dashboard-summary-icon w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileWarning size={22} />
            </div>

            <div>
              <p className="text-2xl font-bold text-gray-800">
                {formatMoney(totalFineIssued)}
              </p>
              <p className="text-xs text-gray-500">Total Fine Issued</p>
            </div>
          </div>
        </article>

        <article className="police-dashboard-summary-card bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="police-dashboard-summary-icon w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Search size={22} />
            </div>

            <div>
              <p className="text-2xl font-bold text-gray-800">{logList.length}</p>
              <p className="text-xs text-gray-500">Verification Logs</p>
            </div>
          </div>
        </article>
      </section>

      <section className="police-dashboard-action-section">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>

        <div className="police-dashboard-actions grid sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.page}
                type="button"
                onClick={() => onNavigate(action.page)}
                className={`police-dashboard-action-card bg-gradient-to-br ${action.color} text-white rounded-xl p-5 text-left hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                <Icon size={28} className="mb-3" />

                <p className="font-semibold">{action.label}</p>

                <p className="text-sm text-white/70 mt-1">{action.description}</p>

                <p className="text-xs text-white/60 mt-3">Click to proceed →</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="police-dashboard-lists grid lg:grid-cols-2 gap-6">
        <div className="police-dashboard-list-card bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="police-dashboard-list-head flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Recent Cases</h2>

              <p className="text-xs text-gray-400 mt-0.5">
                Latest E-Challan cases issued by you
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('my-cases')}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>

          {recentCases.length === 0 ? (
            <div className="police-dashboard-empty-state p-8 text-center text-gray-400">
              <FileWarning size={40} className="mx-auto mb-3 opacity-30" />

              <p className="text-sm font-medium">No cases issued yet</p>

              <p className="text-xs mt-1">
                Start by verifying a vehicle or driver.
              </p>
            </div>
          ) : (
            <div className="police-dashboard-case-list divide-y divide-gray-50">
              {recentCases.map((caseItem) => {
                const caseStatus = caseItem.status || 'pending';

                return (
                  <div
                    key={getViolationId(caseItem)}
                    className="police-dashboard-case-item p-4 hover:bg-gray-50 flex items-center justify-between gap-4"
                  >
                    <div className="police-dashboard-case-left flex items-center gap-3 min-w-0">
                      <div
                        className={`police-dashboard-case-dot w-2 h-2 rounded-full shrink-0 ${getStatusDotClass(
                          caseStatus
                        )}`}
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {caseItem.caseId || 'N/A'}
                        </p>

                        <p className="text-xs text-gray-400 truncate">
                          {getCaseVehicleDisplay(caseItem)} — {getCaseDriverDisplay(caseItem)}
                        </p>

                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(caseItem.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="police-dashboard-case-right text-right shrink-0">
                      <span
                        className={`police-dashboard-status-badge inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          caseStatus
                        )}`}
                      >
                        {formatStatus(caseStatus)}
                      </span>

                      <p className="text-xs text-gray-400 mt-1">
                        {formatMoney(caseItem.fineAmount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="police-dashboard-list-card bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="police-dashboard-list-head flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Verification Activity
              </h2>

              <p className="text-xs text-gray-400 mt-0.5">
                Latest system verification logs
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('verify')}
              className="text-xs text-blue-600 hover:underline"
            >
              Verify Now
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="police-dashboard-empty-state p-8 text-center text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />

              <p className="text-sm font-medium">No recent activity</p>

              <p className="text-xs mt-1">
                Verification activity will appear here.
              </p>
            </div>
          ) : (
            <div className="police-dashboard-activity-list divide-y divide-gray-50">
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id || activity._id || `${activity.action}-${index}`}
                  className="police-dashboard-activity-item p-4 hover:bg-gray-50 flex items-start gap-3"
                >
                  <div
                    className={`police-dashboard-activity-icon w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getActivityResultClass(
                      activity
                    )}`}
                  >
                    <Search size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {getActivityTitle(activity)}
                    </p>

                    <p className="text-xs text-gray-400 truncate">
                      {getActivityDetails(activity)}
                    </p>

                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDate(activity.timestamp || activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}