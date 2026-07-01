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
  Loader2,
  MapPin,
  Receipt,
  Printer,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';

import api from '../../lib/api';
import PaymentModal from '../../components/PaymentModal';
import Pagination from '../../components/Pagination';
import { printEChallanReceipt } from '../../utils/printReceipt';
import useStore from '../../store/useStore';
import '../../styles/OwnerViolationsPage.css';

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

const getOwnerId = (vehicle) => {
  return getId(vehicle?.owner) || vehicle?.ownerId || '';
};

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getViolationVehicleId = (violation) => {
  return getId(violation?.vehicle) || violation?.vehicleId || '';
};

const getViolationPlate = (violation) => {
  return (
    violation?.plateNumber ||
    violation?.registrationNumber ||
    violation?.vehicle?.registrationNumber ||
    violation?.vehicle?.plateNumber ||
    'N/A'
  );
};

const getVehicleTitle = (violation) => {
  const vehicle = violation?.vehicle;

  if (!vehicle || typeof vehicle !== 'object') {
    return getViolationPlate(violation);
  }

  const title = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();

  return title || getViolationPlate(violation);
};

const getDriverName = (violation) => {
  const driver = violation?.driver;

  if (driver && typeof driver === 'object') {
    return driver.name || driver.driverName || 'N/A';
  }

  return violation?.driverName || 'N/A';
};

const getLicenseNumber = (violation) => {
  const license = violation?.license;

  if (license && typeof license === 'object') {
    return license.licenseNumber || 'N/A';
  }

  return violation?.licenseNumber || 'N/A';
};

const getViolationDriverId = (violation = {}) => {
  return (
    getId(violation.driver) ||
    violation.driverId ||
    violation.driverUserId ||
    violation.driver?._id ||
    violation.driver?.id ||
    ''
  );
};

const getAssignmentDriverId = (assignment = {}) => {
  return (
    getId(assignment.driver) ||
    assignment.driverId ||
    assignment.driverUserId ||
    assignment.driver?._id ||
    assignment.driver?.id ||
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

const hasDisplayValue = (value) => {
  const text = String(value || '').trim();
  return Boolean(text && text.toUpperCase() !== 'N/A');
};

const isDriverAssignedToViolationVehicle = (violation, activeAssignments) => {
  const violationDriverId = getViolationDriverId(violation);
  const violationVehicleId = getViolationVehicleId(violation);
  const violationPlate = getViolationPlate(violation);

  if (!hasDisplayValue(violationDriverId)) {
    return false;
  }

  return activeAssignments.some((assignment) => {
    const assignmentDriverId = getAssignmentDriverId(assignment);
    const assignmentVehicleId = getAssignmentVehicleId(assignment);
    const assignmentPlate = getAssignmentVehiclePlate(assignment);

    const driverMatched =
      hasDisplayValue(assignmentDriverId) &&
      String(assignmentDriverId) === String(violationDriverId);

    const vehicleMatched =
      (hasDisplayValue(assignmentVehicleId) &&
        hasDisplayValue(violationVehicleId) &&
        String(assignmentVehicleId) === String(violationVehicleId)) ||
      (hasDisplayValue(assignmentPlate) &&
        hasDisplayValue(violationPlate) &&
        String(assignmentPlate) === String(violationPlate));

    return driverMatched && vehicleMatched;
  });
};

const getAssignedDriverDisplay = (violation, activeAssignments) => {
  if (!isDriverAssignedToViolationVehicle(violation, activeAssignments)) {
    return 'No assigned driver';
  }

  return getDriverName(violation);
};

const getAssignedLicenseDisplay = (violation, activeAssignments) => {
  if (!isDriverAssignedToViolationVehicle(violation, activeAssignments)) {
    return 'Not linked to active assignment';
  }

  return `License: ${getLicenseNumber(violation)}`;
};

const getAssignedLicenseDetail = (violation, activeAssignments) => {
  if (!isDriverAssignedToViolationVehicle(violation, activeAssignments)) {
    return 'Not linked to active assignment';
  }

  return getLicenseNumber(violation);
};

const getOfficerName = (violation) => {
  const officer = violation?.officer;

  if (officer && typeof officer === 'object') {
    return officer.name || 'N/A';
  }

  return violation?.officerName || 'N/A';
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

const getCaseId = (violation) => {
  return violation?._id || violation?.id || violation?.caseId || '';
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

const DRIVER_ONLY_VIOLATION_CODES = new Set([
  'DL_EXP',
  'DL_RENEW_LATE',
  'NO_DL',
  'SIGNAL',
  'SPEED',
  'RECKLESS',
  'PARKING',
  'HELMET',
  'SEATBELT',
]);

const OWNER_ONLY_VIOLATION_CODES = new Set([
  'REG_EXP',
  'FIT_EXP',
  'TAX_EXP',
  'INS_EXP',
  'ROUTE_EXP',
  'BLACKLIST',
]);

const BOTH_VIOLATION_CODES = new Set([
  'UNAUTH_DRV',
  'OVERLOAD',
]);

const getViolationResponsibility = (violation = {}) => {
  const savedResponsibility = String(violation.responsibility || '').toLowerCase();

  if (['owner', 'driver', 'both'].includes(savedResponsibility)) {
    return savedResponsibility;
  }

  const code = String(
    violation.violationCode ||
    violation.code ||
    violation.ruleCode ||
    ''
  ).toUpperCase();

  if (DRIVER_ONLY_VIOLATION_CODES.has(code)) {
    return 'driver';
  }

  if (BOTH_VIOLATION_CODES.has(code)) {
    return 'both';
  }

  if (OWNER_ONLY_VIOLATION_CODES.has(code)) {
    return 'owner';
  }

  const text = getViolationText(violation).toLowerCase();

  if (
    text.includes('traffic signal') ||
    text.includes('speeding') ||
    text.includes('reckless') ||
    text.includes('helmet') ||
    text.includes('seatbelt') ||
    text.includes('driving without license') ||
    text.includes('expired driving license') ||
    text.includes('license renewal') ||
    text.includes('illegal parking')
  ) {
    return 'driver';
  }

  if (
    text.includes('unauthorized driver') ||
    text.includes('overloading')
  ) {
    return 'both';
  }

  return 'owner';
};

const shouldShowOnOwnerViolationsPage = (violation = {}) => {
  const responsibility = getViolationResponsibility(violation);

  return responsibility === 'owner' || responsibility === 'both';
};

export default function OwnerViolationsPage() {
  const currentUser = useStore((state) => state.currentUser);
  const vehicles = useStore((state) => state.vehicles);
  const violations = useStore((state) => state.violations);
  const assignments = useStore((state) => state.assignments);
  const fetchDashboardData = useStore((state) => state.fetchDashboardData);
  const addLog = useStore((state) => state.addLog);
  const apiError = useStore((state) => state.apiError);

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [paymentCase, setPaymentCase] = useState(null);
  const [payingId, setPayingId] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const currentUserId = getId(currentUser);
  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const violationList = Array.isArray(violations) ? violations : [];
  const assignmentList = Array.isArray(assignments) ? assignments : [];

  const activeAssignments = useMemo(() => {
    return assignmentList.filter((assignment) => {
      return String(assignment?.status || '').toLowerCase() === 'active';
    });
  }, [assignmentList]);

  const ownerVehicles = useMemo(() => {
    return vehicleList;
  }, [vehicleList]);

  const ownerViolations = useMemo(() => {
    return violationList.filter((violation) => {
      return shouldShowOnOwnerViolationsPage(violation);
    });
  }, [violationList]);

  const filteredViolations = useMemo(() => {
    let nextList = ownerViolations;

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
        getViolationPlate(violation).toLowerCase().includes(query) ||
        getVehicleTitle(violation).toLowerCase().includes(query) ||
        getDriverName(violation).toLowerCase().includes(query) ||
        getLicenseNumber(violation).toLowerCase().includes(query) ||
        getViolationText(violation).toLowerCase().includes(query) ||
        getLocationText(violation).toLowerCase().includes(query) ||
        getOfficerName(violation).toLowerCase().includes(query)
      );
    });
  }, [ownerViolations, searchQ, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCaseId('');
  }, [searchQ, statusFilter, ownerViolations.length]);

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

  const totalFine = ownerViolations.reduce((sum, violation) => {
    return sum + safeNumber(violation.fineAmount);
  }, 0);

  const unpaidFine = ownerViolations
    .filter((violation) => getPaymentStatus(violation) !== 'paid')
    .reduce((sum, violation) => {
      return sum + safeNumber(violation.fineAmount);
    }, 0);

  const paidFine = ownerViolations
    .filter((violation) => getPaymentStatus(violation) === 'paid')
    .reduce((sum, violation) => {
      return sum + safeNumber(violation.fineAmount);
    }, 0);

  const pendingCount = ownerViolations.filter((item) => item.status === 'pending').length;
  const approvedCount = ownerViolations.filter((item) => item.status === 'approved').length;
  const paidCount = ownerViolations.filter((item) => getPaymentStatus(item) === 'paid').length;

  const summaryCards = [
    {
      label: 'Total Cases',
      value: ownerViolations.length,
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
      label: 'Unpaid Fine',
      value: formatMoney(unpaidFine),
      icon: Banknote,
      color: unpaidFine > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
      note: `${formatMoney(totalFine)} total`,
    },
  ];

  const handleToggleDetails = (caseId) => {
    setSelectedCaseId((current) => (current === caseId ? '' : caseId));
  };

  const handlePayNow = (violation) => {
    setLocalError('');
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
    const violationId = getCaseId(violation);

    if (!violationId) {
      setLocalError('Unable to find violation ID.');
      return;
    }

    try {
      setLocalError('');
      setSuccess('');
      setPayingId(violationId);

      await api.updatePayment(violationId, 'paid');

      if (typeof fetchDashboardData === 'function') {
        await fetchDashboardData();
      }

      if (typeof addLog === 'function' && currentUser) {
        addLog({
          userId: currentUser.id || currentUser._id,
          userName: currentUser.name || 'Vehicle Owner',
          action: 'Owner Fine Payment Completed',
          details: `Payment completed for case ${violation.caseId || violationId
            } using ${paymentData?.paymentMethod?.label || 'Simulated Payment'}.`,
          type: 'case',
        });
      }

      setSuccess(
        `Payment completed successfully for case ${violation.caseId || violationId}.`
      );
      setPaymentCase(null);
    } catch (err) {
      console.error('Owner payment update failed:', err);
      setLocalError(err.message || 'Payment update failed.');
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
    <div className="owner-violations-wrapper animate-fade-in space-y-6">
      <header className="owner-violations-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning size={26} />
          Vehicle Violations
        </h1>

        <p className="text-sm text-blue-100 mt-1">
          Track E-Challan cases, payment status, and violation records for your vehicles.
        </p>
      </header>

      {(apiError || localError) && (
        <div className="owner-violations-alert bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{localError || apiError}</span>
        </div>
      )}

      {success && (
        <div className="owner-violations-alert bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <section className="owner-violations-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="owner-violations-summary-card bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md"
            >
              <div
                className={`owner-violations-summary-icon w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} />
              </div>

              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              <p className="text-[10px] text-gray-400 mt-1">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="owner-violations-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="owner-violations-filter-row flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="owner-violations-search-wrap relative flex-1">
            <Search
              size={18}
              className="owner-violations-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search by case ID, plate, driver, license, violation, location, or officer..."
              className="owner-violations-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            />
          </div>

          <div className="owner-violations-filter-buttons flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-gray-400" />

            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`owner-violations-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === status
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

      <section className="owner-violations-list-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredViolations.length === 0 ? (
          <div className="owner-violations-empty-state p-12 text-center text-gray-400">
            <Receipt size={44} className="mx-auto mb-3 opacity-30" />

            <p className="text-sm font-medium">No vehicle violation records found</p>

            <p className="text-xs mt-1">
              Your vehicle E-Challan records will appear here.
            </p>
          </div>
        ) : (
          <div className="owner-violations-list divide-y divide-gray-50">
            {paginatedViolations.map((violation) => {
              const caseId = getCaseId(violation);
              const caseStatus = violation.status || 'pending';
              const paymentStatus = getPaymentStatus(violation);
              const StatusIcon = getStatusIcon(caseStatus);
              const detailsOpen = selectedCaseId === caseId;
              const isWaitingForApproval =
                caseStatus === 'pending' && paymentStatus !== 'paid';
              const canPrintReceipt = paymentStatus === 'paid';
              const canPay = caseStatus === 'approved' && paymentStatus !== 'paid';
              const isPaying = payingId === caseId;

              return (
                <article
                  key={caseId || violation.caseId}
                  className="owner-violations-item p-5 hover:bg-gray-50"
                >
                  <div className="owner-violations-item-top flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="owner-violations-title-row flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-gray-800">
                          {violation.caseId || 'N/A'}
                        </p>

                        <span
                          className={`owner-violations-case-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getCaseStatusClass(
                            caseStatus
                          )}`}
                        >
                          <StatusIcon size={12} />
                          {formatLabel(caseStatus)}
                        </span>

                        <span
                          className={`owner-violations-payment-badge inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClass(
                            paymentStatus
                          )}`}
                        >
                          {formatLabel(paymentStatus)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {getViolationText(violation)}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {getViolationPlate(violation)} • {formatDate(violation.createdAt)}
                      </p>
                    </div>

                    <div className="owner-violations-fine-box text-right shrink-0">
                      <p className="text-xs text-gray-400">Fine Amount</p>

                      <p className="text-lg font-bold text-gray-800">
                        {formatMoney(violation.fineAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="owner-violations-info-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    <InfoBlock
                      icon={Car}
                      label="Vehicle"
                      value={getVehicleTitle(violation)}
                      subValue={getViolationPlate(violation)}
                    />

                    <InfoBlock
                      icon={UserRound}
                      label="Driver"
                      value={getAssignedDriverDisplay(violation, activeAssignments)}
                      subValue={getAssignedLicenseDisplay(violation, activeAssignments)}
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

                  <div className="owner-violations-actions mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleDetails(caseId)}
                      className="owner-violations-details-button rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      {detailsOpen ? 'Hide Details' : 'View Details'}
                    </button>

                    {isWaitingForApproval && (
                      <div className="owner-violations-pending-note rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 flex items-center justify-center gap-2">
                        <AlertTriangle size={16} />
                        Waiting for admin approval
                      </div>
                    )}

                    {canPrintReceipt && (
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(violation)}
                        className="owner-violations-print-button rounded-xl bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 active:scale-[0.98] flex items-center justify-center gap-2"
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
                        className="owner-violations-pay-button rounded-xl bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
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
                    <div className="owner-violations-details-box mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-5">
                      <div className="owner-violations-details-grid grid md:grid-cols-2 gap-5">
                        <DetailItem label="Case ID" value={violation.caseId || 'N/A'} />
                        <DetailItem label="Vehicle" value={`${getVehicleTitle(violation)} — ${getViolationPlate(violation)}`} />
                        <DetailItem
                          label="Driver"
                          value={getAssignedDriverDisplay(violation, activeAssignments)}
                        />

                        <DetailItem
                          label="License Number"
                          value={getAssignedLicenseDetail(violation, activeAssignments)}
                        />
                        <DetailItem label="Violation Type" value={getViolationText(violation)} />
                        <DetailItem label="Description" value={violation.description || 'No additional description.'} />
                        <DetailItem label="Evidence" value={getEvidenceText(violation.evidence)} />
                        <DetailItem label="Officer" value={getOfficerName(violation)} />
                        <DetailItem label="Payment Status" value={formatLabel(paymentStatus)} />
                        <DetailItem label="Case Status" value={formatLabel(caseStatus)} />
                        <DetailItem label="Fine Amount" value={formatMoney(violation.fineAmount)} />
                        <DetailItem label="Created At" value={formatDateTime(violation.createdAt)} />
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
        itemLabel="filtered vehicle violation records"
      />

      <p className="owner-violations-footer-count text-xs text-gray-400">
        Total owner-visible records: {ownerViolations.length}.
      </p>

      <PaymentModal
        isOpen={Boolean(paymentCase)}
        violation={paymentCase}
        loading={Boolean(payingId)}
        error={localError}
        onClose={handleClosePayment}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, subValue }) {
  return (
    <div className="owner-violations-info-block flex items-start gap-3 rounded-xl bg-gray-50 p-3">
      <div className="owner-violations-info-icon w-9 h-9 rounded-lg bg-white text-[#0f4c81] flex items-center justify-center">
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
    <div className="owner-violations-detail-item">
      <p className="text-xs text-gray-400">{label}</p>

      <p className="mt-1 text-sm font-semibold text-gray-700 leading-relaxed">
        {value || 'N/A'}
      </p>
    </div>
  );
}