const authRoutes = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const licenseRoutes = require("./routes/license.routes");
const qrRoutes = require("./routes/qr.routes");
const violationRoutes = require("./routes/violation.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const logRoutes = require("./routes/log.routes");
const verificationLogRoutes = require("./routes/verificationLog.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const driverRoutes = require("./routes/driver.routes");
const automationRoutes = require("./routes/automation.routes");
const licenseRenewalRoutes = require("./routes/licenseRenewal.routes");

const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const {
  notFoundMiddleware,
  errorMiddleware,
} = require("./middlewares/errorMiddleware");

const app = express();

const allowedOrigins = [
  env.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "STVES Industrial API is running",
    mode: env.nodeEnv,
    brtaMode: env.brtaMode,
    brtaProvider: env.brtaProviderName,
    timestamp: new Date().toISOString(),
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/verification-logs", verificationLogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/license-renewals", licenseRenewalRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;