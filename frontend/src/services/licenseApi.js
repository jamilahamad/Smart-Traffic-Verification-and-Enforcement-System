import api from '../lib/api';

const licenseApi = {
  getLicenses: api.getLicenses,
  getMyLicenses: api.getMyLicenses,
  getDriverLicenses: api.getDriverLicenses,
  createLicense: api.createLicense,
  updateLicenseStatus: api.updateLicenseStatus,
  verifyLicense: api.verifyLicense,
};

export default licenseApi;