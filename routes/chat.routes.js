import express from "express";
import Chat from "../models/Chat.js";
import Invite from "../models/Invite.js";
import User from "../models/User.js";

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

// Chatga invite yuborish
router.post("/:id/invite", verifyToken, async (req, res) => {
  const { username, userId } = req.body;

  if (!username && !userId) {
    return res.status(400).json({ message: "username yoki userId kerak" });
  }

  const chat = await Chat.findById(req.params.id);
  if (!chat) {
    return res.status(404).json({ message: "Chat topilmadi" });
  }

  const isAdmin =
    req.user?.role === "admin" || req.user?.role === "superAdmin";
  const isParticipant = chat.participants.some(
    p => p && p.toString() === req.user.id,
  );
  if (!isAdmin && !isParticipant) {
    return res
      .status(403)
      .json({ message: "Faqat participant invite yuboradi" });
  }

  const user = username
    ? await User.findOne({ username })
    : await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User topilmadi" });
  }

  const alreadyInChat = chat.participants.some(
    p => p && p.toString() === user._id.toString(),
  );
  if (alreadyInChat) {
    return res.status(400).json({ message: "User allaqachon chatda" });
  }

  const existingInvite = await Invite.findOne({
    chatId: chat._id,
    to: user._id,
    status: "pending",
  });
  if (existingInvite) {
    return res.json(existingInvite);
  }

  const invite = await Invite.create({
    chatId: chat._id,
    from: req.user.id,
    to: user._id,
  });

  res.status(201).json(invite);
});

// Invite qabul qilish (join)
router.post("/:id/join", verifyToken, async (req, res) => {
  const invite = await Invite.findOne({
    chatId: req.params.id,
    to: req.user.id,
    status: "pending",
  });

  if (!invite) {
    return res.status(404).json({ message: "Invite topilmadi" });
  }

  await Chat.findByIdAndUpdate(invite.chatId, {
    $addToSet: { participants: req.user.id },
  });

  invite.status = "accepted";
  await invite.save();

  const chat = await Chat.findById(invite.chatId).populate(
    "participants",
    "username",
  );
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
