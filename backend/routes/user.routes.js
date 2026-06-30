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

module.exports = router;