export { default as api } from '../../lib/api';

export {
  QR_TYPES,
  QR_PREFIXES,
  buildVehicleQR,
  buildLicenseQR,
  normalizeQRValue,
  parseSTVESQR,
  isVehicleQR,
  isLicenseQR,
  getQRDisplayLabel,
} from '../../utils/qr';

export {
  getComplianceStatus,
  getStatusLabel,
  getStatusVariant,
} from '../../utils/status';

export {
  getVehiclePlate,
  getLicenseNumber,
} from '../../utils/safeRender';