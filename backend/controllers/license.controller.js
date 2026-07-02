const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const brtaLicenseService = require("../services/brtaLicense.service");
const logService = require("../services/log.service");

const getLicenses = asyncHandler(async (req, res) => {
  const licenses = await brtaLicenseService.getAllLicenses();

  return sendSuccess(res, 200, "Licenses fetched successfully.", {
    count: licenses.length,
    licenses,
  });
});

const getMyLicenses = asyncHandler(async (req, res) => {
  const licenses = await brtaLicenseService.getMyLicenses(req.user);

  return sendSuccess(res, 200, "My licenses fetched successfully.", {
    count: licenses.length,
    licenses,
  });
});

const verifyLicense = asyncHandler(async (req, res) => {
  const licenseNumber = req.params.licenseNumber || req.params.license;

  const result = await brtaLicenseService.verifyLicense({
    licenseNumber,
  });

  if (!result.found) {
    throw new AppError("License not found in Mock BRTA Registry.", 404, [
      result.verification,
    ]);
  }

  await logService.createVerificationLog({
  req,
  user: req.user,
  searchType: "license",
  searchValue: licenseNumber,
  licenseNumber: result.licenseNumber,
  result: result.verification?.result,
  dataSource: result.dataSource,
  brtaProvider: result.brtaProvider,
  verification: result.verification,
  issues: result.issues,
});

  return sendSuccess(
    res,
    200,
    result.verification.isCompliant
      ? "License verified successfully."
      : "License verified with compliance issues.",
    result
  );
});

module.exports = {
  getLicenses,
  getMyLicenses,
  verifyLicense,
};