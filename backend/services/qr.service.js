const brtaMockService = require("./brtaMock.service");
const brtaLicenseService = require("./brtaLicense.service");
const { parseSTVESQR } = require("../utils/qr");

const maskNid = (nid = "") => {
  const value = String(nid || "");
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
};

const sanitizeVehicleQRResult = (result) => {
  const vehicle = result.vehicle || {};
  const owner = result.owner || vehicle.owner || {};

  return {
    success: true,
    type: "vehicle",
    dataSource: result.dataSource || "BRTA_MOCK",
    brtaProvider: result.brtaProvider || "Mock BRTA Registry",
    checkedAt: result.checkedAt || new Date().toISOString(),

    data: {
      valid: Boolean(result.verification?.isCompliant),
      registrationNumber: vehicle.registrationNumber || result.registrationNumber,
      qrCode: vehicle.qrCode,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      status: vehicle.status,

      owner: owner
        ? {
            name: owner.name || "Hidden",
            status: owner.status || "active",
          }
        : null,

      safetyScore: result.safetyScore ?? result.verification?.safetyScore ?? 0,
      complianceScore:
        result.complianceScore ?? result.verification?.complianceScore ?? 0,
      riskLevel: result.riskLevel || result.verification?.riskLevel,
      issues: result.issues || result.verification?.issues || [],
      verification: result.verification,
    },
  };
};

const sanitizeLicenseQRResult = (result) => {
  const license = result.license || {};
  const driver = result.driver || license.driver || {};

  return {
    success: true,
    type: "license",
    dataSource: result.dataSource || "BRTA_MOCK",
    brtaProvider: result.brtaProvider || "Mock BRTA Registry",
    checkedAt: result.checkedAt || new Date().toISOString(),

    data: {
      valid: Boolean(result.verification?.isCompliant),
      licenseNumber: license.licenseNumber || result.licenseNumber,
      qrCode: license.qrCode,
      holderName: license.holderName || driver.name || "Hidden",
      licenseClass: license.licenseClass,
      status: license.status,
      issueDate: license.issueDate,
      expiryDate: license.expiryDate,
      issuingAuthority: license.issuingAuthority,

      driver: driver
        ? {
            name: driver.name || license.holderName || "Hidden",
            status: driver.status || "active",
            nid: driver.nid ? maskNid(driver.nid) : undefined,
          }
        : null,

      licenseClassInfo: result.licenseClass || license.licenseClassInfo || null,

      safetyScore: result.safetyScore ?? result.verification?.safetyScore ?? 0,
      complianceScore:
        result.complianceScore ?? result.verification?.complianceScore ?? 0,
      riskLevel: result.riskLevel || result.verification?.riskLevel,
      issues: result.issues || result.verification?.issues || [],
      verification: result.verification,
    },
  };
};

const verifyQR = async (qrValue) => {
  const parsed = parseSTVESQR(qrValue);

  if (!parsed.valid) {
    return {
      found: false,
      statusCode: 400,
      response: {
        success: false,
        type: "unknown",
        message:
          "Invalid STVES QR format. Expected STVES-VEH:<plate> or STVES-LIC:<licenseNumber>.",
        dataSource: "BRTA_MOCK",
        brtaProvider: "Mock BRTA Registry",
        checkedAt: new Date().toISOString(),
        data: {
          valid: false,
          qrCode: parsed.raw,
          issues: [
            {
              code: "INVALID_QR_FORMAT",
              message:
                "QR code format is invalid. Use STVES-VEH:<plate> or STVES-LIC:<licenseNumber>.",
              severity: "critical",
              penalty: 100,
            },
          ],
        },
      },
    };
  }

  if (parsed.type === "vehicle") {
    const result = await brtaMockService.verifyVehicle({
      registrationNumber: parsed.value,
    });

    if (!result.found) {
      return {
        found: false,
        statusCode: 404,
        response: {
          success: false,
          type: "vehicle",
          message: "Vehicle not found in Mock BRTA Registry.",
          dataSource: result.dataSource || "BRTA_MOCK",
          brtaProvider: result.brtaProvider || "Mock BRTA Registry",
          checkedAt: result.checkedAt || new Date().toISOString(),
          data: {
            valid: false,
            registrationNumber: parsed.value,
            qrCode: parsed.qrCode,
            safetyScore: 0,
            complianceScore: 0,
            riskLevel: "Critical Risk",
            issues: result.verification?.issues || [],
            verification: result.verification,
          },
        },
      };
    }

    return {
      found: true,
      statusCode: 200,
      response: {
        message: result.verification?.isCompliant
          ? "Vehicle QR verified successfully."
          : "Vehicle QR verified with compliance issues.",
        ...sanitizeVehicleQRResult(result),
      },
    };
  }

  if (parsed.type === "license") {
    const result = await brtaLicenseService.verifyLicense({
      licenseNumber: parsed.value,
    });

    if (!result.found) {
      return {
        found: false,
        statusCode: 404,
        response: {
          success: false,
          type: "license",
          message: "License not found in Mock BRTA Registry.",
          dataSource: result.dataSource || "BRTA_MOCK",
          brtaProvider: result.brtaProvider || "Mock BRTA Registry",
          checkedAt: result.checkedAt || new Date().toISOString(),
          data: {
            valid: false,
            licenseNumber: parsed.value,
            qrCode: parsed.qrCode,
            safetyScore: 0,
            complianceScore: 0,
            riskLevel: "Critical Risk",
            issues: result.verification?.issues || [],
            verification: result.verification,
          },
        },
      };
    }

    return {
      found: true,
      statusCode: 200,
      response: {
        message: result.verification?.isCompliant
          ? "License QR verified successfully."
          : "License QR verified with compliance issues.",
        ...sanitizeLicenseQRResult(result),
      },
    };
  }

  return {
    found: false,
    statusCode: 400,
    response: {
      success: false,
      type: "unknown",
      message: "Unsupported QR type.",
    },
  };
};

module.exports = {
  verifyQR,
};