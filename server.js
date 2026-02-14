import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();
connectDB();

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: "*",
  }),
);

/* ================= ROUTES ================= */

app.get("/", (_, res) => {
  res.status(200).json({
    status: "success",
    message: "Backend ishlayapti 🚀",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/chats", chatRoutes);

/* ================= ERROR HANDLERS ================= */

app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: "Route topilmadi ❌",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Server xatosi",
  });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
