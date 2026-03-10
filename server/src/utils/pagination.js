function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePagination(query = {}, options = {}) {
  const defaultPage = options.defaultPage || 1;
  const defaultPageSize = options.defaultPageSize || 10;
  const maxPageSize = options.maxPageSize || 100;

  const page = Math.max(1, parseNumber(query.page, defaultPage));
  const requestedPageSize = Math.max(1, parseNumber(query.pageSize, defaultPageSize));
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

function buildPaginatedResult({ items, total, page, pageSize }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

module.exports = {
  parsePagination,
  buildPaginatedResult,
};
