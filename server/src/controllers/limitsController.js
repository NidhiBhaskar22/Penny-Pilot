// controllers/limitsController.js
const prisma = require("../config/prismaClient");
const { parsePagination, buildPaginatedResult } = require("../utils/pagination");


exports.createLimit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { scope, amount, month, year, week, day, categoryId } = req.body;

    if (!scope || amount == null || categoryId == null) {
      return res.status(400).json({ message: "categoryId, scope and amount are required" });
    }

    // Basic scope validation
    const allowedScopes = ["DAILY", "WEEKLY", "MONTHLY"];
    if (!allowedScopes.includes(scope)) {
      return res.status(400).json({ message: "Invalid scope" });
    }

    // Ensure correct period fields per scope
    if (scope === "MONTHLY") {
      const bothNull = month == null && year == null; // "All Months"
      const bothPresent = month != null && year != null;
      if (!bothNull && !bothPresent) {
        return res
          .status(400)
          .json({ message: "For MONTHLY limits, provide both month+year or keep both empty for all months" });
      }
    }

    if (scope === "WEEKLY" && (week == null || year == null)) {
      return res
        .status(400)
        .json({ message: "week and year required for WEEKLY limits" });
    }

    if (scope === "DAILY" && !day) {
      return res.status(400).json({ message: "day required for DAILY limits" });
    }

    // verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      return res.status(404).json({ message: "Category not found for user" });
    }

    // Prevent duplicates: same scope + same period + same categoryId
    const existing = await prisma.limit.findFirst({
      where: {
        userId,
        scope,
        month: month ?? null,
        year: year ?? null,
        week: week ?? null,
        day: day ? new Date(day) : null,
        categoryId: categoryId ?? null,
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "Limit already exists for this scope/period/category",
        existing,
      });
    }

    const limit = await prisma.limit.create({
      data: {
        userId,
        scope,
        amount,
        month: month ?? null,
        year: year ?? null,
        week: week ?? null,
        day: day ? new Date(day) : null,
        categoryId: categoryId ?? null,
      },
    });

    return res.status(201).json(limit);
  } catch (err) {
    console.error("createLimit error:", err);
    return res.status(500).json({ message: "Failed to create limit" });
  }
};


exports.getLimits = async (req, res) => {
  try {
    const userId = req.user.userId;

    const scope = req.query.scope;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const week = req.query.week ? Number(req.query.week) : undefined;
    const day = req.query.day ? new Date(req.query.day) : undefined;
    const categoryId = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortByRaw = String(req.query.sortBy || "id");
    const allowedSort = new Set(["id", "amount", "scope", "month", "year", "week"]);
    const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "id";

    const { page, pageSize, skip, take } = parsePagination(req.query, {
      defaultPageSize: 10,
      maxPageSize: 100,
    });

    const where = {
      userId,
      ...(scope ? { scope } : {}),
      ...(month != null ? { month } : {}),
      ...(year != null ? { year } : {}),
      ...(week != null ? { week } : {}),
      ...(day ? { day } : {}),
      ...(categoryId != null ? { categoryId } : {}),
      ...(q ? { category: { name: { contains: q, mode: "insensitive" } } } : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.limit.count({ where }),
      prisma.limit.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
      }),
    ]);

    return res.json(
      buildPaginatedResult({
        items,
        total,
        page,
        pageSize,
      })
    );
  } catch (err) {
    console.error("getLimits error:", err);
    return res.status(500).json({ message: "Failed to fetch limits" });
  }
};


exports.updateLimit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limitId = Number(req.params.id);

    const { scope, amount, month, year, week, day, categoryId } = req.body;
    const hasMonth = Object.prototype.hasOwnProperty.call(req.body, "month");
    const hasYear = Object.prototype.hasOwnProperty.call(req.body, "year");
    const hasWeek = Object.prototype.hasOwnProperty.call(req.body, "week");
    const hasDay = Object.prototype.hasOwnProperty.call(req.body, "day");
    const hasCategoryId = Object.prototype.hasOwnProperty.call(req.body, "categoryId");

    const existing = await prisma.limit.findFirst({
      where: { id: limitId, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Limit not found" });
    }

    // If scope changes, re-validate fields
    const newScope = scope ?? existing.scope;

    if (newScope === "MONTHLY") {
      const effectiveMonth = hasMonth ? month : existing.month;
      const effectiveYear = hasYear ? year : existing.year;
      const bothNull = effectiveMonth == null && effectiveYear == null;
      const bothPresent = effectiveMonth != null && effectiveYear != null;
      if (!bothNull && !bothPresent) {
        return res
          .status(400)
          .json({ message: "For MONTHLY limits, provide both month+year or keep both empty for all months" });
      }
    }
    if (
      newScope === "WEEKLY" &&
      ((week ?? existing.week) == null || (year ?? existing.year) == null)
    ) {
      return res
        .status(400)
        .json({ message: "week and year required for WEEKLY limits" });
    }
    if (newScope === "DAILY" && !(day ?? existing.day)) {
      return res.status(400).json({ message: "day required for DAILY limits" });
    }

    const effectiveCategoryId = hasCategoryId ? categoryId : existing.categoryId;
    if (effectiveCategoryId == null) {
      return res.status(400).json({ message: "categoryId is required" });
    }

    const category = await prisma.category.findFirst({
      where: { id: effectiveCategoryId, userId },
    });
    if (!category) {
      return res.status(404).json({ message: "Category not found for user" });
    }

    const updated = await prisma.limit.update({
      where: { id: limitId },
      data: {
        ...(scope ? { scope } : {}),
        ...(amount != null ? { amount } : {}),
        ...(hasMonth ? { month: month ?? null } : {}),
        ...(hasYear ? { year: year ?? null } : {}),
        ...(hasWeek ? { week: week ?? null } : {}),
        ...(hasDay ? { day: day ? new Date(day) : null } : {}),
        ...(hasCategoryId ? { categoryId } : {}),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateLimit error:", err);
    return res.status(500).json({ message: "Failed to update limit" });
  }
};


exports.deleteLimit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limitId = Number(req.params.id);

    const existing = await prisma.limit.findFirst({
      where: { id: limitId, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Limit not found" });
    }

    await prisma.limit.delete({ where: { id: limitId } });

    return res.json({ message: "Limit deleted" });
  } catch (err) {
    console.error("deleteLimit error:", err);
    return res.status(500).json({ message: "Failed to delete limit" });
  }
};


exports.getActiveLimits = async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // naive week number (you can replace with ISO week util)
    const start = new Date(year, 0, 1);
    const diffDays = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((diffDays + start.getDay() + 1) / 7);

    const day = new Date(now.toISOString().split("T")[0]); // strip time

    const limits = await prisma.limit.findMany({
      where: {
        userId,
        OR: [
          { scope: "MONTHLY", month, year },
          { scope: "MONTHLY", month: null, year: null },
          { scope: "WEEKLY", week, year },
          { scope: "DAILY", day },
        ],
      },
      include: { category: true },
    });

    return res.json(limits);
  } catch (err) {
    console.error("getActiveLimits error:", err);
    return res.status(500).json({ message: "Failed to fetch active limits" });
  }
};
