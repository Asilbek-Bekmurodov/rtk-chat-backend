import express from "express";
import Chat from "../models/Chat.js";

import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Private chat yaratish
router.post("/", verifyToken, async (req, res) => {
  const { userId, title } = req.body;

  const chat = await Chat.create({
    title,
    participants: [req.user.id, userId],
  });

  res.json(chat);
});

// Mening chatlarim
router.get("/", verifyToken, async (req, res) => {
  const query =
    req.user?.role === "admin" || req.user?.role === "superAdmin"
      ? {}
      : { participants: req.user.id };
  const chats = await Chat.find(query).populate("participants", "username");

  res.json(chats);
});

// Admin: barcha chatlarni boshqarish
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  const chat = await Chat.findByIdAndDelete(req.params.id);
  if (!chat) {
    return res.status(404).json({ message: "Chat topilmadi" });
  }
  res.json({ message: "Chat o‘chirildi" });
});

export default router;
