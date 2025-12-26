// src/controllers/authController.js
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const authService = require("../services/authService");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(result);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  res.json(result);
});

// POST /api/auth/complete-profile
exports.completeProfile = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const result = await authService.completeProfile(userId, req.body);
  res.json(result);
});
