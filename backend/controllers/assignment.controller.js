const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const assignmentService = require("../services/assignment.service");

const createAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.createAssignment(req.body, req.user);

  let message = "Assignment created successfully.";

  if (result.alreadyExists) {
    message =
      result.assignmentStatus === "active"
        ? "Active assignment already exists."
        : "Assignment request already exists.";
  } else if (result.requiresDriverApproval) {
    message = "Assignment request sent to driver for approval.";
  }

  return sendSuccess(
    res,
    result.alreadyExists ? 200 : 201,
    message,
    result
  );
});

const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getAssignments(req.user, req.query);

  return sendSuccess(res, 200, "Assignments fetched successfully.", {
    count: assignments.length,
    assignments,
  });
});

const getMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getAssignments(req.user, req.query);

  return sendSuccess(res, 200, "My assignments fetched successfully.", {
    count: assignments.length,
    assignments,
  });
});

const getMyAssignmentRequests = asyncHandler(async (req, res) => {
  const requests = await assignmentService.getMyAssignmentRequests(req.user);

  return sendSuccess(
    res,
    200,
    "Assignment requests fetched successfully.",
    { requests, count: requests.length }
  );
});

const respondToAssignmentRequest = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.respondToAssignmentRequest(
    {
      assignmentId: req.params.id,
      action: req.body.action,
      responseNote: req.body.responseNote || req.body.note,
    },
    req.user
  );

  const message =
    assignment.status === "active"
      ? "Assignment request accepted successfully."
      : "Assignment request rejected successfully.";

  return sendSuccess(res, 200, message, { assignment });
});

const createAssignmentInvitation = asyncHandler(async (req, res) => {
  const result = await assignmentService.createAssignmentInvitation(
    req.body,
    req.user
  );

  return sendSuccess(
    res,
    result.alreadyExists ? 200 : 201,
    result.alreadyExists
      ? "Invitation already exists."
      : "Invitation created successfully.",
    result
  );
});

const removeAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.removeAssignment({
    id: req.params.id,
    reason: req.body.reason,
    user: req.user,
  });

  return sendSuccess(res, 200, "Assignment removed successfully.", {
    assignment,
  });
});

const searchDriverForAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.searchDriverForAssignment({
    q: req.query.q,
    user: req.user,
  });

  return sendSuccess(
    res,
    result.success ? 200 : 404,
    result.message || "Driver search completed.",
    result
  );
});

const checkAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.checkAssignment({
    registrationNumber: req.params.registrationNumber,
    licenseNumber: req.params.licenseNumber,
  });

  return sendSuccess(res, 200, "Assignment authorization checked successfully.", {
    authorization: result,
  });
});

module.exports = {
  createAssignment,
  getAssignments,
  getMyAssignments,
  getMyAssignmentRequests,
  respondToAssignmentRequest,
  createAssignmentInvitation,
  removeAssignment,
  checkAssignment,
  searchDriverForAssignment,
};