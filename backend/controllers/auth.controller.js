const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const authService = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);

  return sendSuccess(res, 201, "User registered successfully.", {
    token: result.token,
    user: result.user,
  });
});

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

module.exports = {
  register,
  login,
  me,
  updateMe,
};