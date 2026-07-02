const Violation = require("../models/Violation");

const generateCaseId = async () => {
  const year = new Date().getFullYear();

  const count = await Violation.countDocuments({
    caseId: {
      $regex: `^EC-${year}-`,
    },
  });

  const nextNumber = String(count + 1).padStart(6, "0");

  return `EC-${year}-${nextNumber}`;
};

module.exports = generateCaseId;