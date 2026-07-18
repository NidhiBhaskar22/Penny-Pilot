const getUserId = (req) => {
  const raw = req.user?.userId ?? req.user?.id;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

module.exports = { getUserId };
