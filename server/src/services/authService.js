// src/services/authService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || `${JWT_SECRET}_refresh`;
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "30d";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set in environment variables");
}
if (!process.env.REFRESH_TOKEN_SECRET) {
  console.warn("REFRESH_TOKEN_SECRET is not set; using derived fallback");
}

function signAccessToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addDuration(base, duration) {
  const match = /^([0-9]+)([smhd])$/.exec(duration);
  if (!match) {
    return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const value = Number(match[1]);
  const unit = match[2];
  const msByUnit = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(base.getTime() + value * msByUnit[unit]);
}

function safeEqualHex(a, b) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function buildSessionMeta(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : req.ip || null;

  const userAgent = req.headers["user-agent"] || null;
  return { ipAddress, userAgent };
}

function buildAuthResponse(user, accessToken, refreshToken) {
  return {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    },
  };
}

async function createSessionTokens(user, req) {
  const now = new Date();
  const expiresAt = addDuration(now, REFRESH_EXPIRES_IN);
  const meta = buildSessionMeta(req);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: "",
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      lastUsedAt: now,
    },
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });
  const refreshTokenHash = hashToken(refreshToken);

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash },
  });

  return buildAuthResponse(user, accessToken, refreshToken);
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
async function registerUser({ name, email, password }, req) {
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
    },
  });

  return createSessionTokens(user, req);
}

// LOGIN
async function loginUser({ email, password }, req) {
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

  return createSessionTokens(user, req);
}

// LOGIN WITH GOOGLE (ID token)
async function loginWithGoogle({ idToken }, req) {
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

  return createSessionTokens(user, req);
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

  return {
    token: signAccessToken(user.id),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    },
  };
}

async function refreshSession({ refreshToken }, req) {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const userId = Number(payload?.userId);
  const sessionId = payload?.sessionId;

  if (!Number.isInteger(userId) || userId <= 0 || !sessionId) {
    throw new ApiError(401, "Invalid refresh token payload");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: { id: true, name: true, email: true, balance: true },
      },
    },
  });

  if (!session || session.userId !== userId || !session.user || session.revokedAt) {
    throw new ApiError(401, "Refresh session is invalid");
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, "Refresh session expired. Please login again.");
  }

  const incomingTokenHash = hashToken(refreshToken);
  const isMatch = session.refreshTokenHash && safeEqualHex(session.refreshTokenHash, incomingTokenHash);

  if (!isMatch) {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, "Refresh token reuse detected. Please login again.");
  }

  const nextRefreshToken = signRefreshToken({ userId, sessionId });
  const nextRefreshHash = hashToken(nextRefreshToken);
  const now = new Date();

  const meta = buildSessionMeta(req);
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: nextRefreshHash,
      lastUsedAt: now,
      expiresAt: addDuration(now, REFRESH_EXPIRES_IN),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return buildAuthResponse(session.user, signAccessToken(userId), nextRefreshToken);
}

async function logoutSession({ refreshToken }, userId) {
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (_) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenUserId = Number(payload?.userId);
  const sessionId = payload?.sessionId;
  if (!Number.isInteger(tokenUserId) || tokenUserId <= 0 || !sessionId) {
    throw new ApiError(401, "Invalid refresh token payload");
  }
  if (tokenUserId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}

async function logoutAllSessions(userId) {
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}

module.exports = {
  registerUser,
  loginUser,
  loginWithGoogle,
  completeProfile,
  refreshSession,
  logoutSession,
  logoutAllSessions,
};
