const asyncHandler = require("../utils/asyncHandler");
const qrService = require("../services/qr.service");
const logService = require("../services/log.service");

const verifyQR = asyncHandler(async (req, res) => {
  const qrValue = req.params.qrValue;

  const result = await qrService.verifyQR(qrValue);

  const data = result.response?.data || {};

  await logService.createVerificationLog({
    req,
    user: req.user || null,
    searchType: "qr",
    searchValue: qrValue,
    registrationNumber: data.registrationNumber,
    licenseNumber: data.licenseNumber,
    result: data.verification?.result || (data.valid ? "valid" : "warning"),
    dataSource: result.response?.dataSource,
    brtaProvider: result.response?.brtaProvider,
    verification: data.verification || {
      isCompliant: data.valid,
      safetyScore: data.safetyScore,
      complianceScore: data.complianceScore,
      riskLevel: data.riskLevel,
    },
    issues: data.issues || [],
  });

  return res.status(result.statusCode).json(result.response);
});

module.exports = {
  verifyQR,
};