import api from '../lib/api';

const vehicleApi = {
  getVehicles: api.getVehicles,
  getMyVehicles: api.getMyVehicles,
  createVehicle: api.createVehicle,
  registerVehicle: api.registerVehicle,
  addVehicle: api.addVehicle,
  updateVehicle: api.updateVehicle,
  updateVehicleStatus: api.updateVehicleStatus,
  verifyVehicle: api.verifyVehicle,
  getVehicleViolations: api.getVehicleViolations,
};

export default vehicleApi;