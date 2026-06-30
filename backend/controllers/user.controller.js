const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const userService = require("../services/user.service");

const getUsers = asyncHandler(async (req, res) => {
  const users = await userService.getUsers(req.query);

  return sendSuccess(res, 200, "Users fetched successfully.", {
    count: users.length,
    users,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  return sendSuccess(res, 200, "User fetched successfully.", {
    user,
  });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  return sendSuccess(res, 201, "User created successfully.", {
    user,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);

  return sendSuccess(res, 200, "User updated successfully.", {
    user,
  });
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
};