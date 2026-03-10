const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const categoryService = require("../services/categoryService");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

exports.listCategories = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const rows = await categoryService.listCategories(userId, req.query);
  res.json(rows);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const row = await categoryService.createCategory(userId, req.body);
  res.status(201).json(row);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const row = await categoryService.updateCategory(userId, req.params.id, req.body);
  res.json(row);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const result = await categoryService.deleteCategory(userId, req.params.id);
  res.json(result);
});

