import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  Car,
  CheckCircle,
  Clock3,
  CreditCard,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/AnalyticsPage.css';

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (value) => {
  return `৳${safeNumber(value).toLocaleString()}`;
};

const getPercent = (value, total) => {
  const safeTotal = safeNumber(total);

  if (safeTotal <= 0) {
    return 0;
  }

  return Math.round((safeNumber(value) / safeTotal) * 100);
};

const getMonthLabel = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString('en-GB', {
    month: 'short',
  });
};

const getViolationType = (item) => {
  return (
    item.violationCode ||
    item.ruleCode ||
    item.violationLabel ||
    item.violationType ||
    item.description ||
    'Other'
  );
};

const getTopItems = (items, keyGetter, limit = 5) => {
  const counter = {};

  items.forEach((item) => {
    const key = keyGetter(item) || 'Other';
    counter[key] = (counter[key] || 0) + 1;
  });

  return Object.entries(counter)
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

const normalizeBreakdownItems = (items = [], limit = 6) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      label: item.label || item._id || item.type || item.name || 'Other',
      value: safeNumber(item.value ?? item.count ?? item.total ?? 0),
      totalFine: safeNumber(item.totalFine ?? item.fineAmount ?? 0),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'];

const getMonthlyCases = (items) => {
  const counter = {};

  items.forEach((item) => {
    const month = getMonthLabel(item.createdAt || item.issuedAt || item.issueDate || item.date);
    counter[month] = (counter[month] || 0) + 1;
  });

  return Object.entries(counter)
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((a, b) => {
      const aIndex = monthOrder.indexOf(a.label);
      const bIndex = monthOrder.indexOf(b.label);

      if (aIndex === -1 || bIndex === -1) {
        return a.label.localeCompare(b.label);
      }

      return aIndex - bIndex;
    });
};

const normalizeMonthlyItems = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      label: item.label || item.month || item._id || 'Unknown',
      value: safeNumber(item.value ?? item.count ?? item.total ?? 0),
      monthNumber: safeNumber(item.monthNumber),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => {
      if (a.monthNumber && b.monthNumber) {
        return a.monthNumber - b.monthNumber;
      }

      const aIndex = monthOrder.indexOf(a.label);
      const bIndex = monthOrder.indexOf(b.label);

      if (aIndex === -1 || bIndex === -1) {
        return a.label.localeCompare(b.label);
      }

      return aIndex - bIndex;
    });
};

const getStatusCount = (items, status) => {
  return items.filter((item) => item.status === status).length;
};

const getPaymentCount = (items, status) => {
  return items.filter((item) => item.paymentStatus === status || item.status === status).length;
};

const getMaxValue = (items) => {
  const values = items.map((item) => safeNumber(item.value));
  return Math.max(...values, 1);
};

export default function AnalyticsPage() {
  const getStats = useStore((state) => state.getStats);
  const violations = useStore((state) => state.violations);
  const activityLogs = useStore((state) => state.activityLogs);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const isLoading = useStore((state) => state.isLoading);
  const apiError = useStore((state) => state.apiError);

  const stats = typeof getStats === 'function' ? getStats() : {};
  const violationList = Array.isArray(violations) ? violations : [];
  const logList = Array.isArray(activityLogs) ? activityLogs : [];

  const totalCases = safeNumber(stats.totalViolations || violationList.length);
  const pendingCases = safeNumber(stats.pendingCases ?? getStatusCount(violationList, 'pending'));
  const approvedCases = safeNumber(stats.approvedCases ?? getStatusCount(violationList, 'approved'));
  const dismissedCases = safeNumber(stats.dismissedCases ?? getStatusCount(violationList, 'dismissed'));
  const paidCases = safeNumber(stats.paidPaymentCases ?? stats.paidCases ?? getPaymentCount(violationList, 'paid'));
  const unpaidCases = safeNumber(
    stats.unpaidCases ??
    violationList.filter(
      (item) =>
        item.paymentStatus !== 'paid' &&
        item.status !== 'paid' &&
        item.status !== 'dismissed'
    ).length
  );

  const appVehicleTotal = safeNumber(stats.totalVehicles);
  const brtaVehicleTotal = safeNumber(stats.totalBrtaVehicles);
  const activeAppVehicles = safeNumber(stats.activeVehicles);
  const activeBrtaVehicles = safeNumber(stats.activeBrtaVehicles);

  const totalVehicleRecords = Math.max(
    safeNumber(stats.totalVehicleRecords),
    appVehicleTotal,
    brtaVehicleTotal,
    activeAppVehicles,
    activeBrtaVehicles
  );

  const activeVehicleRecords = Math.min(
    Math.max(safeNumber(stats.activeVehicleRecords), activeAppVehicles, activeBrtaVehicles),
    totalVehicleRecords || Math.max(activeAppVehicles, activeBrtaVehicles)
  );

  const totalFines = safeNumber(
    stats.totalFines ??
    violationList.reduce((sum, item) => sum + safeNumber(item.fineAmount), 0)
  );

  const paidFineEstimate = safeNumber(
    stats.paidRevenue ??
    violationList
      .filter((item) => item.status === 'paid' || item.paymentStatus === 'paid')
      .reduce((sum, item) => sum + safeNumber(item.fineAmount), 0)
  );

  const unpaidFineEstimate = safeNumber(
    stats.unpaidFines ?? Math.max(totalFines - paidFineEstimate, 0)
  );

  const violationTypeData = useMemo(() => {
    const backendBreakdown = normalizeBreakdownItems(stats.violationTypeBreakdown, 6);

    if (backendBreakdown.length > 0) {
      return backendBreakdown;
    }

    return getTopItems(violationList, getViolationType, 6);
  }, [stats.violationTypeBreakdown, violationList]);

  const monthlyCaseData = useMemo(() => {
    const backendMonthly = normalizeMonthlyItems(stats.monthlyCaseTrend);

    if (backendMonthly.length > 0) {
      return backendMonthly;
    }

    return getMonthlyCases(violationList);
  }, [stats.monthlyCaseTrend, violationList]);

  const maxViolationTypeValue = getMaxValue(violationTypeData);
  const maxMonthlyCaseValue = getMaxValue(monthlyCaseData);

  const overviewCards = [
    {
      label: 'Total Users',
      value: safeNumber(stats.totalUsers),
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      note: `${safeNumber(stats.totalPolice)} police officers`,
    },
    {
      label: 'BRTA Vehicle Records',
      value: totalVehicleRecords,
      icon: Car,
      color: 'bg-green-50 text-green-600',
      note: `${appVehicleTotal} STVES registered • ${activeVehicleRecords} active`,
    },
    {
      label: 'Total Cases',
      value: totalCases,
      icon: FileWarning,
      color: 'bg-orange-50 text-orange-600',
      note: `${pendingCases} pending review`,
    },
    {
      label: 'Total Fine Amount',
      value: formatMoney(totalFines),
      icon: Banknote,
      color: 'bg-purple-50 text-purple-600',
      note: `${formatMoney(paidFineEstimate)} collected`,
    },
  ];

  const caseStatusCards = [
    {
      label: 'Pending Review',
      value: pendingCases,
      percent: getPercent(pendingCases, totalCases),
      icon: Clock3,
      color: 'bg-orange-500',
      badge: 'bg-orange-100 text-orange-700',
    },
    {
      label: 'Approved Cases',
      value: approvedCases,
      percent: getPercent(approvedCases, totalCases),
      icon: CheckCircle,
      color: 'bg-green-500',
      badge: 'bg-green-100 text-green-700',
    },
    {
      label: 'Dismissed',
      value: dismissedCases,
      percent: getPercent(dismissedCases, totalCases),
      icon: XCircle,
      color: 'bg-red-500',
      badge: 'bg-red-100 text-red-700',
    },
    {
      label: 'Paid Payments',
      value: paidCases,
      percent: getPercent(paidCases, totalCases),
      icon: CreditCard,
      color: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-700',
    },
  ];

  const systemHealth = [
    {
      label: 'Verification Logs',
      value: safeNumber(stats.totalVerificationLogs || logList.length),
      icon: Activity,
    },
    {
      label: 'Active Assignments',
      value: safeNumber(stats.activeAssignments),
      icon: ShieldCheck,
    },
    {
      label: 'Unpaid Cases',
      value: unpaidCases,
      icon: AlertTriangle,
    },
  ];

  const handleRefresh = async () => {
    if (typeof fetchDashboardData === 'function') {
      await fetchDashboardData();
    }
  };

  return (
    <div className="analytics-page-wrapper animate-fade-in space-y-6">
      <header className="analytics-page-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="analytics-page-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 size={26} />
              Analytics Overview
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Monitor traffic enforcement performance, case status, fines, and system activity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh analytics data"
            aria-label="Refresh analytics data"
            className="analytics-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {apiError && (
        <div className="analytics-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="analytics-overview-grid grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="analytics-overview-card bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`analytics-overview-icon w-11 h-11 rounded-xl ${card.color} flex items-center justify-center`}
                >
                  <Icon size={22} />
                </div>

                <TrendingUp size={18} className="text-gray-300" />
              </div>

              <p className="text-2xl font-bold text-gray-800 mt-4">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 mt-2">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="analytics-status-grid grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {caseStatusCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="analytics-status-card bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`analytics-status-badge px-2.5 py-1 rounded-full text-xs font-medium ${card.badge}`}
                >
                  {card.label}
                </span>

                <Icon size={20} className="text-gray-400" />
              </div>

              <p className="text-3xl font-bold text-gray-800 mt-4">{card.value}</p>

              <div className="analytics-progress-track h-2 bg-gray-100 rounded-full overflow-hidden mt-4">
                <div
                  className={`analytics-progress-fill h-full rounded-full ${card.color}`}
                  style={{ width: `${card.percent}%` }}
                />
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {card.percent}% of total cases
              </p>
            </article>
          );
        })}
      </section>

      <section className="analytics-main-grid grid xl:grid-cols-3 gap-6">
        <article className="analytics-chart-card xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="analytics-card-head flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Monthly Case Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Number of E-Challan cases by available monthly records
              </p>
            </div>

            <BarChart3 size={20} className="text-gray-300" />
          </div>

          {monthlyCaseData.length === 0 ? (
            <EmptyChart message="No monthly case data available." />
          ) : (
            <div className="analytics-bar-chart">
              {monthlyCaseData.map((item) => {
                const barHeight = Math.max((item.value / maxMonthlyCaseValue) * 100, 8);

                return (
                  <div key={item.label} className="analytics-bar-item">
                    <div className="analytics-bar-value">{item.value}</div>

                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill bg-[#0f4c81]"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>

                    <p className="analytics-bar-label">{item.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="analytics-health-card bg-white rounded-2xl border border-gray-100 p-5">
          <div className="analytics-card-head mb-5">
            <h2 className="font-semibold text-gray-800">System Health</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Quick operational indicators
            </p>
          </div>

          <div className="analytics-health-list space-y-3">
            {systemHealth.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="analytics-health-row flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="analytics-health-icon w-9 h-9 rounded-lg bg-white text-[#0f4c81] flex items-center justify-center">
                    <Icon size={18} />
                  </div>

                  <div>
                    <p className="text-lg font-bold text-gray-800">{item.value}</p>
                    <p className="text-xs text-gray-400">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="analytics-fine-box mt-5 rounded-xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-4 text-white">
            <p className="text-xs text-blue-100">Outstanding Fine Estimate</p>
            <p className="text-2xl font-bold mt-1">
              {formatMoney(unpaidFineEstimate)}
            </p>
            <p className="text-xs text-blue-100 mt-1">
              Based on unpaid and not-dismissed case data.
            </p>
          </div>
        </article>
      </section>

      <section className="analytics-breakdown-card bg-white rounded-2xl border border-gray-100 p-5">
        <div className="analytics-card-head flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-gray-800">Top Violation Types</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Most frequent violation categories from backend analytics
            </p>
          </div>

          <FileWarning size={20} className="text-gray-300" />
        </div>

        {violationTypeData.length === 0 ? (
          <EmptyChart message="No violation type data available." />
        ) : (
          <div className="analytics-breakdown-list space-y-4">
            {violationTypeData.map((item) => {
              const width = Math.max((item.value / maxViolationTypeValue) * 100, 6);

              return (
                <div key={item.label} className="analytics-breakdown-row">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {item.label}
                    </p>

                    <span className="text-xs font-semibold text-gray-500">
                      {item.value}
                    </span>
                  </div>

                  <div className="analytics-breakdown-track h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="analytics-breakdown-fill h-full rounded-full bg-[#1a73e8]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="analytics-empty-chart rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-10 text-center">
      <BarChart3 size={34} className="mx-auto text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}