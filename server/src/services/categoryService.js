const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");

const CATEGORY_TYPES = new Set(["INCOME", "EXPENSE"]);

function normalizeName(name) {
  return String(name || "").trim();
}

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}

async function listCategories(userId, query = {}) {
  const type = query.type ? normalizeType(query.type) : undefined;
  if (type && !CATEGORY_TYPES.has(type)) {
    throw new ApiError(400, "Invalid category type");
  }

  const sortBy = query.sortBy === "createdAt" ? "createdAt" : "name";
  const order = query.order === "desc" ? "desc" : "asc";
  const q = normalizeName(query.q);

  return prisma.category.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { [sortBy]: order },
  });
}

async function createCategory(userId, payload = {}) {
  const name = normalizeName(payload.name);
  const type = normalizeType(payload.type);

  if (!name) throw new ApiError(400, "name is required");
  if (!CATEGORY_TYPES.has(type)) throw new ApiError(400, "type must be INCOME or EXPENSE");

  const existing = await prisma.category.findFirst({
    where: {
      userId,
      type,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      userId,
      name,
      type,
      kakeibo: payload.kakeibo ? String(payload.kakeibo).trim() : null,
    },
  });
}

async function updateCategory(userId, id, payload = {}) {
  const categoryId = Number(id);
  if (!categoryId) throw new ApiError(400, "Invalid category id");

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) throw new ApiError(404, "Category not found");

  const data = {};
  if (payload.name !== undefined) {
    const nextName = normalizeName(payload.name);
    if (!nextName) throw new ApiError(400, "name cannot be empty");
    data.name = nextName;
  }
  if (payload.type !== undefined) {
    const nextType = normalizeType(payload.type);
    if (!CATEGORY_TYPES.has(nextType)) {
      throw new ApiError(400, "type must be INCOME or EXPENSE");
    }
    data.type = nextType;
  }
  if (payload.kakeibo !== undefined) {
    data.kakeibo = payload.kakeibo ? String(payload.kakeibo).trim() : null;
  }

  const finalName = data.name ?? existing.name;
  const finalType = data.type ?? existing.type;
  const duplicate = await prisma.category.findFirst({
    where: {
      userId,
      id: { not: categoryId },
      type: finalType,
      name: { equals: finalName, mode: "insensitive" },
    },
  });
  if (duplicate) throw new ApiError(409, "Category with same name already exists");

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

async function deleteCategory(userId, id) {
  const categoryId = Number(id);
  if (!categoryId) throw new ApiError(400, "Invalid category id");

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!existing) throw new ApiError(404, "Category not found");

  const [incomeCount, expenseCount, limitCount] = await Promise.all([
    prisma.income.count({ where: { userId, categoryId } }),
    prisma.expense.count({ where: { userId, categoryId } }),
    prisma.limit.count({ where: { userId, categoryId } }),
  ]);

  if (incomeCount || expenseCount || limitCount) {
    throw new ApiError(400, "Category is in use and cannot be deleted");
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return { message: "Category deleted" };
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CATEGORY_TYPES: Array.from(CATEGORY_TYPES),
};

