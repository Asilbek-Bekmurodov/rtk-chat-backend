import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

const router = express.Router();

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  "SECRET_KEY";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  "SECRET_KEY";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

const hashToken = token =>
  crypto.createHash("sha256").update(token).digest("hex");

const createAccessToken = user =>
  jwt.sign({ id: user._id, role: user.role }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const createRefreshToken = async userId => {
  const refreshToken = jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
  const decoded = jwt.decode(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt,
  });

  return refreshToken;
};

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "Username yoki password yo‘q" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User mavjud" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "Username yoki password yo‘q" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User topilmadi" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Parol xato" });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = await createRefreshToken(user._id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken =
      req.body?.refreshToken || req.headers["x-refresh-token"];

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token yo‘q" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Refresh token noto‘g‘ri" });
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revokedAt) {
      return res.status(401).json({ message: "Refresh token bekor qilingan" });
    }

    if (stored.expiresAt && stored.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: "Refresh token muddati tugagan" });
    }

    if (String(stored.user) !== String(decoded.id)) {
      return res.status(401).json({ message: "Refresh token mos emas" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User topilmadi" });
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = await createRefreshToken(user._id);

    const newRefreshHash = hashToken(newRefreshToken);
    await RefreshToken.updateOne(
      { _id: stored._id },
      { revokedAt: new Date(), replacedByHash: newRefreshHash },
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const refreshToken =
      req.body?.refreshToken || req.headers["x-refresh-token"];

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token yo‘q" });
    }

    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne(
      { tokenHash },
      { revokedAt: new Date() },
    );

    res.json({ message: "Logout qilindi" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
});

export default router;
