const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const accountService = require("../services/accountService");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

exports.getAccounts = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const tree = String(req.query.tree || "false").toLowerCase() === "true";
  const result = tree
    ? await accountService.listAccountTree(userId)
    : await accountService.listAccounts(userId);

  res.json(result);
});

exports.createAccount = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const account = await accountService.createAccount(userId, req.body);
  res.status(201).json(account);
});

exports.updateAccount = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const account = await accountService.updateAccount(userId, req.params.id, req.body);
  res.json(account);
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const result = await accountService.deleteAccount(userId, req.params.id);
  res.json(result);
});
