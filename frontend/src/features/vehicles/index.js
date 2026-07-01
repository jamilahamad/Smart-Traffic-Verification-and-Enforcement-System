export { default as vehicleApi } from '../../services/vehicleApi';

export {
  getVehicleId,
} from '../../utils/getId';

export {
  getVehiclePlate,
} from '../../utils/safeRender';

export {
  buildVehicleQR,
  parseSTVESQR,
  QR_TYPES,
} from '../../utils/qr';

export {
  VEHICLE_STATUSES,
  getStatusLabel,
  getStatusVariant,
} from '../../constants/statuses';