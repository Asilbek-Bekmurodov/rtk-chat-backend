import jwt from "jsonwebtoken";
import Message from "../models/Message.js";

const initSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.warn("Socket auth error: missing token", {
        origin: socket.handshake.headers?.origin,
        ip: socket.handshake.address,
      });
      return next(new Error("Auth error"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.warn("Socket auth error: invalid token", {
        message: err?.message,
        origin: socket.handshake.headers?.origin,
        ip: socket.handshake.address,
      });
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user.id);

    // Room join
    socket.on("joinRoom", (chatId) => {
      socket.join(chatId);
    });

    // Message send
    socket.on("sendMessage", async ({ chatId, text }) => {
      const message = await Message.create({
        chatId,
        sender: socket.user.id,
        text,
      });

      io.to(chatId).emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

export default initSocket;
