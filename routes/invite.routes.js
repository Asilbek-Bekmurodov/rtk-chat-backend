import express from "express";
import Chat from "../models/Chat.js";
import Invite from "../models/Invite.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

const populateChat = async chatId =>
  Chat.findById(chatId).populate("participants", "username");

// Menga kelgan invitelar
router.get("/", verifyToken, async (req, res) => {
  const query =
    req.user?.role === "admin" || req.user?.role === "superAdmin"
      ? {}
      : { to: req.user.id };

  const invites = await Invite.find(query)
    .sort({ createdAt: -1 })
    .populate("chatId")
    .populate("from", "username")
    .populate("to", "username");

  res.json(invites);
});

// Invite orqali join (link bosilganda)
router.post("/:id/join", verifyToken, async (req, res) => {
  const invite = await Invite.findById(req.params.id);
  if (!invite) {
    return res.status(404).json({ message: "Invite topilmadi" });
  }

  const isAdmin =
    req.user?.role === "admin" || req.user?.role === "superAdmin";
  if (!isAdmin && invite.to.toString() !== req.user.id) {
    return res.status(403).json({ message: "Ruxsat yo‘q" });
  }

  const chat = await Chat.findById(invite.chatId);
  if (!chat) {
    return res.status(404).json({ message: "Chat topilmadi" });
  }

  const isParticipant = chat.participants.some(
    p => p && p.toString() === invite.to.toString(),
  );

  if (invite.status !== "pending") {
    if (isParticipant) {
      const populatedChat = await populateChat(chat._id);
      return res.json({
        message: "Allaqachon chatda",
        chat: populatedChat,
        invite,
      });
    }
    return res.status(400).json({ message: "Invite allaqachon yopilgan" });
  }

  if (!isParticipant) {
    await Chat.findByIdAndUpdate(invite.chatId, {
      $addToSet: { participants: invite.to },
    });
  }

  invite.status = "accepted";
  await invite.save();

  const populatedChat = await populateChat(invite.chatId);
  res.json({ chat: populatedChat, invite });
});

// Invite qabul qilish
router.post("/:id/accept", verifyToken, async (req, res) => {
  const invite = await Invite.findById(req.params.id);
  if (!invite) {
    return res.status(404).json({ message: "Invite topilmadi" });
  }

  const isAdmin =
    req.user?.role === "admin" || req.user?.role === "superAdmin";
  if (!isAdmin && invite.to.toString() !== req.user.id) {
    return res.status(403).json({ message: "Ruxsat yo‘q" });
  }

  if (invite.status !== "pending") {
    return res.status(400).json({ message: "Invite allaqachon yopilgan" });
  }

  await Chat.findByIdAndUpdate(invite.chatId, {
    $addToSet: { participants: invite.to },
  });

  invite.status = "accepted";
  await invite.save();

  const populatedChat = await populateChat(invite.chatId);
  res.json({ invite, chat: populatedChat });
});

export default router;
