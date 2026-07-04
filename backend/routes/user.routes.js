const express = require("express");

const protect = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  userController.getUsers
);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  userController.createUser
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  userController.getUserById
);

router.patch(
  "/:id",
  protect,
  authorizeRoles("admin"),
  userController.updateUser
);

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  userController.updateUserStatus
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  userController.deleteUser
);

module.exports = router;