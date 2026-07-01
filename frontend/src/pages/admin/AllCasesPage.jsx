import { useEffect, useMemo, useState } from 'react';
import {
  FileWarning,
  Filter,
  Check,
  X,
  Loader2,
} from 'lucide-react';

import useStore from '../../store/useStore';
import Pagination from '../../components/Pagination';
import '../../styles/AllCasesPage.css';

const formatMoney = (amount) => {
  return `৳${Number(amount || 0).toLocaleString()}`;
};

const formatDate = (value) => {
  if (!value) {
    return 'Date missing';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date missing';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatText = (value) => {
  const text = String(value || 'N/A');
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

  if (status === 'unpaid') {
    return 'bg-gray-100 text-gray-600';
  }

  return 'bg-gray-100 text-gray-600';
};

const getPaymentStatus = (caseItem) => {
  if (caseItem.status === 'paid') {
    return 'paid';
  }

  if (caseItem.status === 'unpaid') {
    return 'unpaid';
  }

  if (caseItem.status === 'dismissed') {
    return 'waived';
  }

  return caseItem.paymentStatus || 'unpaid';
};

const getReviewStatus = (caseItem) => {
  const status = String(caseItem?.status || 'pending').toLowerCase();

  if (status === 'unpaid') {
    return 'approved';
  }

  return status;
};

const getPaymentBadgeClass = (paymentStatus) => {
  if (paymentStatus === 'paid') {
    return 'bg-blue-100 text-blue-700';
  }

  if (paymentStatus === 'waived') {
    return 'bg-purple-100 text-purple-700';
  }

  if (paymentStatus === 'partial') {
    return 'bg-yellow-100 text-yellow-700';
  }

  return 'bg-gray-100 text-gray-600';
};

const filterOptions = [
  'all',
  'pending',
  'approved',
  'dismissed',
  'paid',
  'unpaid',
];

const CASES_PER_PAGE = 10;

export default function AllCasesPage() {
  const violations = useStore((state) => state.violations);
  const updateViolationStatus = useStore((state) => state.updateViolationStatus);
  const fetchAdminCases = useStore((state) => state.fetchAdminCases);
  const addLog = useStore((state) => state.addLog);
  const currentUser = useStore((state) => state.currentUser);
  const apiError = useStore((state) => state.apiError);

  const [filter, setFilter] = useState(() => {
    try {
      const savedFilter = window.sessionStorage.getItem('stves_admin_cases_filter');

      if (filterOptions.includes(savedFilter)) {
        window.sessionStorage.removeItem('stves_admin_cases_filter');
        return savedFilter;
      }
    } catch {
      // Ignore storage errors and keep default filter.
    }

    return 'all';
  });
  const [searchQ, setSearchQ] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (typeof fetchAdminCases === 'function') {
      fetchAdminCases();
    }
  }, [fetchAdminCases]);

  const filteredCases = useMemo(() => {
    const caseList = Array.isArray(violations) ? violations : [];

    let nextCases = caseList;

    if (filter !== 'all') {
      nextCases = caseList.filter((caseItem) => {
        const paymentStatus = getPaymentStatus(caseItem);

        if (filter === 'paid' || filter === 'unpaid') {
          return paymentStatus === filter || caseItem.status === filter;
        }

        return getReviewStatus(caseItem) === filter;
      });
    }

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextCases;
    }

    return nextCases.filter((caseItem) => {
      return (
        (caseItem.caseId || '').toLowerCase().includes(query) ||
        (caseItem.plateNumber || '').toLowerCase().includes(query) ||
        (caseItem.registrationNumber || '').toLowerCase().includes(query) ||
        (caseItem.driverName || '').toLowerCase().includes(query) ||
        (caseItem.officerName || '').toLowerCase().includes(query) ||
        (caseItem.violationType || '').toLowerCase().includes(query) ||
        (caseItem.violationLabel || '').toLowerCase().includes(query)
      );
    });
  }, [violations, filter, searchQ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQ, violations.length]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / CASES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * CASES_PER_PAGE;
  const paginatedCases = filteredCases.slice(pageStartIndex, pageStartIndex + CASES_PER_PAGE);

  const writeAdminLog = ({ caseId, action, details, type = 'admin' }) => {
    if (!currentUser) {
      return;
    }

    addLog({
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details: details || `Case ${caseId} updated by ${currentUser.name}.`,
      type,
    });
  };

  const handleStatusChange = async (caseItem, nextStatus) => {
    const violationId = caseItem.id || caseItem._id;

    if (!violationId) {
      return;
    }

    try {
      setUpdatingId(violationId);
      await updateViolationStatus(violationId, nextStatus);

      writeAdminLog({
        caseId: caseItem.caseId,
        action: `Case ${nextStatus === 'approved' ? 'Approved' : 'Dismissed'}`,
        details: `Case ${caseItem.caseId} has been ${nextStatus} by ${currentUser?.name || 'Admin'}.`,
      });
    } finally {
      setUpdatingId('');
    }
  };

  const handlePaymentChange = async (caseItem, nextPaymentStatus) => {
    const violationId = caseItem.id || caseItem._id;

    if (!violationId) {
      return;
    }

    try {
      setUpdatingId(violationId);
      await updateViolationStatus(violationId, nextPaymentStatus);

      writeAdminLog({
        caseId: caseItem.caseId,
        action: `Payment ${nextPaymentStatus === 'paid' ? 'Marked Paid' : 'Marked Unpaid'}`,
        details: `Payment for case ${caseItem.caseId} has been marked as ${nextPaymentStatus}.`,
      });
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="all-cases-wrapper animate-fade-in space-y-6">
      <header className="all-cases-header">
        <h1 className="text-2xl font-bold text-gray-800">
          All Enforcement Cases
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Review, approve, and dismiss E-Challan cases. Payments are completed by drivers or owners.
        </p>
      </header>

      {apiError && (
        <div className="all-cases-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="all-cases-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="all-cases-filter-row flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQ}
            onChange={(event) => setSearchQ(event.target.value)}
            placeholder="Search by case ID, plate, driver, officer, or violation..."
            className="all-cases-search-input flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
          />

          <div className="all-cases-filter-actions flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-gray-400" />

            {filterOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`all-cases-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${filter === item
                  ? 'bg-[#0f4c81] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {formatText(item)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="all-cases-table-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredCases.length === 0 ? (
          <div className="all-cases-empty-state p-12 text-center text-gray-400">
            <FileWarning size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No cases found</p>
            <p className="text-xs mt-1">
              Try changing the search keyword or selected filter.
            </p>
          </div>
        ) : (
          <div className="all-cases-table-scroll overflow-x-auto">
            <table className="all-cases-table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Case ID
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Vehicle
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Driver
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Violation
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Fine
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Officer
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Payment
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {paginatedCases.map((caseItem) => {
                  const violationId = caseItem.id || caseItem._id;
                  const isUpdating = updatingId === violationId;
                  const paymentStatus = getPaymentStatus(caseItem);
                  const caseStatus = getReviewStatus(caseItem);

                  return (
                    <tr
                      key={violationId || caseItem.caseId}
                      className="all-cases-table-row hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">
                          {caseItem.caseId || 'N/A'}
                        </p>

                        <p className="text-[10px] text-gray-400">
                          {formatDate(caseItem.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {caseItem.plateNumber ||
                          caseItem.registrationNumber ||
                          'N/A'}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {caseItem.driverName || 'N/A'}
                      </td>

                      <td className="px-5 py-3">
                        <p className="text-gray-600 max-w-[220px] truncate">
                          {caseItem.description ||
                            caseItem.violationLabel ||
                            caseItem.violationType ||
                            'N/A'}
                        </p>
                      </td>

                      <td className="px-5 py-3 font-semibold text-gray-800">
                        {formatMoney(caseItem.fineAmount)}
                      </td>

                      <td className="px-5 py-3 text-gray-600">
                        {caseItem.officerName || 'N/A'}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`all-cases-status-badge inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                            caseStatus
                          )}`}
                        >
                          {formatText(caseStatus)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`all-cases-payment-badge inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentBadgeClass(
                            paymentStatus
                          )}`}
                        >
                          {formatText(paymentStatus)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="all-cases-action-group flex items-center gap-1">
                          {caseStatus === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(caseItem, 'approved')}
                                className="all-cases-icon-button p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                                title="Approve case"
                              >
                                {isUpdating ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(caseItem, 'dismissed')}
                                className="all-cases-icon-button p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                title="Dismiss case"
                              >
                                {isUpdating ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <X size={14} />
                                )}
                              </button>
                            </>
                          )}

                          {caseStatus === 'approved' && paymentStatus !== 'paid' && (
                            <span
                              className="rounded-lg bg-yellow-50 px-2.5 py-1 text-[11px] font-semibold text-yellow-700"
                              title="Payment must be completed by driver or owner"
                            >
                              Waiting payment
                            </span>
                          )}

                          {paymentStatus === 'paid' && (
                            <span
                              className="rounded-lg bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700"
                              title="Payment completed by user payment flow"
                            >
                              Payment done
                            </span>
                          )}

                          {caseStatus === 'dismissed' && (
                            <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                              No action
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        currentPage={safeCurrentPage}
        totalItems={filteredCases.length}
        pageSize={CASES_PER_PAGE}
        onPageChange={setCurrentPage}
        itemLabel="filtered case records"
      />
    </div>
  );
}