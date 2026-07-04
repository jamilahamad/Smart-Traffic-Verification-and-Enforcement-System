const nodemailer = require("nodemailer");

const env = require("../config/env");
const AppError = require("../utils/AppError");

let transporter = null;

const getTransporter = () => {
  if (!env.emailUser || !env.emailPass) {
    throw new AppError(
      "Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in backend .env.",
      500
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.emailUser,
        pass: env.emailPass,
      },
    });
  }

  return transporter;
};

const sendRegistrationOtpEmail = async ({ to, name, otp, expiresInMinutes }) => {
  const safeName = String(name || "STVES User").trim();
  const subject = "Your STVES email verification code";
  const fromName = env.emailFromName || "STVES";

  const text = [
    `Hello ${safeName},`,
    "",
    `Your STVES registration verification code is: ${otp}`,
    `This code will expire in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request this registration, please ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <div style="border: 1px solid #dbeafe; border-radius: 18px; overflow: hidden;">
        <div style="background: #0f4c81; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 22px;">STVES Email Verification</h2>
          <p style="margin: 6px 0 0; font-size: 13px; color: #dbeafe;">Smart Traffic Verification & Enforcement System</p>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <p style="margin: 0 0 12px;">Hello <strong>${safeName}</strong>,</p>
          <p style="margin: 0 0 16px;">Use the following code to verify your email and complete your registration.</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #0f4c81; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 18px 22px; text-align: center;">
            ${otp}
          </div>
          <p style="margin: 16px 0 0; color: #475569; font-size: 14px;">This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p style="margin: 16px 0 0; color: #64748b; font-size: 13px;">If you did not request this registration, please ignore this email.</p>
        </div>
      </div>
    </div>
  `;

  return getTransporter().sendMail({
    from: `"${fromName}" <${env.emailUser}>`,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendRegistrationOtpEmail,
};
