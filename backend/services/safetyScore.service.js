const isExpired = (dateValue) => {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
};

const buildIssue = (code, message, severity = "warning", penalty = 0) => {
  return {
    code,
    message,
    severity,
    penalty,
  };
};

const getRiskLevel = (score) => {
  if (score >= 85) return "Low Risk";
  if (score >= 65) return "Medium Risk";
  if (score >= 40) return "High Risk";
  return "Critical Risk";
};

const calculateVehicleSafetyScore = ({
  vehicle,
  documents,
  blacklistRecords = [],
  unpaidViolationsCount = 0,
}) => {
  let score = 100;
  const issues = [];

  const activeBlacklist = blacklistRecords.find(
    (item) => item.status === "active"
  );

  if (activeBlacklist || vehicle?.status === "blacklisted") {
    return {
      score: 0,
      complianceScore: 0,
      riskLevel: "Critical Risk",
      isCompliant: false,
      issues: [
        buildIssue(
          "VEHICLE_BLACKLISTED",
          activeBlacklist?.reason || "Vehicle is blacklisted.",
          "critical",
          100
        ),
      ],
    };
  }

  if (vehicle?.status === "suspended") {
    score -= 45;
    issues.push(
      buildIssue("VEHICLE_SUSPENDED", "Vehicle status is suspended.", "critical", 45)
    );
  }

  if (vehicle?.status === "expired") {
    score -= 25;
    issues.push(
      buildIssue("VEHICLE_EXPIRED", "Vehicle status is expired.", "warning", 25)
    );
  }

  if (isExpired(vehicle?.registrationExpiry)) {
    score -= 25;
    issues.push(
      buildIssue("REGISTRATION_EXPIRED", "Vehicle registration is expired.", "warning", 25)
    );
  }

  const registrationCertificate = documents?.registrationCertificate;
  const fitnessCertificate = documents?.fitnessCertificate;
  const taxToken = documents?.taxToken;
  const insurance = documents?.insurance;
  const routePermit = documents?.routePermit;

  if (
    registrationCertificate?.status === "expired" ||
    isExpired(registrationCertificate?.expiryDate)
  ) {
    score -= 25;
    issues.push(
      buildIssue(
        "REGISTRATION_CERTIFICATE_EXPIRED",
        "Registration certificate is expired.",
        "warning",
        25
      )
    );
  }

  if (
    fitnessCertificate?.status === "expired" ||
    isExpired(fitnessCertificate?.expiryDate)
  ) {
    score -= 25;
    issues.push(
      buildIssue("FITNESS_EXPIRED", "Fitness certificate is expired.", "warning", 25)
    );
  }

  if (taxToken?.status === "expired" || isExpired(taxToken?.expiryDate)) {
    score -= 20;
    issues.push(
      buildIssue("TAX_TOKEN_EXPIRED", "Tax token is expired.", "warning", 20)
    );
  }

  if (insurance?.status === "expired" || isExpired(insurance?.expiryDate)) {
    score -= 10;
    issues.push(
      buildIssue("INSURANCE_EXPIRED", "Insurance is expired.", "warning", 10)
    );
  }

  if (routePermit?.status === "expired" || isExpired(routePermit?.expiryDate)) {
    score -= 15;
    issues.push(
      buildIssue("ROUTE_PERMIT_EXPIRED", "Route permit is expired.", "warning", 15)
    );
  }

  if (unpaidViolationsCount > 0) {
    const penalty = Math.min(unpaidViolationsCount * 10, 30);
    score -= penalty;

    issues.push(
      buildIssue(
        "UNPAID_VIOLATIONS",
        `${unpaidViolationsCount} unpaid violation(s) found for this vehicle.`,
        "warning",
        penalty
      )
    );
  }

  score = Math.max(0, Math.min(100, score));
  const riskLevel = getRiskLevel(score);

  return {
    score,
    complianceScore: score,
    riskLevel,
    isCompliant: score >= 70 && !issues.some((i) => i.severity === "critical"),
    issues,
  };
};

const calculateLicenseSafetyScore = ({
  license,
  driver,
  blacklistRecords = [],
  unpaidViolationsCount = 0,
}) => {
  let score = 100;
  const issues = [];

  const activeLicenseBlacklist = blacklistRecords.find(
    (item) => item.entityType === "license" && item.status === "active"
  );

  const activeDriverBlacklist = blacklistRecords.find(
    (item) => item.entityType === "driver" && item.status === "active"
  );

  if (
    activeLicenseBlacklist ||
    activeDriverBlacklist ||
    license?.status === "blacklisted" ||
    driver?.status === "blacklisted"
  ) {
    return {
      score: 0,
      complianceScore: 0,
      riskLevel: "Critical Risk",
      isCompliant: false,
      issues: [
        buildIssue(
          "LICENSE_BLACKLISTED",
          activeLicenseBlacklist?.reason ||
            activeDriverBlacklist?.reason ||
            "License/driver is blacklisted.",
          "critical",
          100
        ),
      ],
    };
  }

  if (license?.status === "suspended") {
    score -= 50;
    issues.push(
      buildIssue("LICENSE_SUSPENDED", "License status is suspended.", "critical", 50)
    );
  }

  if (driver?.status === "suspended") {
    score -= 40;
    issues.push(
      buildIssue("DRIVER_SUSPENDED", "Driver status is suspended.", "critical", 40)
    );
  }

  const normalizedStatus = String(license?.status || "").toLowerCase();

  if (!["valid", "active"].includes(normalizedStatus)) {
    score -= 30;
    issues.push(
      buildIssue("LICENSE_STATUS_INVALID", "License status is not valid.", "warning", 30)
    );
  }

  if (isExpired(license?.expiryDate)) {
    score -= 50;
    issues.push(
      buildIssue("LICENSE_EXPIRED", "Driving license is expired.", "critical", 50)
    );
  }

  if (unpaidViolationsCount > 0) {
    const penalty = Math.min(unpaidViolationsCount * 10, 30);
    score -= penalty;

    issues.push(
      buildIssue(
        "UNPAID_DRIVER_VIOLATIONS",
        `${unpaidViolationsCount} unpaid violation(s) found for this driver.`,
        "warning",
        penalty
      )
    );
  }

  score = Math.max(0, Math.min(100, score));
  const riskLevel = getRiskLevel(score);

  return {
    score,
    complianceScore: score,
    riskLevel,
    isCompliant: score >= 70 && !issues.some((i) => i.severity === "critical"),
    issues,
  };
};

module.exports = {
  calculateVehicleSafetyScore,
  calculateLicenseSafetyScore,
  getRiskLevel,
  buildIssue,
};