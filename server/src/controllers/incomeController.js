// src/controllers/incomeController.js
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const incomeService = require("../services/incomeService");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

// POST /api/income
exports.createIncome = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const income = await incomeService.createIncome(userId, req.body);
  res.status(201).json(income);
});

// PUT /api/income/:id
exports.updateIncome = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const income = await incomeService.updateIncome(
    userId,
    req.params.id,
    req.body
  );
  res.json(income);
});

// DELETE /api/income/:id
exports.deleteIncome = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const result = await incomeService.deleteIncome(userId, req.params.id);
  res.json(result);
});

// GET /api/income
exports.getAllIncomes = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const incomes = await incomeService.getAllIncomes(userId);
  res.json(incomes);
});

// GET /api/income/month/:month   (adjust route if you use query instead)
exports.getIncomesByMonth = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { month } = req.params; // or req.query.month if your route is different
  const incomes = await incomeService.getIncomesByMonth(userId, month);
  res.json(incomes);
});
