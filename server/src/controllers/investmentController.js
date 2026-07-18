const prisma = require("../config/prismaClient");
const instrumentService = require("../services/instrumentService");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const { applyBalanceChange } = require("../utils/balanceUtils");
const { parsePagination, buildPaginatedResult } = require("../utils/pagination");
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");

const METHOD_TYPES = new Set(["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"]);

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeBigInt(value) {
  return typeof value === "bigint" ? Number(value) : value;
}

function serializeQuote(quote) {
  if (!quote) return null;
  return {
    ...quote,
    price: asNumber(quote.price),
    change: quote.change != null ? asNumber(quote.change) : null,
    changePercent: quote.changePercent != null ? asNumber(quote.changePercent) : null,
    marketCap: serializeBigInt(quote.marketCap) ?? null,
    volume: serializeBigInt(quote.volume) ?? null,
  };
}

function hasUsablePrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function serializeTransaction(tx) {
  return {
    ...tx,
    quantity: asNumber(tx.quantity),
    price: asNumber(tx.price),
    fees: asNumber(tx.fees),
    instrument: tx.instrument
      ? {
          ...tx.instrument,
          expenseRatio:
            tx.instrument.expenseRatio != null ? asNumber(tx.instrument.expenseRatio) : null,
          aum: tx.instrument.aum != null ? asNumber(tx.instrument.aum) : null,
          latestQuote: serializeQuote(tx.instrument.latestQuote),
        }
      : null,
  };
}

async function ensureAccount(userId) {
  let account = await prisma.account.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId,
        name: "Primary Bank",
        balance: 0,
      },
    });
  }
  return account;
}

async function resolveBankAccount(userId, accountId) {
  if (accountId == null) return ensureAccount(userId);
  const account = await prisma.account.findFirst({
    where: { id: Number(accountId), userId, isActive: true },
  });
  if (!account) return null;
  return account;
}

async function resolvePaymentMethod(userId, bankAccountId, paymentMethod) {
  const normalized = normalizeType(paymentMethod);
  if (!METHOD_TYPES.has(normalized)) return "INVALID_METHOD";
  const enabled = await prisma.accountMethod.findFirst({
    where: {
      accountId: bankAccountId,
      account: { userId, isActive: true },
      method: normalized,
    },
  });
  if (!enabled) return null;
  return normalized;
}

async function getInstrumentOrThrow(symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) {
    return { error: { status: 400, message: "symbol is required" } };
  }

  const instrument = await prisma.instrument.findUnique({
    where: { symbol: normalizedSymbol },
    include: { latestQuote: true },
  });

  if (!instrument) {
    return { error: { status: 404, message: "Instrument not found. Sync it first from /api/instruments." } };
  }

  return { instrument };
}

async function getPositionState(userId, instrumentId, excludeTransactionId = null) {
  const transactions = await prisma.investmentTransaction.findMany({
    where: {
      userId,
      instrumentId,
      ...(excludeTransactionId ? { id: { not: Number(excludeTransactionId) } } : {}),
    },
    orderBy: [{ transactedAt: "asc" }, { id: "asc" }],
  });

  let quantity = 0;
  let costBasis = 0;

  transactions.forEach((tx) => {
    const txQuantity = asNumber(tx.quantity);
    const txPrice = asNumber(tx.price);
    const txFees = asNumber(tx.fees);

    if (tx.transactionType === "BUY") {
      quantity += txQuantity;
      costBasis += txQuantity * txPrice + txFees;
      return;
    }

    if (quantity <= 0) return;

    const soldQuantity = Math.min(quantity, txQuantity);
    const averageCost = quantity > 0 ? costBasis / quantity : 0;
    quantity -= soldQuantity;
    costBasis -= averageCost * soldQuantity;
    if (costBasis < 0) costBasis = 0;
  });

  return {
    quantity,
    costBasis,
  };
}

function buildHoldingsFromTransactions(transactions) {
  const grouped = new Map();

  const sorted = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.transactedAt).getTime() - new Date(b.transactedAt).getTime();
    return dateDiff !== 0 ? dateDiff : a.id - b.id;
  });

  sorted.forEach((tx) => {
    const key = tx.instrumentId;
    const existing = grouped.get(key) || {
      instrumentId: tx.instrumentId,
      symbol: tx.instrument.symbol,
      name: tx.instrument.name,
      assetType: tx.instrument.assetType,
      exchange: tx.instrument.exchange,
      currentPrice: hasUsablePrice(tx.instrument.latestQuote?.price)
        ? asNumber(tx.instrument.latestQuote?.price)
        : null,
      quantity: 0,
      investedAmount: 0,
      realizedProfitLoss: 0,
      transactions: 0,
      marketCap: serializeBigInt(tx.instrument.latestQuote?.marketCap) ?? null,
      volume: serializeBigInt(tx.instrument.latestQuote?.volume) ?? null,
    };

    const quantity = asNumber(tx.quantity);
    const price = asNumber(tx.price);
    const fees = asNumber(tx.fees);

    if (tx.transactionType === "BUY") {
      existing.quantity += quantity;
      existing.investedAmount += quantity * price + fees;
    } else if (existing.quantity > 0) {
      const sellQuantity = Math.min(existing.quantity, quantity);
      const avgCost = existing.quantity > 0 ? existing.investedAmount / existing.quantity : 0;
      const saleProceeds = sellQuantity * price - fees;
      existing.realizedProfitLoss += saleProceeds - avgCost * sellQuantity;
      existing.quantity -= sellQuantity;
      existing.investedAmount -= avgCost * sellQuantity;
      if (existing.investedAmount < 0) existing.investedAmount = 0;
    }

    existing.transactions += 1;
    if (hasUsablePrice(tx.instrument.latestQuote?.price)) {
      existing.currentPrice = asNumber(tx.instrument.latestQuote?.price);
    }

    grouped.set(key, existing);
  });

  return Array.from(grouped.values())
    .map((item) => {
      const currentValue =
        item.currentPrice != null ? item.quantity * item.currentPrice : null;
      const unrealizedProfitLoss =
        currentValue != null ? currentValue - item.investedAmount : null;
      const roiPercent =
        currentValue != null && item.investedAmount > 0
          ? (unrealizedProfitLoss / item.investedAmount) * 100
          : null;

      return {
        ...item,
        quantity: Number(item.quantity.toFixed(6)),
        currentPrice: item.currentPrice != null ? Number(item.currentPrice.toFixed(4)) : null,
        investedAmount: Number(item.investedAmount.toFixed(2)),
        currentValue: currentValue != null ? Number(currentValue.toFixed(2)) : null,
        unrealizedProfitLoss:
          unrealizedProfitLoss != null ? Number(unrealizedProfitLoss.toFixed(2)) : null,
        realizedProfitLoss: Number(item.realizedProfitLoss.toFixed(2)),
        roiPercent: roiPercent != null ? Number(roiPercent.toFixed(2)) : null,
        priceUnavailable: item.currentPrice == null,
      };
    })
    .filter((item) => item.quantity > 0 || item.realizedProfitLoss !== 0)
    .sort((a, b) => Number(b.currentValue ?? -1) - Number(a.currentValue ?? -1));
}

async function refreshQuotesForTransactions(transactions) {
  const symbols = [...new Set(
    transactions
      .map((tx) => tx.instrument?.symbol)
      .filter(Boolean)
  )];

  if (!symbols.length) {
    return transactions;
  }

  const refreshedResults = await Promise.allSettled(
    symbols.map((symbol) => {
      if (symbol.startsWith("AMFI:")) {
        return instrumentService.refreshIndianMutualFundQuote(symbol.replace("AMFI:", ""));
      }
      return instrumentService.refreshInstrumentQuote(symbol);
    })
  );

  const latestQuoteBySymbol = new Map();
  refreshedResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      latestQuoteBySymbol.set(symbols[index], result.value.quote || null);
    }
  });

  return transactions.map((tx) => {
    const refreshedQuote = latestQuoteBySymbol.get(tx.instrument?.symbol);
    if (refreshedQuote === undefined) {
      return tx;
    }

    return {
      ...tx,
      instrument: tx.instrument
        ? {
            ...tx.instrument,
            latestQuote: refreshedQuote,
          }
        : tx.instrument,
    };
  });
}

// Create investment with type, ROI, projections
const createInvestment = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { amount, instrument, type, roi, projections, details, investedAt, accountId, paymentMethod } =
    req.body;

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }
  if (!instrument) {
    throw new ApiError(400, "instrument is required");
  }

  const investDate = new Date(investedAt);
  if (Number.isNaN(investDate.getTime())) {
    throw new ApiError(400, "investedAt is required and must be valid");
  }

  const parsedRoi = roi === undefined || roi === null || roi === "" ? 0 : Number(roi);
  if (!Number.isFinite(parsedRoi)) {
    throw new ApiError(400, "roi must be a valid number");
  }
  const month = monthKeyIST(investDate);
  const week = getWeekOfMonth(investDate);

  const account =
    accountId != null ? await resolveBankAccount(userId, accountId) : await ensureAccount(userId);

  if (!account) {
    throw new ApiError(404, "Account not found");
  }
  const selectedPaymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethod);
  if (!selectedPaymentMethod) {
    throw new ApiError(400, "Selected payment method is not enabled for this account");
  }
  if (selectedPaymentMethod === "INVALID_METHOD") {
    throw new ApiError(400, "Selected payment method is invalid");
  }

  const investment = await prisma.investment.create({
    data: {
      userId,
      accountId: account.id,
      amount: parsedAmount,
      instrument,
      type,
      roi: parsedRoi,
      projections,
      details: details || null,
      investedAt: investDate,
      month,
      week,
      paymentMethod: selectedPaymentMethod,
    },
  });

  // reduce user balance (money invested leaves wallet)
  await applyBalanceChange(userId, -parsedAmount);

  res.json(investment);
});

const updateInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, accountId, paymentMethod, investedAt, ...rest } = req.body;

  const existing = await prisma.investment.findUnique({
    where: { id: parseInt(id) },
  });
  if (!existing) throw new ApiError(404, "Investment not found");
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  if (existing.userId !== userId) throw new ApiError(403, "Forbidden");

  let parsedAmount = undefined;
  if (amount !== undefined) {
    parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ApiError(400, "amount must be a positive number");
    }
  }
  const diff =
    parsedAmount !== undefined ? parsedAmount - Number(existing.amount) : 0;

  let parsedInvestedAt = undefined;
  if (investedAt !== undefined) {
    parsedInvestedAt = new Date(investedAt);
    if (Number.isNaN(parsedInvestedAt.getTime())) {
      throw new ApiError(400, "Invalid investedAt date");
    }
  }

  let nextAccountId = undefined;
  if (accountId !== undefined) {
    const account = await resolveBankAccount(userId, accountId);
    if (!account) throw new ApiError(404, "Account not found");
    nextAccountId = account.id;
  }

  const effectiveAccountId = nextAccountId ?? existing.accountId;
  let nextPaymentMethod;
  if (paymentMethod !== undefined || nextAccountId !== undefined) {
    const method = await resolvePaymentMethod(
      userId,
      effectiveAccountId,
      paymentMethod !== undefined ? paymentMethod : existing.paymentMethod
    );
    if (!method) {
      throw new ApiError(400, "Selected payment method is not enabled for this account");
    }
    if (method === "INVALID_METHOD") {
      throw new ApiError(400, "Selected payment method is invalid");
    }
    nextPaymentMethod = method;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.investment.update({
      where: { id: parseInt(id) },
      data: {
        ...rest,
        ...(parsedAmount !== undefined ? { amount: parsedAmount } : {}),
        ...(parsedInvestedAt
          ? {
              investedAt: parsedInvestedAt,
              month: monthKeyIST(parsedInvestedAt),
              week: getWeekOfMonth(parsedInvestedAt),
            }
          : {}),
        ...(nextAccountId !== undefined ? { accountId: nextAccountId } : {}),
        ...(nextPaymentMethod !== undefined
          ? { paymentMethod: nextPaymentMethod }
          : {}),
      },
    });

    if (diff !== 0) {
      await applyBalanceChange(existing.userId, -diff);
    }

    return inv;
  });

  res.json(updated);
});

const deleteInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.investment.findUnique({
    where: { id: parseInt(id) },
  });
  if (!existing) throw new ApiError(404, "Investment not found");
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  if (existing.userId !== userId) throw new ApiError(403, "Forbidden");

  await prisma.$transaction(async (tx) => {
    await tx.investment.delete({ where: { id: parseInt(id) } });

    // refund balance when deleting an investment
    await applyBalanceChange(existing.userId, existing.amount);
  });

  res.json({ message: "Investment deleted successfully" });
});

const getAllInvestments = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const month = typeof req.query.month === "string" ? req.query.month.trim() : "";
  const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
  const paymentMethod = typeof req.query.paymentMethod === "string"
    ? normalizeType(req.query.paymentMethod)
    : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const accountId = Number(req.query.accountId);
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const sortByRaw = String(req.query.sortBy || "investedAt");
  const allowedSort = new Set(["investedAt", "amount", "instrument", "month", "roi"]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "investedAt";

  const { page, pageSize, skip, take } = parsePagination(req.query, {
    defaultPageSize: 10,
    maxPageSize: 100,
  });

  const where = {
    userId,
    ...(month ? { month } : {}),
    ...(type ? { type: { contains: type, mode: "insensitive" } } : {}),
    ...(Number.isInteger(accountId) && accountId > 0 ? { accountId } : {}),
    ...(METHOD_TYPES.has(paymentMethod) ? { paymentMethod } : {}),
    ...(q
      ? {
          OR: [
            { instrument: { contains: q, mode: "insensitive" } },
            { details: { contains: q, mode: "insensitive" } },
            { account: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.investment.count({ where }),
    prisma.investment.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { account: true },
      skip,
      take,
    }),
  ]);
  const aggregate = await prisma.investment.aggregate({
    where,
    _sum: { amount: true },
    _avg: { amount: true },
    _count: { _all: true },
  });

  res.json(
    buildPaginatedResult({
      items,
      total,
      page,
      pageSize,
      summary: {
        totalAmount: Number(aggregate._sum.amount ?? 0),
        totalCount: Number(aggregate._count?._all ?? total ?? 0),
        averageAmount: Number(aggregate._avg.amount ?? 0),
      },
    })
  );
});

const getInvestmentsByMonth = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { month } = req.params;
  const investments = await prisma.investment.findMany({
    where: { userId, month },
    include: { account: true },
  });
  res.json(investments);
});

// ROI profit summary
const getProfitSummary = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { account: true },
  });

  let totalInvested = 0;
  let expectedProfit = 0;

  investments.forEach((inv) => {
    const amount = asNumber(inv.amount);
    totalInvested += amount;
    if (inv.roi) {
      expectedProfit += amount * (asNumber(inv.roi) / 100);
    }
  });

  res.json({ totalInvested, expectedProfit });
});

const createInvestmentTransaction = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const {
    symbol,
    accountId,
    paymentMethod,
    transactionType = "BUY",
    quantity,
    price,
    fees,
    transactedAt,
    notes,
  } = req.body;

  const { instrument, error } = await getInstrumentOrThrow(symbol);
  if (error) throw new ApiError(error.status, error.message);

  const normalizedTransactionType = String(transactionType || "BUY").trim().toUpperCase();
  if (!["BUY", "SELL"].includes(normalizedTransactionType)) {
    throw new ApiError(400, "transactionType must be BUY or SELL");
  }

  const parsedQuantity = Number(quantity);
  const parsedPrice = Number(price);
  const parsedFees = fees == null || fees === "" ? 0 : Number(fees);

  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
    throw new ApiError(400, "quantity must be a positive number");
  }
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw new ApiError(400, "price must be a positive number");
  }
  if (!Number.isFinite(parsedFees) || parsedFees < 0) {
    throw new ApiError(400, "fees must be zero or greater");
  }

  const tradeDate = new Date(transactedAt);
  if (Number.isNaN(tradeDate.getTime())) {
    throw new ApiError(400, "transactedAt is required and must be valid");
  }

  const account =
    accountId != null ? await resolveBankAccount(userId, accountId) : await ensureAccount(userId);
  if (!account) throw new ApiError(404, "Account not found");

  const selectedPaymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethod);
  if (!selectedPaymentMethod) {
    throw new ApiError(400, "Selected payment method is not enabled for this account");
  }
  if (selectedPaymentMethod === "INVALID_METHOD") {
    throw new ApiError(400, "Selected payment method is invalid");
  }

  if (normalizedTransactionType === "SELL") {
    const position = await getPositionState(userId, instrument.id);
    if (position.quantity < parsedQuantity) {
      throw new ApiError(400, `Cannot sell ${parsedQuantity}. Available quantity is ${position.quantity}.`);
    }
  }

  const month = monthKeyIST(tradeDate);
  const week = getWeekOfMonth(tradeDate);
  const cashDelta =
    normalizedTransactionType === "BUY"
      ? -(parsedQuantity * parsedPrice + parsedFees)
      : parsedQuantity * parsedPrice - parsedFees;

  const transaction = await prisma.investmentTransaction.create({
    data: {
      userId,
      instrumentId: instrument.id,
      accountId: account.id,
      paymentMethod: selectedPaymentMethod,
      transactionType: normalizedTransactionType,
      quantity: parsedQuantity,
      price: parsedPrice,
      fees: parsedFees,
      notes: notes || null,
      transactedAt: tradeDate,
      month,
      week,
    },
    include: {
      instrument: { include: { latestQuote: true } },
      account: true,
    },
  });

  await applyBalanceChange(userId, cashDelta);

  return res.status(201).json(serializeTransaction(transaction));
});

const getInvestmentTransactions = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  const accountId = req.query.accountId ? Number(req.query.accountId) : null;
  const transactionType = String(req.query.transactionType || "").trim().toUpperCase();

  const transactions = await prisma.investmentTransaction.findMany({
    where: {
      userId,
      ...(symbol ? { instrument: { symbol } } : {}),
      ...(Number.isInteger(accountId) ? { accountId } : {}),
      ...(transactionType && ["BUY", "SELL"].includes(transactionType)
        ? { transactionType }
        : {}),
    },
    include: {
      instrument: { include: { latestQuote: true } },
      account: true,
    },
    orderBy: [{ transactedAt: "desc" }, { id: "desc" }],
  });

  return res.json({ items: transactions.map(serializeTransaction) });
});

const updateInvestmentTransaction = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const id = Number(req.params.id);
  const existing = await prisma.investmentTransaction.findUnique({
    where: { id },
  });

  if (!existing) throw new ApiError(404, "Transaction not found");
  if (existing.userId !== userId) throw new ApiError(403, "Forbidden");

  const nextType = String(req.body.transactionType || existing.transactionType).trim().toUpperCase();
  const nextQuantity = req.body.quantity != null ? Number(req.body.quantity) : asNumber(existing.quantity);
  const nextPrice = req.body.price != null ? Number(req.body.price) : asNumber(existing.price);
  const nextFees = req.body.fees != null ? Number(req.body.fees) : asNumber(existing.fees);
  const nextDate = req.body.transactedAt ? new Date(req.body.transactedAt) : new Date(existing.transactedAt);
  const nextAccountId = req.body.accountId != null ? Number(req.body.accountId) : existing.accountId;
  const nextSymbol = req.body.symbol ? String(req.body.symbol).trim().toUpperCase() : null;

  if (!["BUY", "SELL"].includes(nextType)) {
    throw new ApiError(400, "transactionType must be BUY or SELL");
  }
  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    throw new ApiError(400, "quantity must be a positive number");
  }
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    throw new ApiError(400, "price must be a positive number");
  }
  if (!Number.isFinite(nextFees) || nextFees < 0) {
    throw new ApiError(400, "fees must be zero or greater");
  }
  if (Number.isNaN(nextDate.getTime())) {
    throw new ApiError(400, "transactedAt must be a valid date");
  }

  const instrumentLookup = nextSymbol
    ? await getInstrumentOrThrow(nextSymbol)
    : { instrument: await prisma.instrument.findUnique({ where: { id: existing.instrumentId } }) };
  if (instrumentLookup.error) {
    throw new ApiError(instrumentLookup.error.status, instrumentLookup.error.message);
  }
  const nextInstrument = instrumentLookup.instrument;

  const account =
    nextAccountId != null ? await resolveBankAccount(userId, nextAccountId) : await ensureAccount(userId);
  if (!account) throw new ApiError(404, "Account not found");

  const selectedPaymentMethod = await resolvePaymentMethod(
    userId,
    account.id,
    req.body.paymentMethod ?? existing.paymentMethod
  );
  if (!selectedPaymentMethod) {
    throw new ApiError(400, "Selected payment method is not enabled for this account");
  }
  if (selectedPaymentMethod === "INVALID_METHOD") {
    throw new ApiError(400, "Selected payment method is invalid");
  }

  if (nextType === "SELL") {
    const position = await getPositionState(userId, nextInstrument.id, id);
    if (position.quantity < nextQuantity) {
      throw new ApiError(400, `Cannot sell ${nextQuantity}. Available quantity is ${position.quantity}.`);
    }
  }

  const existingCashDelta =
    existing.transactionType === "BUY"
      ? -(asNumber(existing.quantity) * asNumber(existing.price) + asNumber(existing.fees))
      : asNumber(existing.quantity) * asNumber(existing.price) - asNumber(existing.fees);
  const nextCashDelta =
    nextType === "BUY"
      ? -(nextQuantity * nextPrice + nextFees)
      : nextQuantity * nextPrice - nextFees;
  const balanceAdjustment = nextCashDelta - existingCashDelta;

  const updated = await prisma.investmentTransaction.update({
    where: { id },
    data: {
      instrumentId: nextInstrument.id,
      accountId: account.id,
      paymentMethod: selectedPaymentMethod,
      transactionType: nextType,
      quantity: nextQuantity,
      price: nextPrice,
      fees: nextFees,
      notes: req.body.notes ?? existing.notes,
      transactedAt: nextDate,
      month: monthKeyIST(nextDate),
      week: getWeekOfMonth(nextDate),
    },
    include: {
      instrument: { include: { latestQuote: true } },
      account: true,
    },
  });

  if (balanceAdjustment !== 0) {
    await applyBalanceChange(userId, balanceAdjustment);
  }

  return res.json(serializeTransaction(updated));
});

const deleteInvestmentTransaction = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const id = Number(req.params.id);
  const existing = await prisma.investmentTransaction.findUnique({
    where: { id },
  });

  if (!existing) throw new ApiError(404, "Transaction not found");
  if (existing.userId !== userId) throw new ApiError(403, "Forbidden");

  await prisma.investmentTransaction.delete({ where: { id } });

  const cashDelta =
    existing.transactionType === "BUY"
      ? asNumber(existing.quantity) * asNumber(existing.price) + asNumber(existing.fees)
      : -(asNumber(existing.quantity) * asNumber(existing.price) - asNumber(existing.fees));
  await applyBalanceChange(userId, cashDelta);

  return res.json({ message: "Transaction deleted successfully" });
});

const getInvestmentHoldings = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const transactions = await prisma.investmentTransaction.findMany({
    where: { userId },
    include: {
      instrument: { include: { latestQuote: true } },
    },
    orderBy: [{ transactedAt: "asc" }, { id: "asc" }],
  });

  const refreshedTransactions = await refreshQuotesForTransactions(transactions);
  const items = buildHoldingsFromTransactions(refreshedTransactions);
  return res.json({ items });
});

const getPortfolioSummary = asyncHandler(async (req, res) => {
  const userId = req.user?.userId ?? req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const transactions = await prisma.investmentTransaction.findMany({
    where: { userId },
    include: {
      instrument: { include: { latestQuote: true } },
    },
    orderBy: [{ transactedAt: "asc" }, { id: "asc" }],
  });

  const refreshedTransactions = await refreshQuotesForTransactions(transactions);
  const holdings = buildHoldingsFromTransactions(refreshedTransactions);
  const totalInvested = holdings.reduce((sum, item) => sum + item.investedAmount, 0);
  const currentValue = holdings.reduce(
    (sum, item) => sum + Number(item.currentValue || 0),
    0
  );
  const unrealizedProfitLoss = holdings.reduce(
    (sum, item) => sum + Number(item.unrealizedProfitLoss || 0),
    0
  );
  const realizedProfitLoss = holdings.reduce(
    (sum, item) => sum + item.realizedProfitLoss,
    0
  );
  const pricedHoldings = holdings.filter((item) => item.currentValue != null);
  const roiPercent =
    pricedHoldings.length > 0 && totalInvested > 0
      ? (unrealizedProfitLoss / totalInvested) * 100
      : null;

  return res.json({
    totalInvested: Number(totalInvested.toFixed(2)),
    currentValue:
      pricedHoldings.length > 0 ? Number(currentValue.toFixed(2)) : null,
    unrealizedProfitLoss:
      pricedHoldings.length > 0 ? Number(unrealizedProfitLoss.toFixed(2)) : null,
    realizedProfitLoss: Number(realizedProfitLoss.toFixed(2)),
    roiPercent: roiPercent != null ? Number(roiPercent.toFixed(2)) : null,
    holdingsCount: holdings.length,
    pricedHoldingsCount: pricedHoldings.length,
    unpricedHoldingsCount: holdings.length - pricedHoldings.length,
    topHolding: holdings[0] || null,
  });
});

module.exports = {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getAllInvestments,
  getInvestmentsByMonth,
  getProfitSummary,
  createInvestmentTransaction,
  getInvestmentTransactions,
  updateInvestmentTransaction,
  deleteInvestmentTransaction,
  getInvestmentHoldings,
  getPortfolioSummary,
};
