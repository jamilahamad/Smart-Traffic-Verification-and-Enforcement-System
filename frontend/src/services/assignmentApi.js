import api from '../lib/api';

const assignmentApi = {
  getAssignments: api.getAssignments,
  getMyAssignments: api.getMyAssignments,
  createAssignment: api.createAssignment,
  assignDriver: api.assignDriver,
  assignDriverToVehicle: api.assignDriverToVehicle,
  removeAssignment: api.removeAssignment,
  checkAssignment: api.checkAssignment,
};

export default assignmentApi;