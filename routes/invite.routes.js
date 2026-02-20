import express from "express";
import Chat from "../models/Chat.js";
import Invite from "../models/Invite.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

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

  res.json(invite);
});

export default router;
