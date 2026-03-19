const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const llmInsightService = require("../services/llmInsightService");

exports.generateAnalysisSummary = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const summary = req.body?.summary;
  if (!summary || typeof summary !== "object") {
    throw new ApiError(400, "summary payload is required");
  }

  const insights = await llmInsightService.generateSummary(summary);
  res.json({ insights });
});
