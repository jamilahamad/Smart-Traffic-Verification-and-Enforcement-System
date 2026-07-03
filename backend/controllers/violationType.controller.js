const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const violationTypeService = require("../services/violationType.service");
const { createAuditLog } = require("../services/log.service");

const getViolationTypes = asyncHandler(async (req, res) => {
  const filters = req.query || {};

  const violationTypes =
    req.user.role === "admin"
      ? await violationTypeService.getViolationTypes({ filters })
      : await violationTypeService.getActiveViolationTypes(filters);

  return sendSuccess(res, 200, "Violation types fetched successfully.", {
    count: violationTypes.length,
    violationTypes,
  });
});

const getActiveViolationTypes = asyncHandler(async (req, res) => {
  const violationTypes = await violationTypeService.getActiveViolationTypes(
    req.query || {}
  );

  return sendSuccess(res, 200, "Active violation types fetched successfully.", {
    count: violationTypes.length,
    violationTypes,
  });
});

const getViolationTypeById = asyncHandler(async (req, res) => {
  const violationType = await violationTypeService.getViolationTypeById(
    req.params.id
  );

  return sendSuccess(res, 200, "Violation type fetched successfully.", {
    violationType,
  });
});

const createViolationType = asyncHandler(async (req, res) => {
  const violationType = await violationTypeService.createViolationType(
    req.body,
    req.user
  );

  await createAuditLog({
    req,
    actor: req.user,
    action: "violation_type_created",
    module: "violation",
    entityType: "ViolationType",
    entityId: violationType._id,
    after: violationType,
    message: `Violation type ${violationType.name} was created.`,
  });

  return sendSuccess(res, 201, "Violation type created successfully.", {
    violationType,
  });
});

const updateViolationType = asyncHandler(async (req, res) => {
  const result = await violationTypeService.updateViolationType(
    req.params.id,
    req.body,
    req.user
  );

  await createAuditLog({
    req,
    actor: req.user,
    action: "violation_type_updated",
    module: "violation",
    entityType: "ViolationType",
    entityId: result.after._id,
    before: result.before,
    after: result.after,
    message: `Violation type ${result.after.name} was updated.`,
  });

  return sendSuccess(res, 200, "Violation type updated successfully.", {
    violationType: result.after,
  });
});

const updateViolationTypeStatus = asyncHandler(async (req, res) => {
  const result = await violationTypeService.updateViolationTypeStatus(
    req.params.id,
    req.body.status,
    req.user
  );

  await createAuditLog({
    req,
    actor: req.user,
    action: "violation_type_status_updated",
    module: "violation",
    entityType: "ViolationType",
    entityId: result.after._id,
    before: result.before,
    after: result.after,
    message: `Violation type ${result.after.name} status changed to ${result.after.status}.`,
  });

  return sendSuccess(res, 200, "Violation type status updated successfully.", {
    violationType: result.after,
  });
});

const deleteViolationType = asyncHandler(async (req, res) => {
  const result = await violationTypeService.softDeleteViolationType(
    req.params.id,
    req.user
  );

  await createAuditLog({
    req,
    actor: req.user,
    action: "violation_type_deleted",
    module: "violation",
    entityType: "ViolationType",
    entityId: result.after._id,
    before: result.before,
    after: result.after,
    message: `Violation type ${result.before.name} was soft deleted.`,
  });

  return sendSuccess(res, 200, "Violation type deleted successfully.", {
    violationType: result.after,
  });
});

module.exports = {
  getViolationTypes,
  getActiveViolationTypes,
  getViolationTypeById,
  createViolationType,
  updateViolationType,
  updateViolationTypeStatus,
  deleteViolationType,
};