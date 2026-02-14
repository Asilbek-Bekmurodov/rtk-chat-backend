import express from "express";
import Chat from "../models/Chat.js";

import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Private chat yaratish
router.post("/", verifyToken, async (req, res) => {
  const { userId } = req.body;

  const chat = await Chat.create({
    participants: [req.user.id, userId],
  });

  res.json(chat);
});

// Mening chatlarim
router.get("/", verifyToken, async (req, res) => {
  const chats = await Chat.find({
    participants: req.user.id,
  }).populate("participants", "username");

  res.json(chats);
});

export default router;
