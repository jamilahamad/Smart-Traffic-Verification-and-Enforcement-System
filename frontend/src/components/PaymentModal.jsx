import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';

import Badge from './common/Badge';
import Button from './common/Button';
import Modal from './common/Modal';
import { cn } from '../utils/cn';

const paymentMethods = [
  {
    id: 'mobile_banking',
    label: 'Mobile Banking',
    description: 'Simulated bKash / Nagad / Rocket payment',
    icon: Smartphone,
  },
  {
    id: 'card',
    label: 'Card Payment',
    description: 'Simulated debit / credit card payment',
    icon: CreditCard,
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    description: 'Simulated government treasury payment',
    icon: Banknote,
  },
  {
    id: 'wallet',
    label: 'STVES Wallet',
    description: 'Simulated internal wallet payment',
    icon: WalletCards,
  },
];

const safeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMoney = (amount) => {
  return `৳${safeNumber(amount).toLocaleString()}`;
};

const getVehiclePlate = (violation) => {
  return (
    violation?.registrationNumber ||
    violation?.plateNumber ||
    violation?.vehicle?.registrationNumber ||
    violation?.vehicle?.plateNumber ||
    'N/A'
  );
};

const getViolationTitle = (violation) => {
  return (
    violation?.violationLabel ||
    violation?.violationType ||
    violation?.violationCode ||
    'Traffic Violation'
  );
};

export default function PaymentModal({
  isOpen,
  violation,
  loading = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const [selectedMethod, setSelectedMethod] = useState('mobile_banking');
  const [accepted, setAccepted] = useState(false);

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find((method) => method.id === selectedMethod);
  }, [selectedMethod]);

  const fineAmount = safeNumber(violation?.fineAmount);
  const serviceCharge = fineAmount > 0 ? 0 : 0;
  const totalAmount = fineAmount + serviceCharge;

  const canPay = Boolean(violation && selectedMethod && accepted && !loading);

  const handleConfirm = () => {
    if (!canPay) {
      return;
    }

    onConfirm?.({
      violation,
      paymentMethod: selectedPaymentMethod,
      amount: totalAmount,
      serviceCharge,
      paidAt: new Date().toISOString(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title="Simulated Fine Payment"
      description="Confirm payment to mark this e-challan as paid."
      size="lg"
      closeOnBackdrop={!loading}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="gradient"
            leftIcon={ShieldCheck}
            loading={loading}
            disabled={!canPay}
            onClick={handleConfirm}
          >
            Confirm Payment
          </Button>
        </div>
      }
    >
      {!violation ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <AlertTriangle size={38} className="mx-auto mb-3 text-orange-500" />
          <p className="text-sm font-semibold text-gray-700">
            No violation selected for payment.
          </p>
        </div>
      ) : (
        <div className="stves-payment-modal space-y-5">
          <section className="rounded-2xl bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText size={22} />
                  <p className="text-sm font-semibold text-blue-100">
                    E-Challan Payment
                  </p>
                </div>

                <h3 className="mt-2 text-xl font-bold">
                  {violation.caseId || 'Case ID Pending'}
                </h3>

                <p className="mt-1 text-sm text-blue-100">
                  {getViolationTitle(violation)}
                </p>
              </div>

              <Badge variant="dark" className="bg-white/15 border-white/20 text-white">
                {violation.status || 'pending'}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Vehicle" value={getVehiclePlate(violation)} />
              <InfoTile label="Fine Amount" value={formatMoney(fineAmount)} />
              <InfoTile label="Payment" value={violation.paymentStatus || 'unpaid'} />
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <section className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <h4 className="mb-3 text-sm font-bold text-gray-800">
              Select Payment Method
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      'rounded-2xl border bg-white p-4 text-left transition-all',
                      isSelected
                        ? 'border-[#0f4c81] ring-4 ring-[#0f4c81]/10'
                        : 'border-gray-100 hover:border-blue-200'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          isSelected
                            ? 'bg-[#0f4c81] text-white'
                            : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {method.label}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-gray-500">
                          {method.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4">
            <h4 className="mb-3 text-sm font-bold text-gray-800">
              Payment Summary
            </h4>

            <div className="space-y-2 text-sm">
              <SummaryRow label="Fine Amount" value={formatMoney(fineAmount)} />
              <SummaryRow label="Service Charge" value={formatMoney(serviceCharge)} />
              <div className="border-t border-gray-100 pt-2">
                <SummaryRow
                  label="Total Payable"
                  value={formatMoney(totalAmount)}
                  strong
                />
              </div>
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0f4c81] focus:ring-[#0f4c81]"
            />

            <span className="text-sm leading-relaxed text-orange-800">
              I confirm that this is a simulated payment for STVES demo purpose.
              After confirmation, this e-challan will be marked as paid.
            </span>
          </label>
        </div>
      )}
    </Modal>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[11px] uppercase tracking-wider text-blue-100">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-white">
        {value || 'N/A'}
      </p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'font-bold text-gray-800' : 'text-gray-500'}>
        {label}
      </span>

      <span className={strong ? 'text-lg font-bold text-[#0f4c81]' : 'font-semibold text-gray-800'}>
        {value}
      </span>
    </div>
  );
}