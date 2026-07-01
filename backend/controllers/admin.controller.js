const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const adminService = require("../services/admin.service");

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await adminService.getDashboard();

  return sendSuccess(res, 200, "Admin dashboard fetched successfully.", {
    dashboard,


    ...dashboard,
    summary: dashboard.summary,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAdminUsers(req.query);

  return sendSuccess(res, 200, "Admin users fetched successfully.", {
    count: users.length,
    users,
  });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await adminService.createAdminUser(req.body);

  return sendSuccess(res, 201, "Admin user created successfully.", {
    user,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await adminService.updateAdminUser(req.params.id, req.body);

  return sendSuccess(res, 200, "Admin user updated successfully.", {
    user,
  });
});

const getVehicles = asyncHandler(async (req, res) => {
  const result = await adminService.getAdminVehicles(req.query);

  return sendSuccess(res, 200, "Admin vehicles fetched successfully.", result);
});

const getLicenses = asyncHandler(async (req, res) => {
  const result = await adminService.getAdminLicenses(req.query);

  return sendSuccess(res, 200, "Admin licenses fetched successfully.", result);
});

const getCases = asyncHandler(async (req, res) => {
  const cases = await adminService.getAdminCases(req.query);

  return sendSuccess(res, 200, "Admin cases fetched successfully.", {
    count: cases.length,
    cases,
  });
});

const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await adminService.getAdminAssignments(req.query);

  return sendSuccess(res, 200, "Admin assignments fetched successfully.", {
    count: assignments.length,
    assignments,
  });
});

const uploadBrtaDriverPhoto = asyncHandler(async (req, res) => {
  const result = await adminService.uploadBrtaDriverPhoto(
    req.params.brtaDriverId,
    req.file
  );

  return sendSuccess(res, 200, "BRTA driver photo uploaded successfully.", {
    driver: result,
  });
});

const uploadBrtaOwnerPhoto = asyncHandler(async (req, res) => {
  const result = await adminService.uploadBrtaOwnerPhoto(
    req.params.brtaOwnerId,
    req.file
  );

  return sendSuccess(res, 200, "BRTA owner photo uploaded successfully.", {
    owner: result,
  });
});

module.exports = {
  getDashboard,
  getUsers,
  createUser,
  updateUser,
  getVehicles,
  getLicenses,
  getCases,
  getAssignments,
  uploadBrtaDriverPhoto,
  uploadBrtaOwnerPhoto,
};