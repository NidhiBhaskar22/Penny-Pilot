const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");

const METHOD_TYPES = ["NET_BANKING", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH"];

function normalizeMethod(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}

async function assertUserExists(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(401, "Invalid session. Please login again.");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(401, "Invalid session. Please login again.");
  }
  return id;
}

async function listAccounts(userId) {
  const validUserId = await assertUserExists(userId);
  const rows = await prisma.account.findMany({
    where: { userId: validUserId, isActive: true },
    orderBy: [{ createdAt: "asc" }],
    include: {
      methods: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return rows.map((a) => ({
    ...a,
    enabledMethods: a.methods.map((m) => m.method),
  }));
}

async function listAccountTree(userId) {
  // backward-compatible response shape for existing client tree rendering
  const rows = await listAccounts(userId);
  return rows.map((row) => ({
    ...row,
    type: "BANK",
    children: row.methods.map((m) => ({
      id: `method-${row.id}-${m.method}`,
      name: m.method.replaceAll("_", " "),
      type: m.method,
      parentId: row.id,
      balance: null,
      isActive: true,
      children: [],
    })),
  }));
}

async function createAccount(userId, payload) {
  const validUserId = await assertUserExists(userId);
  const name = String(payload.name || "").trim();
  const identifier = payload.identifier ? String(payload.identifier).trim() : null;

  if (!name) throw new ApiError(400, "name is required");

  const exists = await prisma.account.findFirst({
    where: {
      userId: validUserId,
      isActive: true,
      name,
    },
  });
  if (exists) throw new ApiError(409, "Account with same name already exists");

  return prisma.account.create({
    data: {
      userId: validUserId,
      name,
      identifier,
      balance: Number(payload.balance ?? 0),
    },
    include: {
      methods: true,
    },
  });
}

async function updateAccount(userId, accountId, payload) {
  const validUserId = await assertUserExists(userId);
  const id = Number(accountId);
  if (!id) throw new ApiError(400, "Invalid account id");

  const existing = await prisma.account.findFirst({
    where: { id, userId: validUserId, isActive: true },
  });
  if (!existing) throw new ApiError(404, "Account not found");

  return prisma.account.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? String(payload.name || "").trim() : undefined,
      identifier:
        payload.identifier !== undefined
          ? String(payload.identifier || "").trim() || null
          : undefined,
      balance: payload.balance !== undefined ? Number(payload.balance) : undefined,
    },
    include: {
      methods: true,
    },
  });
}

async function deleteAccount(userId, accountId) {
  const validUserId = await assertUserExists(userId);
  const id = Number(accountId);
  if (!id) throw new ApiError(400, "Invalid account id");

  const existing = await prisma.account.findFirst({
    where: { id, userId: validUserId, isActive: true },
    include: { incomes: true, expenses: true, investments: true },
  });
  if (!existing) throw new ApiError(404, "Account not found");

  if (existing.incomes.length || existing.expenses.length || existing.investments.length) {
    throw new ApiError(400, "Cannot delete account with linked data. Deactivate or move transactions first.");
  }

  await prisma.account.update({
    where: { id },
    data: { isActive: false },
  });

  return { message: "Account removed" };
}

async function setAccountMethods(userId, accountId, methodList) {
  const validUserId = await assertUserExists(userId);
  const id = Number(accountId);
  if (!id) throw new ApiError(400, "Invalid account id");
  const account = await prisma.account.findFirst({
    where: { id, userId: validUserId, isActive: true },
  });
  if (!account) throw new ApiError(404, "Account not found");

  const normalized = Array.from(
    new Set((Array.isArray(methodList) ? methodList : []).map(normalizeMethod))
  );

  const invalid = normalized.filter((m) => !METHOD_TYPES.includes(m));
  if (invalid.length) {
    throw new ApiError(400, `Invalid methods: ${invalid.join(", ")}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountMethod.deleteMany({
      where: { accountId: id },
    });

    if (normalized.length) {
      await tx.accountMethod.createMany({
        data: normalized.map((m) => ({
          accountId: id,
          method: m,
        })),
        skipDuplicates: true,
      });
    }
  });

  return prisma.account.findUnique({
    where: { id },
    include: { methods: true },
  });
}

module.exports = {
  listAccounts,
  listAccountTree,
  createAccount,
  updateAccount,
  deleteAccount,
  setAccountMethods,
  METHOD_TYPES,
};
