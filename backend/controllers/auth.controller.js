const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const authService = require("../services/auth.service");

const requestRegistrationOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestRegistrationOtp(req.body);

  return sendSuccess(res, 200, "Verification code sent to your email.", {
    email: result.email,
    role: result.role,
    expiresAt: result.expiresAt,
    expiresInMinutes: result.expiresInMinutes,
  });
});

const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyRegistrationOtp(req.body);

  return sendSuccess(res, 201, "Email verified and user registered successfully.", {
    token: result.token,
    user: result.user,
  });
});

const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordResetOtp(req.body);

  return sendSuccess(res, 200, "Password reset code sent to your email.", {
    email: result.email,
    expiresAt: result.expiresAt,
    expiresInMinutes: result.expiresInMinutes,
  });
});

const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordWithOtp(req.body);

  return sendSuccess(res, 200, "Password reset successfully. Please login.", {
    email: result.email,
  });
});

const register = requestRegistrationOtp;

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  return sendSuccess(res, 200, "Login successful.", {
    token: result.token,
    user: result.user,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);

  return sendSuccess(res, 200, "Current user fetched successfully.", {
    user,
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateCurrentUser(req.user._id, req.body);

  return sendSuccess(res, 200, "Profile updated successfully.", {
    user,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await authService.changeCurrentPassword(req.user._id, req.body);

  return sendSuccess(res, 200, "Password changed successfully.", {
    user,
  });
});

module.exports = {
  register,
  requestRegistrationOtp,
  verifyRegistrationOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  login,
  me,
  updateMe,
  changePassword,
};
