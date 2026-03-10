const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "Access token missing" });
  const token = authHeader.split(" ")[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userId = Number(user?.userId ?? user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      return res.status(401).json({ message: "Invalid session. Please login again." });
    }

    req.user = { ...user, userId }; // normalized user id
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
