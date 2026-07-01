import {
  Car,
  Copy,
  Download,
  Eye,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

import Badge from '../common/Badge';
import Button from '../common/Button';
import { cn } from '../../utils/cn';

const getVehiclePlate = (vehicle) => {
  return vehicle?.registrationNumber || vehicle?.plateNumber || vehicle?.plate || 'N/A';
};

const getVehicleTitle = (vehicle) => {
  const title = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim();
  return title || 'Unknown Vehicle';
};

const getQRValue = (vehicle, value) => {
  if (value) {
    return value;
  }

  if (vehicle?.qrCode) {
    return vehicle.qrCode;
  }

  return `STVES-VEH:${getVehiclePlate(vehicle)}`;
};

const buildPattern = (value) => {
  const source = String(value || 'STVES');

  return Array.from({ length: 49 }, (_, index) => {
    const charCode = source.charCodeAt(index % source.length) || 83;
    return (charCode + index * 7) % 3 !== 0;
  });
};

const copyText = async (value) => {
  if (!navigator?.clipboard) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
};

export default function VehicleQRCard({
  vehicle,
  value,
  title = 'Vehicle QR Code',
  subtitle = 'STVES digital vehicle verification code',
  compact = false,
  showActions = true,
  onVerify,
  onDownload,
  className = '',
}) {
  const qrValue = getQRValue(vehicle, value);
  const pattern = buildPattern(qrValue);

  const handleCopy = async () => {
    try {
      await copyText(qrValue);
    } catch (error) {
      console.error('QR copy failed:', error);
    }
  };

  return (
    <article
      className={cn(
        'stves-vehicle-qr-card overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm',
        className
      )}
    >
      <div className="stves-vehicle-qr-head bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <QrCode size={20} />
              {title}
            </h3>

            <p className="mt-1 text-sm text-blue-100">{subtitle}</p>
          </div>

          <Badge variant="dark" className="bg-white/15 border-white/20 text-white">
            Verified
          </Badge>
        </div>
      </div>

      <div className={cn('stves-vehicle-qr-body p-5', compact && 'p-4')}>
        <div className="stves-vehicle-qr-main flex flex-col items-center text-center">
          <div
            className={cn(
              'stves-vehicle-qr-box rounded-2xl border border-gray-200 bg-white p-4 shadow-inner',
              compact ? 'w-44' : 'w-56'
            )}
          >
            <div className="grid grid-cols-7 gap-1">
              {pattern.map((active, index) => (
                <span
                  key={`${qrValue}-${index}`}
                  className={cn(
                    'aspect-square rounded-sm',
                    active ? 'bg-slate-900' : 'bg-gray-100'
                  )}
                />
              ))}
            </div>
          </div>

          <code className="mt-4 w-full rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 break-all">
            {qrValue}
          </code>
        </div>

        {vehicle && (
          <div className="stves-vehicle-qr-info mt-5 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0f4c81]">
                <Car size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800">
                  {getVehiclePlate(vehicle)}
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  {getVehicleTitle(vehicle)}
                  {vehicle.year ? ` (${vehicle.year})` : ''}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge status={vehicle.status || 'active'} size="xs">
                    {vehicle.status || 'active'}
                  </Badge>

                  <Badge variant="primary" size="xs">
                    {vehicle.vehicleType || 'Vehicle'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {showActions && (
          <div className="stves-vehicle-qr-actions mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={Copy}
              onClick={handleCopy}
              fullWidth
            >
              Copy
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={Download}
              onClick={() => onDownload?.(qrValue, vehicle)}
              fullWidth
            >
              Save
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={Eye}
              onClick={() => onVerify?.(qrValue, vehicle)}
              fullWidth
            >
              Verify
            </Button>
          </div>
        )}

        <div className="stves-vehicle-qr-footer mt-5 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} />
          <span>Powered by Smart Traffic Verification & Enforcement System</span>
        </div>
      </div>
    </article>
  );
}