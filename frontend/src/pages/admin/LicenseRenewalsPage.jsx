import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  FileCheck2,
  FileText,
  IdCard,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import '../../styles/LicenseRenewalsPage.css';

const getId = (item) => {
  if (!item) return '';

  if (typeof item === 'string') return item;

  return item._id || item.id || '';
};

const extractRequests = (response) => {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.requests)) return payload.requests;
  if (Array.isArray(payload.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload.items)) return payload.items;

  return [];
};

const formatDate = (value) => {
  if (!value) return 'N/A';

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

const getInputDate = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const formatStatus = (value = '') => {
  return String(value || 'N/A')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (status = '') => {
  const value = String(status).toLowerCase();

  if (value === 'approved') {
    return 'bg-green-100 text-green-700';
  }

  if (['submitted', 'under_review'].includes(value)) {
    return 'bg-orange-100 text-orange-700';
  }

  if (value === 'rejected') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

const getProofLabel = (proofType = '') => {
  const labels = {
    brta_receipt: 'BRTA Receipt',
    renewal_application: 'Renewal Application',
    digital_slip: 'Digital Slip',
    other: 'Other',
  };

  return labels[proofType] || formatStatus(proofType);
};

const getDriverName = (request) => {
  return request?.driver?.name || request?.driverName || 'N/A';
};

const getDriverEmail = (request) => {
  return request?.driver?.email || 'N/A';
};

const getDriverPhone = (request) => {
  return request?.driver?.phone || 'N/A';
};

const getLicenseHolder = (request) => {
  return request?.license?.holderName || request?.driver?.name || 'N/A';
};

const getLicenseStatus = (request) => {
  return request?.license?.status || 'N/A';
};

export default function LicenseRenewalsPage() {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewForms, setReviewForms] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRequests = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.getPendingRenewalRequests();
      const records = extractRequests(response);

      setRequests(records);

      const formState = {};

      records.forEach((request) => {
        const id = getId(request);

        formState[id] = {
          approvedExpiryDate:
            getInputDate(request.requestedExpiryDate) ||
            getInputDate(request.approvedExpiryDate),
          reviewNote: '',
        };
      });

      setReviewForms(formState);
    } catch (err) {
      setError(err?.message || 'Failed to load renewal requests.');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return requests;
    }

    return requests.filter((request) => {
      const searchable = [
        request.licenseNumber,
        request.proofReference,
        request.proofNote,
        request.status,
        getDriverName(request),
        getDriverEmail(request),
        getDriverPhone(request),
        getLicenseHolder(request),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [requests, searchTerm]);

  const submittedCount = requests.filter((item) => item.status === 'submitted').length;
  const underReviewCount = requests.filter((item) => item.status === 'under_review').length;

  const handleFormChange = (requestId, field, value) => {
    setReviewForms((previous) => ({
      ...previous,
      [requestId]: {
        ...(previous[requestId] || {}),
        [field]: value,
      },
    }));
  };

  const handleReview = async (request, status) => {
    const requestId = getId(request);
    const form = reviewForms[requestId] || {};

    setError('');
    setSuccess('');

    if (status === 'approved' && !form.approvedExpiryDate) {
      setError('Approved expiry date is required.');
      return;
    }

    setActionId(`${requestId}-${status}`);

    try {
      const payload =
        status === 'approved'
          ? {
            status: 'approved',
            approvedExpiryDate: form.approvedExpiryDate,
            reviewNote: form.reviewNote || 'BRTA renewal proof verified.',
          }
          : status === 'under_review'
            ? {
              status: 'under_review',
              reviewNote: form.reviewNote || 'Renewal proof is under admin review.',
            }
            : {
              status: 'rejected',
              reviewNote: form.reviewNote || 'Renewal proof rejected.',
            };

      await api.reviewRenewalRequest(requestId, payload);

      setSuccess(
        status === 'approved'
          ? `Renewal request for ${request.licenseNumber} approved successfully.`
          : status === 'under_review'
            ? `Renewal request for ${request.licenseNumber} marked as under review.`
            : `Renewal request for ${request.licenseNumber} rejected successfully.`
      );

      await loadRequests();
    } catch (err) {
      setError(err?.message || `Failed to ${status} renewal request.`);
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="license-renewals-wrapper animate-fade-in space-y-6">
      <header className="license-renewals-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="license-renewals-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCheck2 size={26} />
              License Renewal Requests
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Review driver renewal proof submissions and update official license status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={isLoading}
            className="license-renewals-refresh-button bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="license-renewals-alert license-renewals-alert-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="license-renewals-alert license-renewals-alert-success">
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      <section className="license-renewals-stats-grid grid md:grid-cols-3 gap-4">
        <StatCard
          icon={FileText}
          label="Open Requests"
          value={requests.length}
          hint="Waiting for admin review"
          tone="blue"
        />

        <StatCard
          icon={ClockIcon}
          label="Submitted"
          value={submittedCount}
          hint="Newly submitted proof"
          tone="orange"
        />

        <StatCard
          icon={ShieldCheck}
          label="Under Review"
          value={underReviewCount}
          hint="Verification in progress"
          tone="green"
        />
      </section>

      <section className="license-renewals-toolbar bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="license-renewals-search flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by driver, email, license, proof reference, or status..."
            className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-[#0f4c81]"
          />
        </div>

        <span className="text-sm text-gray-500">
          Showing {filteredRequests.length} of {requests.length}
        </span>
      </section>

      <section className="license-renewals-list bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="license-renewals-empty p-12 text-center text-gray-400">
            <RefreshCw size={42} className="mx-auto mb-3 animate-spin opacity-40" />
            <p className="font-medium">Loading renewal requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="license-renewals-empty p-12 text-center text-gray-400">
            <FileCheck2 size={46} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-600">No pending renewal requests</p>
            <p className="text-sm mt-1">
              Driver renewal proof submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="license-renewals-items divide-y divide-gray-100">
            {filteredRequests.map((request) => {
              const requestId = getId(request);
              const form = reviewForms[requestId] || {};
              const approving = actionId === `${requestId}-approved`;
              const rejecting = actionId === `${requestId}-rejected`;
              const reviewing = actionId === `${requestId}-under_review`;
              const canMarkUnderReview = String(request.status || '').toLowerCase() === 'submitted';

              return (
                <article key={requestId} className="license-renewals-item p-5">
                  <div className="license-renewals-item-top flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900">
                          {request.licenseNumber || 'N/A'}
                        </h2>

                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {formatStatus(request.status)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        Submitted by {getDriverName(request)} • {formatDate(request.submittedAt)}
                      </p>
                    </div>

                    <div className="license-renewals-proof-card rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-xs text-blue-500 font-semibold uppercase">
                        Proof Reference
                      </p>

                      <p className="text-sm font-bold text-blue-900 mt-1">
                        {request.proofReference || 'N/A'}
                      </p>

                      <p className="text-xs text-blue-600 mt-1">
                        {getProofLabel(request.proofType)}
                      </p>
                    </div>
                  </div>

                  <div className="license-renewals-details-grid grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                    <InfoBox
                      icon={UserRound}
                      label="Driver"
                      value={getDriverName(request)}
                      subValue={getDriverEmail(request)}
                    />

                    <InfoBox
                      icon={IdCard}
                      label="License Holder"
                      value={getLicenseHolder(request)}
                      subValue={`Status: ${formatStatus(getLicenseStatus(request))}`}
                    />

                    <InfoBox
                      icon={CalendarDays}
                      label="Previous Expiry"
                      value={formatDate(request.previousExpiryDate || request.license?.expiryDate)}
                      subValue="Current official record"
                    />

                    <InfoBox
                      icon={CalendarDays}
                      label="Requested Expiry"
                      value={formatDate(request.requestedExpiryDate)}
                      subValue="Driver requested date"
                    />
                  </div>

                  {request.proofNote && (
                    <div className="license-renewals-note mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                      <p className="text-xs text-gray-400 font-semibold uppercase">Driver Note</p>
                      <p className="text-sm text-gray-700 mt-1">{request.proofNote}</p>
                    </div>
                  )}

                  <div className="license-renewals-review-panel mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2">
                          Approved Expiry Date
                        </label>

                        <input
                          type="date"
                          value={form.approvedExpiryDate || ''}
                          onChange={(event) =>
                            handleFormChange(
                              requestId,
                              'approvedExpiryDate',
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f4c81]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2">
                          Review Note
                        </label>

                        <input
                          value={form.reviewNote || ''}
                          onChange={(event) =>
                            handleFormChange(requestId, 'reviewNote', event.target.value)
                          }
                          placeholder="Example: BRTA renewal proof verified."
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0f4c81]"
                        />
                      </div>
                    </div>

                    <div className="license-renewals-actions flex flex-col sm:flex-row sm:justify-end gap-3 mt-4">
                      {canMarkUnderReview && (
                        <button
                          type="button"
                          onClick={() => handleReview(request, 'under_review')}
                          disabled={Boolean(actionId)}
                          className="license-renewals-review-button rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                          {reviewing ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                          Mark Under Review
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleReview(request, 'rejected')}
                        disabled={Boolean(actionId)}
                        className="license-renewals-reject-button rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                      >
                        {rejecting ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(request, 'approved')}
                        disabled={Boolean(actionId)}
                        className="license-renewals-approve-button rounded-xl bg-[#0f4c81] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0b3f6c] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                      >
                        {approving ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Approve Renewal
                      </button>
                    </div>
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

function ClockIcon(props) {
  return <CalendarDays {...props} />;
}

function StatCard({ icon: Icon, label, value, hint, tone }) {
  const toneClass =
    tone === 'orange'
      ? 'bg-orange-50 text-orange-600'
      : tone === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-blue-50 text-blue-600';

  return (
    <article className="license-renewals-stat-card bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${toneClass}`}>
        <Icon size={22} />
      </div>

      <p className="text-3xl font-bold text-gray-900 mt-5">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </article>
  );
}

function InfoBox({ icon: Icon, label, value, subValue }) {
  return (
    <div className="license-renewals-info-box rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-white text-[#0f4c81] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-900 mt-1 truncate">{value || 'N/A'}</p>
        {subValue && <p className="text-xs text-gray-500 mt-1 truncate">{subValue}</p>}
      </div>
    </div>
  );
}