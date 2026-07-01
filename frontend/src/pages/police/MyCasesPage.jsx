import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  FileWarning,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Banknote,
  CalendarDays,
  MapPin,
  Car,
  UserRound,
  Filter,
  Eye,
} from 'lucide-react';

import useStore from '../../store/useStore';
import Pagination from '../../components/Pagination';
import '../../styles/MyCasesPage.css';

const statusFilters = ['all', 'pending', 'approved', 'dismissed', 'paid', 'unpaid'];
const CASES_PER_PAGE = 10;

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

const getUserId = (user) => {
  return user?.id || user?._id || '';
};

const getCaseId = (caseItem) => {
  return caseItem?.id || caseItem?._id || caseItem?.caseId || '';
};

const getOfficerId = (caseItem) => {
  const officer = caseItem?.officer;

  if (typeof officer === 'object' && officer) {
    return officer._id || officer.id || '';
  }

  return caseItem?.officerId || officer || '';
};

const getOfficerName = (caseItem) => {
  const officer = caseItem?.officer;

  if (typeof officer === 'object' && officer) {
    return officer.name || '';
  }

  return caseItem?.officerName || '';
};

const getPlateNumber = (caseItem) => {
  return (
    caseItem?.plateNumber ||
    caseItem?.registrationNumber ||
    caseItem?.vehicle?.registrationNumber ||
    caseItem?.vehicle?.plateNumber ||
    'N/A'
  );
};

const getVehicleTitle = (caseItem) => {
  const vehicle = caseItem?.vehicle;

  if (!vehicle) {
    return getPlateNumber(caseItem);
  }

  const brandModel = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();

  return brandModel || getPlateNumber(caseItem);
};

const getDriverName = (caseItem) => {
  const driver = caseItem?.driver;

  if (typeof driver === 'object' && driver) {
    return driver.name || driver.driverName || 'N/A';
  }

  return caseItem?.driverName || 'N/A';
};

const getLicenseNumber = (caseItem) => {
  const license = caseItem?.license;

  if (typeof license === 'object' && license) {
    return license.licenseNumber || 'N/A';
  }

  return caseItem?.licenseNumber || 'N/A';
};

const getLocationText = (caseItem) => {
  const location = caseItem?.location;

  if (!location) {
    return 'N/A';
  }

  if (typeof location === 'string') {
    return location;
  }

  return location.address || location.city || location.district || 'N/A';
};

const getLocationSubText = (caseItem) => {
  const location = caseItem?.location;

  if (!location || typeof location === 'string') {
    return '';
  }

  return [location.city, location.district].filter(Boolean).join(', ');
};

const getViolationText = (caseItem) => {
  return (
    caseItem?.violationLabel ||
    caseItem?.violationType ||
    caseItem?.description ||
    'Traffic Violation'
  );
};

const getPaymentStatus = (caseItem) => {
  if (caseItem?.status === 'paid') {
    return 'paid';
  }

  if (caseItem?.status === 'dismissed') {
    return 'waived';
  }

  return caseItem?.paymentStatus || 'unpaid';
};

const getCaseResponsibility = (caseItem = {}) => {
  const savedResponsibility = String(caseItem.responsibility || '').toLowerCase();

  if (['owner', 'driver', 'both'].includes(savedResponsibility)) {
    return savedResponsibility;
  }

  const code = String(
    caseItem.violationCode ||
      caseItem.code ||
      caseItem.ruleCode ||
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

  const text = getViolationText(caseItem).toLowerCase();

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

  if (text.includes('unauthorized driver') || text.includes('overloading')) {
    return 'both';
  }

  return 'owner';
};

const getResponsibilityLabel = (responsibility) => {
  if (responsibility === 'driver') {
    return 'Driver Responsibility';
  }

  if (responsibility === 'both') {
    return 'Both Responsibility';
  }

  return 'Owner Responsibility';
};

const getResponsibilityBadgeClass = (responsibility) => {
  if (responsibility === 'driver') {
    return 'bg-blue-100 text-blue-700';
  }

  if (responsibility === 'both') {
    return 'bg-purple-100 text-purple-700';
  }

  return 'bg-orange-100 text-orange-700';
};

const getDriverDisplayValue = (caseItem) => {
  const responsibility = getCaseResponsibility(caseItem);
  const driverName = getDriverName(caseItem);

  if (driverName !== 'N/A') {
    return driverName;
  }

  if (responsibility === 'owner') {
    return 'Owner-responsibility case';
  }

  if (responsibility === 'both') {
    return 'Owner + driver case';
  }

  return 'Driver-linked case';
};

const getDriverDisplaySubValue = (caseItem) => {
  const responsibility = getCaseResponsibility(caseItem);
  const licenseNumber = getLicenseNumber(caseItem);

  if (licenseNumber !== 'N/A') {
    return licenseNumber;
  }

  if (responsibility === 'owner') {
    return 'No driver required';
  }

  if (responsibility === 'both') {
    return 'Driver review required';
  }

  return 'License not attached';
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
  if (status === 'pending') {
    return Clock;
  }

  if (status === 'approved') {
    return CheckCircle;
  }

  if (status === 'dismissed') {
    return XCircle;
  }

  if (status === 'paid') {
    return CreditCard;
  }

  return FileWarning;
};

export default function MyCasesPage({ onNavigate = () => {} }) {
  const currentUser = useStore((state) => state.currentUser);
  const violations = useStore((state) => state.violations);
  const apiError = useStore((state) => state.apiError);

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const currentUserId = getUserId(currentUser);
  const allCases = Array.isArray(violations) ? violations : [];

  const myCases = useMemo(() => {
    if (!currentUserId && !currentUser?.name) {
      return allCases;
    }

    const matchedCases = allCases.filter((caseItem) => {
      const officerId = getOfficerId(caseItem);
      const officerName = getOfficerName(caseItem);

      return (
        officerId === currentUserId ||
        officerName === currentUser?.name ||
        caseItem.createdBy === currentUserId
      );
    });

    return matchedCases.length > 0 ? matchedCases : allCases;
  }, [allCases, currentUserId, currentUser?.name]);

  const filteredCases = useMemo(() => {
    let nextCases = myCases;

    if (statusFilter !== 'all') {
      nextCases = nextCases.filter((caseItem) => {
        const paymentStatus = getPaymentStatus(caseItem);

        if (statusFilter === 'paid' || statusFilter === 'unpaid') {
          return paymentStatus === statusFilter || caseItem.status === statusFilter;
        }

        return caseItem.status === statusFilter;
      });
    }

    const query = searchQ.trim().toLowerCase();

    if (!query) {
      return nextCases;
    }

    nextCases = nextCases.filter((caseItem) => {
      return (
        String(caseItem.caseId || '').toLowerCase().includes(query) ||
        getPlateNumber(caseItem).toLowerCase().includes(query) ||
        getDriverDisplayValue(caseItem).toLowerCase().includes(query) ||
        getLicenseNumber(caseItem).toLowerCase().includes(query) ||
        getViolationText(caseItem).toLowerCase().includes(query) ||
        getLocationText(caseItem).toLowerCase().includes(query) ||
        getResponsibilityLabel(getCaseResponsibility(caseItem)).toLowerCase().includes(query)
      );
    });

    return nextCases;
  }, [myCases, searchQ, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCaseId('');
  }, [searchQ, statusFilter, myCases.length]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / CASES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * CASES_PER_PAGE;
  const displayCases = filteredCases.slice(pageStartIndex, pageStartIndex + CASES_PER_PAGE);

  const totalCases = myCases.length;
  const pendingCases = myCases.filter((item) => item.status === 'pending').length;
  const approvedCases = myCases.filter((item) => item.status === 'approved').length;
  const paidCases = myCases.filter(
    (item) => item.status === 'paid' || getPaymentStatus(item) === 'paid'
  ).length;

  const totalFine = myCases.reduce((sum, item) => {
    return sum + safeNumber(item.fineAmount);
  }, 0);

  const summaryCards = [
    {
      label: 'Total Issued',
      value: totalCases,
      icon: FileWarning,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pending Review',
      value: pendingCases,
      icon: Clock,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Approved',
      value: approvedCases,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Total Fine',
      value: formatMoney(totalFine),
      icon: Banknote,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  const handleToggleDetails = (caseId) => {
    setSelectedCaseId((current) => (current === caseId ? '' : caseId));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedCaseId('');
  };

  return (
    <div className="my-cases-wrapper animate-fade-in space-y-6">
      <header className="my-cases-header bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="my-cases-header-content flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileWarning size={26} />
              My E-Challan Cases
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Track all digital violation cases issued by you.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('create-case')}
            className="my-cases-create-button bg-white text-[#0f4c81] rounded-xl px-4 py-2 text-sm font-semibold hover:shadow-lg active:scale-[0.98] flex items-center gap-2"
          >
            <FileWarning size={16} />
            New Case
          </button>
        </div>
      </header>

      {apiError && (
        <div className="my-cases-error bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <section className="my-cases-summary-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="my-cases-summary-card bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md"
            >
              <div
                className={`my-cases-summary-icon w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} />
              </div>

              <p className="text-2xl font-bold text-gray-800">{card.value}</p>

              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </article>
          );
        })}
      </section>

      <section className="my-cases-filter-card bg-white rounded-2xl border border-gray-100 p-4">
        <div className="my-cases-filter-row flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="my-cases-search-wrap relative flex-1">
            <Search
              size={18}
              className="my-cases-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search by case ID, plate, driver, license, violation, responsibility, or location..."
              className="my-cases-search-input w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            />
          </div>

          <div className="my-cases-filter-buttons flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-gray-400" />

            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`my-cases-filter-button px-3 py-1.5 rounded-lg text-xs font-medium ${
                  statusFilter === status
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

      <section className="my-cases-list-card bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredCases.length === 0 ? (
          <div className="my-cases-empty-state p-12 text-center text-gray-400">
            <FileWarning size={42} className="mx-auto mb-3 opacity-30" />

            <p className="text-sm font-medium">No cases found</p>

            <p className="text-xs mt-1">
              Try changing the search keyword or selected filter.
            </p>
          </div>
        ) : (
          <div className="my-cases-list divide-y divide-gray-50">
            {displayCases.map((caseItem) => {
              const caseId = getCaseId(caseItem);
              const status = caseItem.status || 'pending';
              const paymentStatus = getPaymentStatus(caseItem);
              const responsibility = getCaseResponsibility(caseItem);
              const StatusIcon = getStatusIcon(status);
              const detailsOpen = selectedCaseId === caseId;

              return (
                <article
                  key={caseId || caseItem.caseId}
                  className="my-cases-item p-5 hover:bg-gray-50"
                >
                  <div className="my-cases-item-top flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="my-cases-title-row flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-gray-800">
                          {caseItem.caseId || 'N/A'}
                        </p>

                        <span
                          className={`my-cases-status-badge inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          <StatusIcon size={12} />
                          {formatLabel(status)}
                        </span>

                        <span
                          className={`my-cases-payment-badge inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentStatusClass(
                            paymentStatus
                          )}`}
                        >
                          {formatLabel(paymentStatus)}
                        </span>

                        <span
                          className={`my-cases-responsibility-badge inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getResponsibilityBadgeClass(
                            responsibility
                          )}`}
                        >
                          {getResponsibilityLabel(responsibility)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {getViolationText(caseItem)}
                      </p>
                    </div>

                    <div className="my-cases-fine-box text-right shrink-0">
                      <p className="text-xs text-gray-400">Fine Amount</p>
                      <p className="text-lg font-bold text-gray-800">
                        {formatMoney(caseItem.fineAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="my-cases-info-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                    <InfoBlock
                      icon={Car}
                      label="Vehicle"
                      value={getVehicleTitle(caseItem)}
                      subValue={getPlateNumber(caseItem)}
                    />

                    <InfoBlock
                      icon={UserRound}
                      label="Driver"
                      value={getDriverDisplayValue(caseItem)}
                      subValue={getDriverDisplaySubValue(caseItem)}
                    />

                    <InfoBlock
                      icon={MapPin}
                      label="Location"
                      value={getLocationText(caseItem)}
                      subValue={getLocationSubText(caseItem)}
                    />

                    <InfoBlock
                      icon={CalendarDays}
                      label="Created"
                      value={formatDate(caseItem.createdAt || caseItem.issueDate)}
                      subValue={`Payment: ${formatLabel(paymentStatus)}`}
                    />
                  </div>

                  <div className="my-cases-actions mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleDetails(caseId)}
                      className="my-cases-details-button rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      {detailsOpen ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {detailsOpen && (
                    <div className="my-cases-description-box mt-4 rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {caseItem.description || 'No additional description attached.'}
                      </p>

                      <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs text-gray-500">
                        <div>
                          <span className="block text-gray-400">Responsibility</span>
                          <span className="font-semibold text-gray-700">
                            {getResponsibilityLabel(responsibility)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-gray-400">Officer</span>
                          <span className="font-semibold text-gray-700">
                            {getOfficerName(caseItem) || 'N/A'}
                          </span>
                        </div>

                        <div>
                          <span className="block text-gray-400">Payment Status</span>
                          <span className="font-semibold text-gray-700">
                            {formatLabel(paymentStatus)}
                          </span>
                        </div>
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
        totalItems={filteredCases.length}
        pageSize={CASES_PER_PAGE}
        onPageChange={handlePageChange}
        itemLabel="filtered case records"
      />

      <p className="my-cases-footer-count text-xs text-gray-400">
        Total issued: {myCases.length}. Paid cases: {paidCases}.
      </p>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, subValue }) {
  return (
    <div className="my-cases-info-block flex items-start gap-3 rounded-xl bg-gray-50 p-3">
      <div className="my-cases-info-icon w-9 h-9 rounded-lg bg-white text-[#0f4c81] flex items-center justify-center">
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
