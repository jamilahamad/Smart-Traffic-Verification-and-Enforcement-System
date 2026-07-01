const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const violationService = require("../services/violation.service");
const AppError = require("../utils/AppError");

const DRIVER_ONLY_VIOLATION_CODES = new Set([
  "DL_EXP",
  "DL_RENEW_LATE",
  "NO_DL",
  "SIGNAL",
  "SPEED",
  "RECKLESS",
  "PARKING",
  "HELMET",
  "SEATBELT",
]);

const OWNER_ONLY_VIOLATION_CODES = new Set([
  "REG_EXP",
  "FIT_EXP",
  "TAX_EXP",
  "INS_EXP",
  "ROUTE_EXP",
  "BLACKLIST",
]);

const BOTH_VIOLATION_CODES = new Set([
  "UNAUTH_DRV",
  "OVERLOAD",
]);

const getViolationText = (violation = {}) => {
  return String(
    violation.violationType ||
    violation.violationLabel ||
    violation.description ||
    ""
  ).toLowerCase();
};

const getViolationResponsibility = (violation = {}) => {
  const savedResponsibility = String(
    violation.responsibility || ""
  ).toLowerCase();

  if (["owner", "driver", "both"].includes(savedResponsibility)) {
    return savedResponsibility;
  }

  const code = String(
    violation.violationCode ||
    violation.code ||
    violation.ruleCode ||
    ""
  ).toUpperCase();

  if (DRIVER_ONLY_VIOLATION_CODES.has(code)) {
    return "driver";
  }

  if (BOTH_VIOLATION_CODES.has(code)) {
    return "both";
  }

  if (OWNER_ONLY_VIOLATION_CODES.has(code)) {
    return "owner";
  }

  const text = getViolationText(violation);

  if (
    text.includes("traffic signal") ||
    text.includes("speeding") ||
    text.includes("reckless") ||
    text.includes("helmet") ||
    text.includes("seatbelt") ||
    text.includes("driving without license") ||
    text.includes("expired driving license") ||
    text.includes("license renewal") ||
    text.includes("illegal parking")
  ) {
    return "driver";
  }

  if (text.includes("unauthorized driver") || text.includes("overloading")) {
    return "both";
  }

  return "owner";
};

const canAccessViolationForRole = (violation, user) => {
  if (!violation || !user) {
    return false;
  }

  if (["admin", "police"].includes(user.role)) {
    return true;
  }

  const responsibility = getViolationResponsibility(violation);

  if (user.role === "driver") {
    return responsibility === "driver" || responsibility === "both";
  }

  if (user.role === "owner") {
    return responsibility === "owner" || responsibility === "both";
  }

  return false;
};

const filterViolationsForRole = (violations = [], user) => {
  if (!Array.isArray(violations)) {
    return [];
  }

  return violations.filter((violation) => {
    return canAccessViolationForRole(violation, user);
  });
};

const createViolation = asyncHandler(async (req, res) => {
  const violation = await violationService.createViolation(req.body, req.user);

  return sendSuccess(res, 201, "E-Challan created successfully.", {
    violation,
  });
});

const getViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getViolations({
    user: req.user,
    filters: req.query,
  });

  return sendSuccess(res, 200, "Violations fetched successfully.", {
    count: violations.length,
    violations,
  });
});

const getMyViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getViolations({
    user: req.user,
    filters: req.query,
  });

  const visibleViolations = filterViolationsForRole(violations, req.user);

  return sendSuccess(res, 200, "My violations fetched successfully.", {
    count: visibleViolations.length,
    violations: visibleViolations,
  });
});

const getViolationById = asyncHandler(async (req, res) => {
  const violation = await violationService.getViolationById(
    req.params.id,
    req.user
  );

  if (!canAccessViolationForRole(violation, req.user)) {
    throw new AppError("Violation not found.", 404);
  }

  return sendSuccess(res, 200, "Violation fetched successfully.", {
    violation,
  });
});

const updateViolationStatus = asyncHandler(async (req, res) => {
  const requestedStatus = String(req.body.status || "").toLowerCase();

  if (
    req.user.role === "admin" &&
    ["paid", "unpaid", "waived"].includes(requestedStatus)
  ) {
    throw new AppError(
      "Admin cannot directly change payment status. Payment must be completed by driver or owner.",
      403
    );
  }

  if (["driver", "owner"].includes(req.user.role)) {
    const existingViolation = await violationService.getViolationById(
      req.params.id,
      req.user
    );

    if (!canAccessViolationForRole(existingViolation, req.user)) {
      throw new AppError("Payment is not allowed for this violation.", 403);
    }

    if (requestedStatus === "paid") {
      const responsibility = getViolationResponsibility(existingViolation);

      if (req.user.role === "driver" && responsibility === "owner") {
        throw new AppError(
          "Driver cannot pay owner-responsibility violation.",
          403
        );
      }

      if (req.user.role === "owner" && responsibility === "driver") {
        throw new AppError(
          "Owner cannot pay driver-responsibility violation.",
          403
        );
      }
    }
  }

  const violation = await violationService.updateViolationStatus({
    id: req.params.id,
    status: req.body.status,
    note: req.body.note || req.body.reviewNote,
    admin: req.user,
  });

  return sendSuccess(res, 200, "Violation status updated successfully.", {
    violation,
  });
});

const getVehicleViolations = asyncHandler(async (req, res) => {
  const registrationNumber =
    req.params.registrationNumber || req.params.plate || req.params.vehicleId;

  const violations = await violationService.getVehicleViolations(
    registrationNumber,
    req.user
  );

  const visibleViolations = filterViolationsForRole(violations, req.user);

  return sendSuccess(res, 200, "Vehicle violations fetched successfully.", {
    count: visibleViolations.length,
    violations: visibleViolations,
  });
});

module.exports = {
  createViolation,
  getViolations,
  getMyViolations,
  getViolationById,
  updateViolationStatus,
  getVehicleViolations,
};