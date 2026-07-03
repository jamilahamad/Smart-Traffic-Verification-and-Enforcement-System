require("dotenv").config();

const mongoose = require("mongoose");

const env = require("../config/env");
const violationTypeService = require("../services/violationType.service");

const run = async () => {
  const mongoUri = env.mongoUri || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(mongoUri);

  const seeded = await violationTypeService.ensureDefaultViolationTypesSeeded();

  console.log(
    seeded
      ? "Default violation types seeded successfully."
      : "Violation types already exist. No seed needed."
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Violation type seed failed:", error.message);

  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect error
  }

  process.exit(1);
});