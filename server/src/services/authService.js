// src/services/authService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET is not set in environment variables");
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new ApiError(401, "Invalid Google token payload");
  }

  if (!payload.email_verified) {
    throw new ApiError(401, "Google email is not verified");
  }

  return payload;
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

// LOGIN WITH GOOGLE (ID token)
async function loginWithGoogle({ idToken }) {
  if (!idToken) {
    throw new ApiError(400, "idToken is required");
  }

  const tokenInfo = await verifyGoogleIdToken(idToken);
  const email = tokenInfo.email;

  if (!email) {
    throw new ApiError(400, "Google account email is missing");
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await prisma.user.create({
      data: {
        name: tokenInfo.name || email.split("@")[0],
        email,
        password: hashedPassword,
      },
    });
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
  loginWithGoogle,
  completeProfile,
};
