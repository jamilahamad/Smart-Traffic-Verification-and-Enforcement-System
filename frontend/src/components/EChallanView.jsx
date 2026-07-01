import {
  Banknote,
  CalendarDays,
  Car,
  CreditCard,
  Download,
  FileWarning,
  IdCard,
  MapPin,
  Printer,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import Badge from './common/Badge';
import Button from './common/Button';
import { cn } from '../utils/cn';

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount) => {
  return `৳${safeNumber(amount).toLocaleString()}`;
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

const getPlate = (violation) => {
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
    return getPlate(violation);
  }

  return `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || getPlate(violation);
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

const getOfficerName = (violation) => {
  const officer = violation?.officer;

  if (officer && typeof officer === 'object') {
    return officer.name || 'N/A';
  }

  return violation?.officerName || 'N/A';
};

const getLocationText = (violation) => {
  const location = violation?.location;

  if (!location) {
    return 'N/A';
  }

  if (typeof location === 'string') {
    return location;
  }

  return [location.address, location.city, location.district].filter(Boolean).join(', ') || 'N/A';
};

const getViolationType = (violation) => {
  return violation?.violationLabel || violation?.violationType || 'Traffic Violation';
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

const getEvidenceText = (evidence) => {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return 'No evidence attached.';
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

export default function EChallanView({
  violation,
  title = 'E-Challan Receipt',
  showActions = true,
  onPrint,
  onDownload,
  onPay,
  className = '',
}) {
  if (!violation) {
    return (
      <div className="stves-echallan-empty rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
        <FileWarning size={42} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No E-Challan data found</p>
      </div>
    );
  }

  const paymentStatus = getPaymentStatus(violation);
  const canPay =
    paymentStatus !== 'paid' &&
    violation.status !== 'pending' &&
    violation.status !== 'dismissed';

  return (
    <article
      className={cn(
        'stves-echallan-view overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm',
        className
      )}
    >
      <div className="stves-echallan-header bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <FileWarning size={26} />
              {title}
            </h2>

            <p className="mt-1 text-sm text-blue-100">
              Smart Traffic Verification & Enforcement System
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-blue-100">Case ID</p>
            <p className="text-xl font-bold">{violation.caseId || 'N/A'}</p>

            <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
              <Badge status={violation.status || 'pending'}>
                {violation.status || 'pending'}
              </Badge>

              <Badge status={paymentStatus}>{paymentStatus}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="stves-echallan-body p-6">
        <div className="stves-echallan-summary grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBox icon={Car} label="Vehicle" value={getVehicleTitle(violation)} subValue={getPlate(violation)} />
          <InfoBox icon={UserRound} label="Driver" value={getDriverName(violation)} subValue={`License: ${getLicenseNumber(violation)}`} />
          <InfoBox icon={MapPin} label="Location" value={getLocationText(violation)} />
          <InfoBox icon={CalendarDays} label="Issued At" value={formatDateTime(violation.createdAt || violation.issueDate)} />
        </div>

        <section className="stves-echallan-section mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800">
            <ShieldCheck size={16} />
            Violation Information
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem label="Violation Type" value={getViolationType(violation)} />
            <DetailItem label="Fine Amount" value={formatMoney(violation.fineAmount)} strong />
            <DetailItem label="Officer" value={getOfficerName(violation)} />
            <DetailItem label="Payment Status" value={paymentStatus} />
            <DetailItem
              label="Description"
              value={violation.description || 'No additional description.'}
              wide
            />
            <DetailItem label="Evidence" value={getEvidenceText(violation.evidence)} wide />
          </div>
        </section>

        <section className="stves-echallan-payment mt-6 rounded-2xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-5 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-blue-100">Total Payable Fine</p>
              <p className="mt-1 text-3xl font-bold">
                {formatMoney(violation.fineAmount)}
              </p>
            </div>

            <div className="text-sm text-blue-100">
              <p>Payment: {paymentStatus.toUpperCase()}</p>
              <p>Case Status: {(violation.status || 'pending').toUpperCase()}</p>
            </div>
          </div>
        </section>

        {showActions && (
          <div className="stves-echallan-actions mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              leftIcon={Printer}
              onClick={() => {
                if (typeof onPrint === 'function') {
                  onPrint(violation);
                } else {
                  window.print();
                }
              }}
            >
              Print
            </Button>

            <Button
              type="button"
              variant="secondary"
              leftIcon={Download}
              onClick={() => onDownload?.(violation)}
            >
              Download
            </Button>

            {canPay && (
              <Button
                type="button"
                variant="gradient"
                leftIcon={CreditCard}
                onClick={() => onPay?.(violation)}
              >
                Pay Now
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function InfoBox({ icon: Icon, label, value, subValue }) {
  return (
    <div className="stves-echallan-info-box rounded-2xl bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0f4c81]">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="mt-1 truncate text-sm font-bold text-gray-800">{value || 'N/A'}</p>

          {subValue && (
            <p className="mt-0.5 truncate text-xs text-gray-500">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, strong = false, wide = false }) {
  return (
    <div className={cn('stves-echallan-detail-item', wide && 'md:col-span-2')}>
      <p className="text-xs text-gray-400">{label}</p>

      <p
        className={cn(
          'mt-1 text-sm leading-relaxed text-gray-700',
          strong && 'text-lg font-bold text-gray-900'
        )}
      >
        {value || 'N/A'}
      </p>
    </div>
  );
}