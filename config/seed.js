import bcrypt from "bcryptjs";
import User from "../models/User.js";

const ensureUser = async ({ username, password, role }) => {
  const existing = await User.findOne({ username });
  if (existing) {
    if (existing.role !== role) {
      existing.role = role;
      await existing.save();
      return { status: "updated", user: existing };
    }
    return { status: "exists", user: existing };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    password: hashedPassword,
    role,
  });

  return { status: "created", user };
};

export const seedAdmins = async () => {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const superUsername = process.env.SUPERADMIN_USERNAME || "superadmin";
  const superPassword = process.env.SUPERADMIN_PASSWORD || "superadmin123";

  const adminRes = await ensureUser({
    username: adminUsername,
    password: adminPassword,
    role: "admin",
  });

  const superRes = await ensureUser({
    username: superUsername,
    password: superPassword,
    role: "superAdmin",
  });

  const format = res => `${res.user.username} (${res.user.role}) - ${res.status}`;
  console.log(`Seed users: ${format(adminRes)}, ${format(superRes)}`);
};
