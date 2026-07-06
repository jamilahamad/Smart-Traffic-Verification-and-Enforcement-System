import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Car,
  CheckCircle,
  CreditCard,
  Eye,
  FileWarning,
  Filter,
  IdCard,
  Loader2,
  MapPin,
  Receipt,
  Printer,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import PaymentModal from '../../components/PaymentModal';
import Pagination from '../../components/Pagination';
import useStore from '../../store/useStore';
import { printEChallanReceipt } from '../../utils/printReceipt';
import '../../styles/MyViolationsPage.css';

const statusFilters = ['all', 'pending', 'approved', 'dismissed', 'paid', 'unpaid'];
const VIOLATIONS_PER_PAGE = 10;

const getId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return item._id || item.id || '';
};

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount) => {
  return `৳${safeNumber(amount).toLocaleString()}`;
};

const hasDisplayValue = (value) => {
  const text = String(value || '').trim();
  return Boolean(text && text.toUpperCase() !== 'N/A');
};

const getRawVehiclePlate = (violation = {}) => {
  return (
    violation.registrationNumber ||
    violation.plateNumber ||
    violation.vehicle?.registrationNumber ||
    violation.vehicle?.plateNumber ||
    ''
  );
};

const getViolationVehicleId = (violation = {}) => {
  return (
    getId(violation.vehicle) ||
    violation.vehicleId ||
    violation.appVehicleId ||
    violation.vehicle?._id ||
    violation.vehicle?.id ||
    ''
  );
};

const getAssignmentVehicleId = (assignment = {}) => {
  return (
    getId(assignment.vehicle) ||
    assignment.vehicleId ||
    assignment.appVehicleId ||
    assignment.vehicle?._id ||
    assignment.vehicle?.id ||
    ''
  );
};

const getAssignmentVehiclePlate = (assignment = {}) => {
  return (
    assignment.registrationNumber ||
    assignment.vehicleRegistrationNumber ||
    assignment.vehicle?.registrationNumber ||
    assignment.vehicle?.plateNumber ||
    ''
  );
};

const isLicenseBasedViolation = (violation = {}) => {
  const code = String(violation.violationCode || '').toUpperCase();
  const type = String(violation.violationType || '').toLowerCase();
  const description = String(violation.description || '').toLowerCase();

  return (
    code === 'DL_EXP' ||
    code === 'DL_RENEW_LATE' ||
    code.startsWith('DL_') ||
    type.includes('license') ||
    description.includes('driving license') ||
    description.includes('license renewal')
  );
};

const getDriverCaseType = (violation) => {
  if (isLicenseBasedViolation(violation)) {
    return 'License-Based Case';
  }

  return 'Vehicle E-Challan';
};

const getDriverVehicleDisplay = (violation) => {
  if (isLicenseBasedViolation(violation)) {
    return 'License-based case';
  }

  const plate = getRawVehiclePlate(violation);

  if (!hasDisplayValue(plate)) {
    return 'Vehicle case';
  }

  return plate;
};

const getDriverVehicleSubText = (violation) => {
  if (isLicenseBasedViolation(violation)) {
    return 'Not vehicle-specific';
  }

  const plate = getRawVehiclePlate(violation);

  if (!hasDisplayValue(plate)) {
    return 'Vehicle information unavailable';
  }

  return plate;
};

const isAuthorizedVehicleViolation = (
  violation,
  authorizedVehicleIds,
  authorizedVehiclePlates
) => {
  const violationVehicleId = getViolationVehicleId(violation);
  const violationPlate = getRawVehiclePlate(violation);

  return (
    (hasDisplayValue(violationVehicleId) &&
      authorizedVehicleIds.includes(String(violationVehicleId))) ||
    (hasDisplayValue(violationPlate) &&
      authorizedVehiclePlates.includes(String(violationPlate)))
  );
};

const shouldShowDriverViolation = (
  violation,
  authorizedVehicleIds,
  authorizedVehiclePlates
) => {
  if (!getViolationId(violation)) {
    return false;
  }

  if (isLicenseBasedViolation(violation)) {
    return true;
  }

  return isAuthorizedVehicleViolation(
    violation,
    authorizedVehicleIds,
    authorizedVehiclePlates
  );
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
    return 'N/A';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isMongoObjectId = (value) => {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
};

const getViolationId = (violation = {}) => {
  const candidates = [
    violation._id,
    violation.mongoId,
    violation.violationId,
    violation.id,
    violation.raw?._id,
  ];

  return candidates.find(isMongoObjectId) || '';
};

const getCaseId = (violation = {}) => {
  return (
    violation.caseId ||
    violation.caseNumber ||
    violation.challanNumber ||
    getViolationId(violation) ||
    'N/A'
  );
};

const getDriverId = (violation = {}) => {
  return (
    violation.driver?._id ||
    violation.driver?.id ||
    violation.driver ||
    violation.driverId ||
    violation.driverUserId ||
    ''
  );
};

const getDriverName = (violation) => {
  const driver = violation?.driver;

  if (typeof driver === 'object' && driver) {
    return driver.name || driver.driverName || 'N/A';
  }

  return violation?.driverName || 'N/A';
};

const getLicenseNumber = (violation) => {
  const license = violation?.license;

  if (typeof license === 'object' && license) {
    return license.licenseNumber || 'N/A';
  }

  return violation?.licenseNumber || 'N/A';
};

const getVehiclePlate = (violation) => {
  const vehicle = violation?.vehicle;

  if (typeof vehicle === 'object' && vehicle) {
    return vehicle.registrationNumber || vehicle.plateNumber || 'N/A';
  }

  return violation?.registrationNumber || violation?.plateNumber || 'N/A';
};

const getVehicleTitle = (violation) => {
  const vehicle = violation?.vehicle;

  if (typeof vehicle !== 'object' || !vehicle) {
    return getVehiclePlate(violation);
  }

  const title = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();

  return title || getVehiclePlate(violation);
};

const getViolationText = (violation) => {
  return (
    violation?.violationLabel ||
    violation?.violationType ||
    violation?.description ||
    'Traffic Violation'
  );
};

const getLocationText = (violation) => {
  const location = violation?.location;

  if (!location) {
    return 'N/A';
  }

  if (typeof location === 'string') {
    return location;
  }

  return location.address || location.city || location.district || 'N/A';
};

const getLocationSubText = (violation) => {
  const location = violation?.location;

  if (!location || typeof location === 'string') {
    return '';
  }

  return [location.city, location.district].filter(Boolean).join(', ');
};

const getOfficerName = (violation) => {
  const officer = violation?.officer;

  if (typeof officer === 'object' && officer) {
    return officer.name || 'N/A';
  }

  return violation?.officerName || 'N/A';
};

const getPaymentStatus = (violation) => {
  if (violation?.status === 'paid') {
    return 'paid';
  }

  if (violation?.status === 'dismissed') {
    return 'waived';
  }

  return violation?.paymentStatus || 'unpaid';
};

const getCaseStatusClass = (status) => {
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

const getPaymentStatusClass = (status) => {
  if (status === 'paid') {
    return 'bg-blue-100 text-blue-700';
  }

  if (status === 'waived') {
    return 'bg-purple-100 text-purple-700';
  }

  return 'bg-red-100 text-red-700';
};

const getStatusIcon = (status) => {
  if (status === 'approved') {
    return CheckCircle;
  }

  if (status === 'dismissed') {
    return XCircle;
  }

  if (status === 'paid') {
    return CreditCard;
  }

  return AlertTriangle;
};

const getEvidenceText = (evidence) => {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return 'No evidence note attached.';
  }

  return evidence
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return item.description || item.url || item.type || 'Evidence item';
    })
    .join(', ');
};

export default function MyViolationsPage() {
  const currentUser = useStore((state) => state.currentUser);
  const violations = useStore((state) => state.violations);
  const licenses = useStore((state) => state.licenses);
  const assignments = useStore((state) => state.assignments);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const addLog = useStore((state) => state.addLog);
  const apiError = useStore((state) => state.apiError);

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [paymentCase, setPaymentCase] = useState(null);
  const [payingId, setPayingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serverViolations, setServerViolations] = useState([]);
  const [serverViolationsLoaded, setServerViolationsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const extractDriverViolations = (response) => {
    const payload = response?.data || response || {};

    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.violations)) {
      return payload.violations;
    }

    if (Array.isArray(payload.data?.violations)) {
      return payload.data.violations;
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    return [];
  };

  const loadDriverViolations = async () => {
    try {
      const response = await api.getMyDriverViolations();
      const records = extractDriverViolations(response);

      setServerViolations(records);
      setServerViolationsLoaded(true);
    } catch (err) {
      console.error('Failed to load driver violations:', err);
      setServerViolationsLoaded(true);
      setServerViolations([]);
    }
  };

  useEffect(() => {
    loadDriverViolations();
  }, []);

  const currentUserId = getId(currentUser);
  const violationList = Array.isArray(violations) ? violations : [];
  const licenseList = Array.isArray(licenses) ? licenses : [];
  const assignmentList = Array.isArray(assignments) ? assignments : [];

  const myLicenseNumbers = licenseList
    .filter((license) => {
      const driverId = getId(license.driver) || license.driverId || license.userId;
      return !driverId || String(driverId) === String(currentUserId);
    })
    .map((license) => license.licenseNumber)
    .filter(Boolean);

  const activeDriverAssignments = useMemo(() => {
    return assignmentList.filter((assignment) => {
      return String(assignment?.status || '').toLowerCase() === 'active';
    });
  }, [assignmentList]);

  const authorizedVehicleIds = useMemo(() => {
    return activeDriverAssignments
      .map((assignment) => getAssignmentVehicleId(assignment))
      .filter(hasDisplayValue)
      .map(String);
  }, [activeDriverAssignments]);

  const authorizedVehiclePlates = useMemo(() => {
    return activeDriverAssignments
      .map((assignment) => getAssignmentVehiclePlate(assignment))
      .filter(hasDisplayValue)
      .map(String);
  }, [activeDriverAssignments]);

  const myViolations = useMemo(() => {
    if (serverViolationsLoaded) {
      return serverViolations.filter((violation) => {
        const responsibility = String(violation?.responsibility || '').toLowerCase();

        if (responsibility === 'owner') {
          return false;
        }

        return Boolean(getViolationId(violation));
      });
    }

    const sourceViolations = violationList.filter((violation) => {
      const driverId = getDriverId(violation);
      const licenseNumber = getLicenseNumber(violation);
      const driverName = getDriverName(violation);

      return (
        (driverId && currentUserId && String(driverId) === String(currentUserId)) ||
        (licenseNumber !== 'N/A' && myLicenseNumbers.includes(licenseNumber)) ||
        (currentUser?.name && driverName === currentUser.name)
      );
    });

    return sourceViolations.filter((violation) => {
      const responsibility = String(violation?.responsibility || '').toLowerCase();

      if (responsibility === 'owner') {
        return false;
      }

      return shouldShowDriverViolation(
        violation,
        authorizedVehicleIds,
        authorizedVehiclePlates
      );
    });
  }, [
    serverViolationsLoaded,
    serverViolations,
    violationList,
    currentUserId,
    currentUser?.name,
    myLicenseNumbers,
    authorizedVehicleIds,
    authorizedVehiclePlates,
  ]);

  const filteredViolations = useMemo(() => {
    let nextList = myViolations;

    if (statusFilter !== 'all') {
      nextList = nextList.filter((violation) => {
        const paymentStatus = getPaymentStatus(violation);

        if (statusFilter === 'paid' || statusFilter === 'unpaid') {
          return paymentStatus === statusFilter || violation.status === statusFilter;
        }

        return violation.status === statusFilter;
      });
    }

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextList;
    }

    return nextList.filter((violation) => {
      return (
        String(violation.caseId || '').toLowerCase().includes(query) ||
        getVehiclePlate(violation).toLowerCase().includes(query) ||
        getVehicleTitle(violation).toLowerCase().includes(query) ||
        getLicenseNumber(violation).toLowerCase().includes(query) ||
        getViolationText(violation).toLowerCase().includes(query) ||
        getLocationText(violation).toLowerCase().includes(query) ||
        getOfficerName(violation).toLowerCase().includes(query)
      );
    });
  }, [myViolations, searchQ, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCaseId('');
  }, [searchQ, statusFilter, myViolations.length]);

  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / VIOLATIONS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * VIOLATIONS_PER_PAGE;
  const paginatedViolations = filteredViolations.slice(
    pageStartIndex,
    pageStartIndex + VIOLATIONS_PER_PAGE
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedCaseId('');
  };

  const totalFine = myViolations.reduce((sum, violation) => {
    return sum + safeNumber(violation.fineAmount);
  }, 0);

  const payableViolations = myViolations.filter((violation) => {
    const paymentStatus = getPaymentStatus(violation);

    return (
      (violation.status === 'approved' || violation.status === 'unpaid') &&
      paymentStatus === 'unpaid'
    );
  });

  const payableFine = payableViolations.reduce((sum, violation) => {
    return sum + safeNumber(violation.fineAmount);
  }, 0);

  const paidFine = myViolations
    .filter((violation) => getPaymentStatus(violation) === 'paid')
    .reduce((sum, violation) => {
      return sum + safeNumber(violation.fineAmount);
    }, 0);

  const pendingReviewFine = myViolations
    .filter((violation) => {
      return violation.status === 'pending' && getPaymentStatus(violation) !== 'paid';
    })
    .reduce((sum, violation) => {
      return sum + safeNumber(violation.fineAmount);
    }, 0);

  const pendingCount = myViolations.filter((violation) => violation.status === 'pending').length;
  const approvedCount = myViolations.filter((violation) => violation.status === 'approved').length;
  const paidCount = myViolations.filter((violation) => getPaymentStatus(violation) === 'paid').length;
  const payableCount = payableViolations.length;

  const summaryCards = [
    {
      label: 'Total Cases',
      value: myViolations.length,
      icon: FileWarning,
      color: 'bg-orange-50 text-orange-600',
      note: `${pendingCount} pending`,
    },
    {
      label: 'Approved Cases',
      value: approvedCount,
      icon: ShieldCheck,
      color: 'bg-green-50 text-green-600',
      note: 'Ready for payment',
    },
    {
      label: 'Paid Fine',
      value: formatMoney(paidFine),
      icon: CheckCircle,
      color: 'bg-blue-50 text-blue-600',
      note: `${paidCount} paid case(s)`,
    },
    {
      label: 'Payable Fine',
      value: formatMoney(payableFine),
      icon: Banknote,
      color: payableFine > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
      note:
        pendingReviewFine > 0
          ? `${payableCount} payable case • ${formatMoney(pendingReviewFine)} under review`
          : `${payableCount} approved unpaid case(s)`,
    },
  ];

  const handleToggleDetails = (caseId) => {
    setSelectedCaseId((current) => (current === caseId ? '' : caseId));
  };

  const handlePayNow = (violation) => {
    setError('');
    setSuccess('');
    setPaymentCase(violation);
  };

  const handleClosePayment = () => {
    if (payingId) {
      return;
    }

    setPaymentCase(null);
  };

  const handleConfirmPayment = async (paymentData) => {
    const violation = paymentData?.violation || paymentCase;
    const violationId = getViolationId(violation);
    const displayCaseId = getCaseId(violation);

    if (!violationId) {
      setError(
        'Payment failed because backend violation ID is missing. Please refresh the page and try again.'
      );
      return;
    }

    try {
      setError('');
      setSuccess('');
      setPayingId(violationId);

      await api.updatePayment(violationId, 'paid');

      await loadDriverViolations();

      if (typeof fetchDashboardData === 'function') {
        fetchDashboardData().catch((error) => {
          console.error('Failed to refresh dashboard data after driver payment:', error);
        });
      }

      if (typeof addLog === 'function' && currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'Driver',
          action: 'Fine Payment Completed',
          details: `Payment completed for case ${displayCaseId
            } using ${paymentData?.paymentMethod?.label || 'Simulated Payment'}.`,
          type: 'case',
        });
      }

      setSuccess(
        `Payment completed successfully for case ${displayCaseId}.`
      );
      setPaymentCase(null);
    } catch (err) {
      console.error('Payment update failed:', err);
      setError(err.message || 'Payment update failed.');
    } finally {
      setPayingId('');
    }
  };

  const handlePrintReceipt = (violation) => {
    printEChallanReceipt({
      violation,
      payer: currentUser,
    });
  };

  return (
    <div className="my-violations-wrapper animate-fade-in space-y-6">
      <header className="my-violations-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning size={26} />
          My Violations
        </h1>

        <p className="text-sm text-blue-100 mt-1">
          View driver/license-linked E-Challan cases, payment status, fine amount, and violation details.
        </p>
      </header>

      {(apiError || error) && (
        <div className="my-violations-alert bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error || apiError}</span>
        </div>
      )}

      {success && (
        <div className="my-violations-alert bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <section className="my-violations-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="my-violations-summary-card bg-white rounded-xl border border-gray-100 hover:shadow-md"
            >
              <div
                className={`my-violations-summary-icon ${card.color} flex items-center justify-center`}
              >
                <Icon size={20} />
              </div>

              <div className="my-violations-summary-content min-w-0">
                <p className="my-violations-summary-value">{card.value}</p>
                <p className="my-violations-summary-label">{card.label}</p>
                <p className="my-violations-summary-note">{card.note}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="my-violations-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="my-violations-filter-row flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="my-violations-search-wrap relative flex-1">
            <Search
              size={18}
              className="my-violations-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search by case ID, plate, license, violation, location, or officer..."
              className="my-violations-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            />
          </div>

          <div className="my-violations-filter-buttons flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-gray-400" />

            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`my-violations-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === status
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

      <section className="my-violations-list-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredViolations.length === 0 ? (
          <div className="my-violations-empty-state p-12 text-center text-gray-400">
            <Receipt size={44} className="mx-auto mb-3 opacity-30" />

            <p className="text-sm font-medium">No violation records found</p>

            <p className="text-xs mt-1">
              Try changing the search keyword or selected filter.
            </p>
          </div>
        ) : (
          <div className="my-violations-list divide-y divide-gray-50">
            {paginatedViolations.map((violation) => {
              const caseId = getCaseId(violation);
              const caseStatus = violation.status || 'pending';
              const paymentStatus = getPaymentStatus(violation);
              const StatusIcon = getStatusIcon(caseStatus);
              const detailsOpen = selectedCaseId === caseId;
              const canPay =
                (caseStatus === 'approved' || caseStatus === 'unpaid') &&
                paymentStatus !== 'paid';
              const violationId = getViolationId(violation);
              const isPaying =
                Boolean(payingId) && (payingId === violationId || payingId === caseId);

              return (
                <article
                  key={violationId || caseId}
                  className="my-violations-item p-5 hover:bg-gray-50"
                >
                  <div className="my-violations-item-top flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="my-violations-title-row flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-gray-800">
                          {violation.caseId || 'N/A'}
                        </p>

                        <span
                          className={`my-violations-case-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getCaseStatusClass(
                            caseStatus
                          )}`}
                        >
                          <StatusIcon size={12} />
                          {formatLabel(caseStatus)}
                        </span>

                        <span
                          className={`my-violations-payment-badge inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClass(
                            paymentStatus
                          )}`}
                        >
                          {formatLabel(paymentStatus)}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {getViolationText(violation)}
                        </p>

                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#0f4c81]">
                          {getDriverCaseType(violation)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mt-1">
                        {getDriverVehicleDisplay(violation)} • {formatDate(violation.createdAt)}
                      </p>
                    </div>

                    <div className="my-violations-fine-box text-right shrink-0">
                      <p className="text-xs text-gray-400">Fine Amount</p>

                      <p className="text-lg font-bold text-gray-800">
                        {formatMoney(violation.fineAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="my-violations-info-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    <InfoBlock
                      icon={Car}
                      label="Vehicle"
                      value={getDriverVehicleDisplay(violation)}
                      subValue={getDriverVehicleSubText(violation)}
                    />

                    <InfoBlock
                      icon={IdCard}
                      label="License"
                      value={getLicenseNumber(violation)}
                      subValue={`Driver: ${getDriverName(violation)}`}
                    />

                    <InfoBlock
                      icon={MapPin}
                      label="Location"
                      value={getLocationText(violation)}
                      subValue={getLocationSubText(violation)}
                    />

                    <InfoBlock
                      icon={CalendarDays}
                      label="Issued"
                      value={formatDateTime(violation.createdAt || violation.issueDate)}
                      subValue={`Officer: ${getOfficerName(violation)}`}
                    />
                  </div>

                  <div className="my-violations-actions mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleDetails(caseId)}
                      className="my-violations-details-button rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      {detailsOpen ? 'Hide Details' : 'View Details'}
                    </button>

                    {caseStatus === 'pending' && paymentStatus !== 'paid' && (
                      <div className="my-violations-pending-note rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 flex items-center justify-center gap-2">
                        <AlertTriangle size={16} />
                        Waiting for admin approval
                      </div>
                    )}

                    {paymentStatus === 'paid' && (
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(violation)}
                        className="my-violations-print-button rounded-xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Printer size={16} />
                        Print Receipt
                      </button>
                    )}

                    {canPay && (
                      <button
                        type="button"
                        disabled={isPaying}
                        onClick={() => handlePayNow(violation)}
                        className="my-violations-pay-button rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {isPaying ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CreditCard size={16} />
                        )}
                        Pay Now
                      </button>
                    )}
                  </div>

                  {detailsOpen && (
                    <div className="my-violations-details-box mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-5">
                      <div className="my-violations-details-grid grid md:grid-cols-2 gap-5">
                        <DetailItem
                          label="Case ID"
                          value={violation.caseId || 'N/A'}
                        />

                        <DetailItem
                          label="Violation Type"
                          value={getViolationText(violation)}
                        />

                        <DetailItem
                          label="Description"
                          value={violation.description || 'No additional description.'}
                        />

                        <DetailItem
                          label="Evidence"
                          value={getEvidenceText(violation.evidence)}
                        />

                        <DetailItem
                          label="Officer"
                          value={getOfficerName(violation)}
                        />

                        <DetailItem
                          label="Payment Status"
                          value={formatLabel(paymentStatus)}
                        />

                        <DetailItem
                          label="Case Status"
                          value={formatLabel(caseStatus)}
                        />

                        <DetailItem
                          label="Fine Amount"
                          value={formatMoney(violation.fineAmount)}
                        />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Pagination
        currentPage={safeCurrentPage}
        totalItems={filteredViolations.length}
        pageSize={VIOLATIONS_PER_PAGE}
        onPageChange={handlePageChange}
        itemLabel="filtered violation records"
      />

      <p className="my-violations-footer-count text-xs text-gray-400">
        Total driver-visible records: {myViolations.length}.
      </p>

      <PaymentModal
        isOpen={Boolean(paymentCase)}
        violation={paymentCase}
        loading={Boolean(payingId)}
        error={error}
        onClose={handleClosePayment}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, subValue }) {
  return (
    <div className="my-violations-info-block flex items-start gap-3 rounded-xl bg-gray-50 p-3">
      <div className="my-violations-info-icon w-9 h-9 rounded-lg bg-white text-[#0f4c81] flex items-center justify-center">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value || 'N/A'}</p>

        {subValue && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="my-violations-detail-item">
      <p className="text-xs text-gray-400">{label}</p>

      <p className="mt-1 text-sm font-semibold text-gray-700 leading-relaxed">
        {value || 'N/A'}
      </p>
    </div>
  );
}