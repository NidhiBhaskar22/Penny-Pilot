// src/services/authService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET is not set in environment variables");
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

// REGISTER
async function registerUser({ name, email, password }) {
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name || email.split("@")[0],
      email,
      password: hashedPassword,
      // balance uses DB default (0)
    },
  });

  const token = signToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    },
  };
}

// LOGIN
async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    },
  };
}

// COMPLETE PROFILE (name + balance)
async function completeProfile(userId, { name, balance }) {
  if (!name || Number.isNaN(Number(balance))) {
    throw new ApiError(400, "name and valid balance are required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      balance: Number(balance),
    },
  });

  const token = signToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
  completeProfile,
};
