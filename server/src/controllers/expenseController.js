// src/controllers/expenseController.js
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const expenseService = require("../services/expenseService");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

// POST /api/expenses
exports.createExpense = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const expense = await expenseService.createExpense(userId, req.body);
  res.status(201).json(expense);
});

// PUT /api/expenses/:id
exports.updateExpense = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const expense = await expenseService.updateExpense(
    userId,
    req.params.id,
    req.body
  );
  res.json(expense);
});

// DELETE /api/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const result = await expenseService.deleteExpense(userId, req.params.id);
  res.json(result);
});

// GET /api/expenses
exports.getAllExpenses = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const expenses = await expenseService.getAllExpenses(userId);
  res.json(expenses);
});

// GET /api/expenses/month/:month?summary=1
exports.getExpensesByMonth = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { month } = req.params; // e.g. "2025-09"
  const summaryOnly = req.query.summary === "1" || req.query.summary === "true";

  const data = await expenseService.getExpensesByMonth(
    userId,
    month,
    summaryOnly
  );

  res.json(data);
});
