import { useMemo, useState } from 'react';
import {
  History,
  Filter,
  Search,
  Activity,
  Shield,
  KeyRound,
  FileWarning,
  Eye,
} from 'lucide-react';

import useStore from '../../store/useStore';
import '../../styles/ActivityLogsPage.css';

const logTypes = ['all', 'verification', 'case', 'admin', 'auth', 'system'];

const typeColors = {
  verification: 'bg-blue-100 text-blue-700',
  case: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
  auth: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
};

const dotColors = {
  verification: 'bg-blue-400',
  case: 'bg-orange-400',
  admin: 'bg-red-400',
  auth: 'bg-green-400',
  system: 'bg-gray-400',
};

const typeIcons = {
  verification: Eye,
  case: FileWarning,
  admin: Shield,
  auth: KeyRound,
  system: Activity,
};

const formatLabel = (value = '') => {
  const text = String(value || 'N/A');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatLogTime = (timestamp) => {
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getLogId = (log, index) => {
  return log?.id || log?._id || `${log?.action || 'log'}-${index}`;
};

const getLogType = (log) => {
  return log?.type || 'system';
};

const getLogAction = (log) => {
  return log?.action || 'System Activity';
};

const getLogDetails = (log) => {
  return log?.details || 'No details available.';
};

const getLogUserName = (log) => {
  return log?.userName || 'System';
};

export default function ActivityLogsPage() {
  const activityLogs = useStore((state) => state.activityLogs);
  const apiError = useStore((state) => state.apiError);

  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const logList = Array.isArray(activityLogs) ? activityLogs : [];

  const filteredLogs = useMemo(() => {
    let nextLogs =
      typeFilter === 'all'
        ? logList
        : logList.filter((log) => getLogType(log) === typeFilter);

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextLogs;
    }

    nextLogs = nextLogs.filter((log) => {
      return (
        getLogAction(log).toLowerCase().includes(query) ||
        getLogDetails(log).toLowerCase().includes(query) ||
        getLogUserName(log).toLowerCase().includes(query) ||
        getLogType(log).toLowerCase().includes(query)
      );
    });

    return nextLogs;
  }, [logList, typeFilter, searchQ]);

  const typeSummary = useMemo(() => {
    return logTypes.reduce((summary, type) => {
      if (type === 'all') {
        summary[type] = logList.length;
      } else {
        summary[type] = logList.filter((log) => getLogType(log) === type).length;
      }

      return summary;
    }, {});
  }, [logList]);

  return (
    <div className="activity-logs-wrapper animate-fade-in space-y-6">
      <header className="activity-logs-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="activity-logs-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History size={26} />
              Activity Logs
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Complete audit trail of all verification, admin, case, and system activities.
            </p>
          </div>
        </div>
      </header>

      {apiError && (
        <div className="activity-logs-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="activity-logs-summary-grid grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {logTypes
          .filter((type) => type !== 'all')
          .map((type) => {
            const Icon = typeIcons[type] || Activity;

            return (
              <article
                key={type}
                className="activity-logs-summary-card bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`activity-logs-summary-icon w-10 h-10 rounded-xl flex items-center justify-center ${
                      typeColors[type] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <p className="text-xl font-bold text-gray-800">
                      {typeSummary[type] || 0}
                    </p>

                    <p className="text-xs text-gray-500">
                      {formatLabel(type)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
      </section>

      <section className="activity-logs-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="activity-logs-filter-row flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="activity-logs-search-wrap relative flex-1">
            <Search
              size={18}
              className="activity-logs-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search logs by action, details, user, or type..."
              className="activity-logs-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            />
          </div>

          <div className="activity-logs-type-filters flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-gray-400" />

            {logTypes.map((type) => {
              const Icon = typeIcons[type] || Activity;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`activity-logs-filter-button px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    typeFilter === type
                      ? 'bg-[#0f4c81] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type !== 'all' && <Icon size={13} />}
                  {type === 'all' ? 'All' : formatLabel(type)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="activity-logs-timeline-card bg-white rounded-2xl border border-gray-100 p-5">
        <div className="activity-logs-card-head flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">System Timeline</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Showing {filteredLogs.length} of {logList.length} total records.
            </p>
          </div>

          <span className="activity-logs-count-badge bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
            {formatLabel(typeFilter)}
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="activity-logs-empty-state py-12 text-center text-gray-400">
            <History size={42} className="mx-auto mb-3 opacity-30" />

            <p className="text-sm font-medium">No logs found</p>

            <p className="text-xs mt-1">
              Try changing the search keyword or selected filter.
            </p>
          </div>
        ) : (
          <div className="activity-logs-timeline space-y-1">
            {filteredLogs.map((log, index) => {
              const logType = getLogType(log);
              const Icon = typeIcons[logType] || Activity;

              return (
                <article
                  key={getLogId(log, index)}
                  className="activity-logs-item flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl"
                >
                  <div className="activity-logs-line-block flex flex-col items-center mt-1">
                    <div
                      className={`activity-logs-dot w-3 h-3 rounded-full shrink-0 ${
                        dotColors[logType] || 'bg-gray-400'
                      }`}
                    />

                    {index < filteredLogs.length - 1 && (
                      <div className="activity-logs-line w-px h-10 bg-gray-200 mt-1" />
                    )}
                  </div>

                  <div className="activity-logs-icon-box w-9 h-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                    <Icon size={17} />
                  </div>

                  <div className="activity-logs-content flex-1 min-w-0">
                    <div className="activity-logs-title-row flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">
                        {getLogAction(log)}
                      </p>

                      <span
                        className={`activity-logs-type-badge px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          typeColors[logType] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formatLabel(logType)}
                      </span>
                    </div>

                    <p className="activity-logs-details text-xs text-gray-500 mt-1">
                      {getLogDetails(log)}
                    </p>

                    <p className="activity-logs-meta text-[10px] text-gray-400 mt-1">
                      {getLogUserName(log)} • {formatLogTime(log.timestamp || log.createdAt)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}