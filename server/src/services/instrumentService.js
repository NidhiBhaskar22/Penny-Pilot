const prisma = require("../config/prismaClient");
const marketDataService = require("./marketDataService");
const amfiService = require("./amfiService");

const QUOTE_TTL_MS = 15 * 60 * 1000;
const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function mapAssetType(source = {}) {
  if (source.isEtf) return "ETF";
  if (source.isFund) return "MUTUAL_FUND";
  return "STOCK";
}

function isIndianSearchCandidate(item) {
  const exchange = String(item?.exchange || item?.exchangeShortName || "").toUpperCase();
  const symbol = normalizeSymbol(item?.symbol);
  return (
    exchange.includes("NSE") ||
    exchange.includes("BSE") ||
    symbol.endsWith(".NS") ||
    symbol.endsWith(".BO")
  );
}

function toNullableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeBigInt(value) {
  return typeof value === "bigint" ? Number(value) : value;
}

function shouldRefresh(dateValue, ttlMs) {
  if (!dateValue) return true;
  return Date.now() - new Date(dateValue).getTime() > ttlMs;
}

async function upsertQuote(instrumentId, quote = {}) {
  return prisma.instrumentQuote.upsert({
    where: { instrumentId },
    update: {
      price: Number(quote.price || 0),
      change: toNullableNumber(quote.change),
      changePercent:
        toNullableNumber(quote.changesPercentage ?? quote.changePercent),
      marketCap:
        quote.marketCap != null ? BigInt(Math.trunc(Number(quote.marketCap))) : null,
      volume: quote.volume != null ? BigInt(Math.trunc(Number(quote.volume))) : null,
      fetchedAt: new Date(),
    },
    create: {
      instrumentId,
      price: Number(quote.price || 0),
      change: toNullableNumber(quote.change),
      changePercent:
        toNullableNumber(quote.changesPercentage ?? quote.changePercent),
      marketCap:
        quote.marketCap != null ? BigInt(Math.trunc(Number(quote.marketCap))) : null,
      volume: quote.volume != null ? BigInt(Math.trunc(Number(quote.volume))) : null,
      fetchedAt: new Date(),
    },
  });
}

async function upsertInstrumentFromMarketData(symbol, options = {}) {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    const error = new Error("symbol is required");
    error.statusCode = 400;
    throw error;
  }

  const existing = await prisma.instrument.findUnique({
    where: { symbol: normalizedSymbol },
    include: { latestQuote: true },
  });

  let profile = null;
  let etfInfo = null;
  let paidPlanRestricted = false;
  const forceRefresh = Boolean(options.forceRefresh);
  const needsProfileRefresh =
    forceRefresh || !existing || shouldRefresh(existing.lastSyncedAt, PROFILE_TTL_MS);

  if (needsProfileRefresh) {
    try {
      profile = await marketDataService.getProfile(normalizedSymbol);
      if (!profile) {
        etfInfo = await marketDataService.getEtfInfo(normalizedSymbol);
      }
    } catch (error) {
      if (marketDataService.isPaidPlanError(error)) {
        paidPlanRestricted = true;
      } else {
        throw error;
      }
    }
  }

  if (!etfInfo && !profile && needsProfileRefresh && !paidPlanRestricted) {
    try {
      etfInfo = await marketDataService.getEtfInfo(normalizedSymbol);
    } catch (error) {
      if (marketDataService.isPaidPlanError(error)) {
        paidPlanRestricted = true;
      } else {
        throw error;
      }
    }
  }

  let searchMatch = null;
  if (!existing && !profile && !etfInfo) {
    const fallbackMatches = await marketDataService.searchInstruments(normalizedSymbol, 5);
    searchMatch =
      fallbackMatches.find(
        (item) => normalizeSymbol(item.symbol) === normalizedSymbol
      ) || fallbackMatches[0] || null;
  }

  if (!existing && !profile && !etfInfo && !searchMatch) {
    const error = new Error(
      `Instrument not found for symbol ${normalizedSymbol}`
    );
    error.statusCode = 404;
    throw error;
  }

  const instrumentPayload = {
    symbol: normalizedSymbol,
    name:
      profile?.companyName ||
      profile?.name ||
      etfInfo?.name ||
      searchMatch?.name ||
      searchMatch?.companyName ||
      existing?.name ||
      normalizedSymbol,
    assetType: mapAssetType(profile || etfInfo || existing || {}),
    exchange:
      profile?.exchangeShortName ||
      profile?.exchange ||
      etfInfo?.exchange ||
      searchMatch?.exchangeShortName ||
      searchMatch?.exchange ||
      existing?.exchange ||
      null,
    currency:
      profile?.currency ||
      etfInfo?.currency ||
      searchMatch?.currency ||
      existing?.currency ||
      null,
    sector: profile?.sector || etfInfo?.sector || existing?.sector || null,
    industry: profile?.industry || etfInfo?.industry || existing?.industry || null,
    country: profile?.country || etfInfo?.country || existing?.country || null,
    description:
      profile?.description || etfInfo?.description || existing?.description || null,
    imageUrl: profile?.image || etfInfo?.image || existing?.imageUrl || null,
    expenseRatio:
      toNullableNumber(etfInfo?.expenseRatio) ?? existing?.expenseRatio ?? null,
    aum: toNullableNumber(etfInfo?.aum) ?? existing?.aum ?? null,
    isEtf: Boolean(profile?.isEtf ?? etfInfo?.isEtf ?? existing?.isEtf ?? false),
    isFund: Boolean(profile?.isFund ?? etfInfo?.isFund ?? existing?.isFund ?? false),
    isActive: true,
    lastSyncedAt: needsProfileRefresh ? new Date() : existing?.lastSyncedAt ?? new Date(),
  };

  const instrument = existing
    ? await prisma.instrument.update({
        where: { id: existing.id },
        data: instrumentPayload,
        include: { latestQuote: true },
      })
    : await prisma.instrument.create({
        data: instrumentPayload,
        include: { latestQuote: true },
      });

  return { instrument, profile, etfInfo, paidPlanRestricted };
}

async function refreshQuoteIfNeeded(instrument) {
  return refreshQuoteIfNeededWithOptions(instrument);
}

async function refreshQuoteIfNeededWithOptions(instrument, options = {}) {
  if (!instrument?.id) return null;
  const forceRefresh = Boolean(options.forceRefresh);
  const fallbackPrice = toNullableNumber(options.fallbackPrice);

  if (!forceRefresh && !shouldRefresh(instrument.latestQuote?.fetchedAt, QUOTE_TTL_MS)) {
    return instrument.latestQuote;
  }

  let quote = null;
  try {
    quote = await marketDataService.getQuote(instrument.symbol);
  } catch (error) {
    if (!marketDataService.isPaidPlanError(error)) {
      throw error;
    }
    if (fallbackPrice != null && fallbackPrice > 0) {
      return upsertQuote(instrument.id, { price: fallbackPrice });
    }
    return instrument.latestQuote || null;
  }
  if (!quote) {
    if (fallbackPrice != null && fallbackPrice > 0) {
      return upsertQuote(instrument.id, { price: fallbackPrice });
    }
    return instrument.latestQuote || null;
  }

  return upsertQuote(instrument.id, quote);
}

async function getInstrumentDetails(symbol, options = {}) {
  const { instrument, profile, etfInfo, paidPlanRestricted } = await upsertInstrumentFromMarketData(
    symbol,
    options
  );
  const latestQuote = await refreshQuoteIfNeededWithOptions(instrument, {
    forceRefresh: options.forceRefresh,
    fallbackPrice: profile?.price,
  });

  return {
    instrument: {
      ...instrument,
      expenseRatio: instrument.expenseRatio != null ? Number(instrument.expenseRatio) : null,
      aum: instrument.aum != null ? Number(instrument.aum) : null,
    },
    profile: profile || null,
    etfInfo: etfInfo || null,
    restrictions: {
      paidPlanRestricted,
      quoteUnavailable: !latestQuote,
    },
    quote: latestQuote
      ? {
          ...latestQuote,
          price: Number(latestQuote.price),
          change: latestQuote.change != null ? Number(latestQuote.change) : null,
          changePercent:
            latestQuote.changePercent != null ? Number(latestQuote.changePercent) : null,
          marketCap: serializeBigInt(latestQuote.marketCap) ?? null,
          volume: serializeBigInt(latestQuote.volume) ?? null,
        }
      : null,
  };
}

async function searchInstruments(query, options = {}) {
  const market = String(options.market || "").trim().toLowerCase();
  const rows = await marketDataService.searchInstruments(query);
  const filteredRows =
    market === "india" ? rows.filter(isIndianSearchCandidate) : rows;

  return filteredRows.map((item) => ({
    symbol: normalizeSymbol(item.symbol),
    name: item.name || item.companyName || item.symbol,
    exchange: item.exchangeShortName || item.exchange || null,
    currency: item.currency || null,
    marketRegion: market === "india" ? "INDIA" : "GLOBAL",
    provider: "FMP",
  }));
}

async function getInstrumentChart(symbol) {
  return marketDataService.getHistoricalChart(normalizeSymbol(symbol));
}

async function getInstrumentAnalysis(symbol) {
  const normalizedSymbol = normalizeSymbol(symbol);
  const [details, keyMetricsResult, ratiosResult] = await Promise.allSettled([
    getInstrumentDetails(normalizedSymbol),
    marketDataService.getKeyMetrics(normalizedSymbol),
    marketDataService.getRatios(normalizedSymbol),
  ]);

  if (details.status !== "fulfilled") {
    throw details.reason;
  }

  return {
    ...details.value,
    keyMetrics:
      keyMetricsResult.status === "fulfilled" ? keyMetricsResult.value : null,
    ratios: ratiosResult.status === "fulfilled" ? ratiosResult.value : null,
  };
}

module.exports = {
  searchInstruments,
  getInstrumentDetails,
  getInstrumentChart,
  getInstrumentAnalysis,
  async searchIndianMutualFunds(query) {
    const rows = await amfiService.searchSchemes(query, 20);
    return rows.map((item) => ({
      symbol: `AMFI:${item.schemeCode}`,
      schemeCode: item.schemeCode,
      name: item.schemeName,
      exchange: "AMFI",
      currency: "INR",
      marketRegion: "INDIA",
      provider: "AMFI",
      amc: item.amc,
      category: item.category,
      nav: item.nav,
      navDate: item.navDate,
      assetType: "MUTUAL_FUND",
    }));
  },
  async getIndianMutualFundDetails(schemeCode, options = {}) {
    const scheme = await amfiService.getSchemeByCode(schemeCode, Boolean(options.forceRefresh));
    if (!scheme) {
      const error = new Error(`AMFI scheme not found for code ${schemeCode}`);
      error.statusCode = 404;
      throw error;
    }

    const symbol = `AMFI:${scheme.schemeCode}`;
    const existing = await prisma.instrument.findUnique({
      where: { symbol },
      include: { latestQuote: true },
    });

    const instrumentPayload = {
      symbol,
      name: scheme.schemeName,
      assetType: "MUTUAL_FUND",
      exchange: "AMFI",
      currency: "INR",
      sector: scheme.category,
      industry: scheme.amc,
      country: "IN",
      description: `${scheme.schemeName} managed by ${scheme.amc}. Latest NAV from AMFI dated ${scheme.navDate}.`,
      imageUrl: existing?.imageUrl || null,
      isEtf: false,
      isFund: true,
      isActive: true,
      lastSyncedAt: new Date(),
    };

    const instrument = existing
      ? await prisma.instrument.update({
          where: { id: existing.id },
          data: instrumentPayload,
          include: { latestQuote: true },
        })
      : await prisma.instrument.create({
          data: instrumentPayload,
          include: { latestQuote: true },
        });

    const latestQuote = await upsertQuote(instrument.id, {
      price: scheme.nav,
      change: null,
      changePercent: null,
      marketCap: null,
      volume: null,
    });

    return {
      instrument: {
        ...instrument,
        expenseRatio: instrument.expenseRatio != null ? Number(instrument.expenseRatio) : null,
        aum: instrument.aum != null ? Number(instrument.aum) : null,
      },
      profile: {
        symbol,
        companyName: scheme.schemeName,
        currency: "INR",
        exchange: "AMFI",
        industry: scheme.amc,
        sector: scheme.category,
        country: "IN",
        description: `${scheme.schemeName} managed by ${scheme.amc}. Latest NAV from AMFI dated ${scheme.navDate}.`,
        isFund: true,
        price: scheme.nav,
      },
      etfInfo: null,
      restrictions: {
        paidPlanRestricted: false,
        quoteUnavailable: false,
      },
      quote: {
        ...latestQuote,
        price: Number(latestQuote.price),
        change: null,
        changePercent: null,
        marketCap: null,
        volume: null,
      },
      mfMeta: {
        schemeCode: scheme.schemeCode,
        amc: scheme.amc,
        navDate: scheme.navDate,
        category: scheme.category,
      },
    };
  },
  async refreshInstrumentQuote(symbol) {
    return getInstrumentDetails(symbol, { forceRefresh: true });
  },
  async refreshIndianMutualFundQuote(schemeCode) {
    return this.getIndianMutualFundDetails(schemeCode, { forceRefresh: true });
  },
};
