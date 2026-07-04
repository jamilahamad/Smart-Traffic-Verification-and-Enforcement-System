const dotenv = require("dotenv");

dotenv.config();

const getEnv = (keys, fallback = "") => {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,


   industrialPort: Number(
    process.env.INDUSTRIAL_PORT ||
      process.env.INDUSTRIAL_BACKEND_PORT ||
      5001
  ),

  mongoUri: getEnv([
    "MONGO_URI",
    "MONGODB_URI",
    "MONGO_URL",
    "DATABASE_URL",
    "DB_URI",
  ]),

  jwtSecret: getEnv(["JWT_SECRET", "JWT_ACCESS_SECRET"], "stves_dev_secret"),

  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  emailUser: getEnv(["GMAIL_USER", "EMAIL_USER", "SMTP_USER"]),
  emailPass: getEnv(["GMAIL_APP_PASSWORD", "EMAIL_PASS", "SMTP_PASS"]),
  emailFromName: process.env.EMAIL_FROM_NAME || "STVES",
  registrationOtpMinutes: Number(process.env.REGISTRATION_OTP_MINUTES || 10),

  brtaMode: process.env.BRTA_MODE || "mock",
  brtaProviderName: process.env.BRTA_PROVIDER_NAME || "Mock BRTA Registry",
};

module.exports = env;