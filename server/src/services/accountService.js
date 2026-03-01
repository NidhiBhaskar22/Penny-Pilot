const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");

const ACCOUNT_TYPES = ["BANK", "NET_BANKING", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CASH"];

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}

async function ensureBankParent(userId, type, parentId) {
  if (type === "BANK") return null;
  if (!parentId) {
    throw new ApiError(400, `${type} requires parentId (bank account)`);
  }

  const parent = await prisma.account.findFirst({
    where: { id: Number(parentId), userId, isActive: true },
  });
  if (!parent) throw new ApiError(404, "Parent bank account not found");
  if (normalizeType(parent.type) !== "BANK") {
    throw new ApiError(400, "parentId must reference a BANK account");
  }
  return parent;
}

async function listAccounts(userId) {
  return prisma.account.findMany({
    where: { userId, isActive: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

async function listAccountTree(userId) {
  const rows = await listAccounts(userId);
  const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];

  rows.forEach((row) => {
    const node = byId.get(row.id);
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const typeRank = { BANK: 1, NET_BANKING: 2, UPI: 3, CREDIT_CARD: 4, DEBIT_CARD: 5, CASH: 6 };
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      const ra = typeRank[normalizeType(a.type)] || 99;
      const rb = typeRank[normalizeType(b.type)] || 99;
      if (ra !== rb) return ra - rb;
      return String(a.name).localeCompare(String(b.name));
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

async function createAccount(userId, payload) {
  const type = normalizeType(payload.type);
  const name = String(payload.name || "").trim();
  const identifier = payload.identifier ? String(payload.identifier).trim() : null;

  if (!ACCOUNT_TYPES.includes(type)) {
    throw new ApiError(400, `Invalid type. Allowed: ${ACCOUNT_TYPES.join(", ")}`);
  }
  if (!name) throw new ApiError(400, "name is required");

  await ensureBankParent(userId, type, payload.parentId);

  const exists = await prisma.account.findFirst({
    where: {
      userId,
      isActive: true,
      name,
      type,
      parentId: type === "BANK" ? null : Number(payload.parentId),
    },
  });
  if (exists) throw new ApiError(409, "Account with same name/type already exists");

  return prisma.account.create({
    data: {
      userId,
      name,
      type,
      identifier,
      parentId: type === "BANK" ? null : Number(payload.parentId),
      balance: Number(payload.balance ?? 0),
    },
  });
}

async function updateAccount(userId, accountId, payload) {
  const id = Number(accountId);
  if (!id) throw new ApiError(400, "Invalid account id");

  const existing = await prisma.account.findFirst({
    where: { id, userId, isActive: true },
  });
  if (!existing) throw new ApiError(404, "Account not found");

  const nextType =
    payload.type !== undefined ? normalizeType(payload.type) : normalizeType(existing.type);
  if (!ACCOUNT_TYPES.includes(nextType)) {
    throw new ApiError(400, `Invalid type. Allowed: ${ACCOUNT_TYPES.join(", ")}`);
  }

  const nextParentId =
    payload.parentId !== undefined ? payload.parentId : existing.parentId;
  await ensureBankParent(userId, nextType, nextParentId);

  if (nextParentId && Number(nextParentId) === id) {
    throw new ApiError(400, "An account cannot be its own parent");
  }

  return prisma.account.update({
    where: { id },
    data: {
      name: payload.name !== undefined ? String(payload.name || "").trim() : undefined,
      type: payload.type !== undefined ? nextType : undefined,
      identifier:
        payload.identifier !== undefined
          ? String(payload.identifier || "").trim() || null
          : undefined,
      parentId:
        payload.parentId !== undefined
          ? nextType === "BANK"
            ? null
            : Number(payload.parentId)
          : undefined,
      balance: payload.balance !== undefined ? Number(payload.balance) : undefined,
    },
  });
}

async function deleteAccount(userId, accountId) {
  const id = Number(accountId);
  if (!id) throw new ApiError(400, "Invalid account id");

  const existing = await prisma.account.findFirst({
    where: { id, userId, isActive: true },
    include: { children: true, incomes: true, expenses: true, investments: true },
  });
  if (!existing) throw new ApiError(404, "Account not found");

  if (existing.children.length || existing.incomes.length || existing.expenses.length || existing.investments.length) {
    throw new ApiError(400, "Cannot delete account with linked data. Deactivate or move transactions first.");
  }

  await prisma.account.update({
    where: { id },
    data: { isActive: false },
  });

  return { message: "Account removed" };
}

module.exports = {
  listAccounts,
  listAccountTree,
  createAccount,
  updateAccount,
  deleteAccount,
};
