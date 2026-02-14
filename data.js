import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

export const users = [
  {
    id: uuid(),
    username: "admin",
    password: bcrypt.hashSync("123456", 10),
    role: "admin",
  },
];
