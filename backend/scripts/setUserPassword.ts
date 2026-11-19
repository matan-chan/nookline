import "../src/utils/defaultDatabaseRuntime";
import { hashPassword } from "../src/auth/authPassword";
import { PrismaClient } from "@prisma/client";

const username = (process.env.SET_PASSWORD_USER ?? "matan").trim().toLowerCase();
const plain = process.env.SET_PASSWORD_PLAIN ?? "";
if (!plain) {
  console.error("Set SET_PASSWORD_PLAIN");
  process.exit(1);
}

const prisma = new PrismaClient();
const row = await prisma.user.findFirst({ where: { username } });
if (row == null) {
  console.error(`No user: ${username}`);
  process.exit(1);
}
await prisma.user.update({
  where: { id: row.id },
  data: { password: await hashPassword(plain) },
});
console.log(`Password updated for user "${username}".`);
await prisma.$disconnect();