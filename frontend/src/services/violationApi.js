import api from '../lib/api';

const violationApi = {
  getViolations: api.getViolations,
  getMyViolations: api.getMyViolations,
  getDriverViolations: api.getDriverViolations,
  getVehicleViolations: api.getVehicleViolations,
  getViolationById: api.getViolationById,
  createViolation: api.createViolation,
  updateViolationStatus: api.updateViolationStatus,
  reviewViolation: api.reviewViolation,
  updatePayment: api.updatePayment,
  markViolationPaid: api.markViolationPaid,
};

export default violationApi;