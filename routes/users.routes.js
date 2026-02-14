import express from "express";
import { users } from "../data.js";
import { verifyToken } from "../middleware/auth.js";
import { v4 as uuid } from "uuid";

const router = express.Router();

router.get("/", verifyToken, (req, res) => {
  let { page = 1, limit = 5, search = "" } = req.query;
  page = Number(page);
  limit = Number(limit);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit)
    .map(({ password, ...u }) => u);

  res.json({
    data,
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
});

router.post("/", verifyToken, (req, res) => {
  const user = {
    id: uuid(),
    username: req.body.username,
    role: "user",
    password: "hidden",
  };
  users.push(user);
  res.json(user);
});

router.put("/:id", verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Topilmadi" });

  user.username = req.body.username ?? user.username;
  user.role = req.body.role ?? user.role;
  res.json(user);
});

router.delete("/:id", verifyToken, (req, res) => {
  const i = users.findIndex(u => u.id === req.params.id);
  if (i === -1) return res.status(404).json({ message: "Topilmadi" });
  users.splice(i, 1);
  res.json({ message: "O‘chirildi" });
});

export default router;
