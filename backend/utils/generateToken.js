const jwt = require("jsonwebtoken");
const env = require("../config/env");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
};

module.exports = generateToken;