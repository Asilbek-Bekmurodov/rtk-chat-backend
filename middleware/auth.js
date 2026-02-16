import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token yo‘q" });
  }

  const token = authHeader.split(" ")[1];
  const secret =
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    "SECRET_KEY";

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token noto‘g‘ri" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "superAdmin") {
    return res.status(403).json({ message: "Admin ruxsat kerak" });
  }
  next();
};

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

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
    res.status(500).json({ message: "Server xatosi" });
  }
});

export default router;
