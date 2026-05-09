import "../src/utils/defaultDatabaseRuntime";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const rows = await p.user.findMany({
  orderBy: { id: "asc" },
  select: { id: true, email: true, username: true, isAdmin: true, createdAt: true },
});
console.log("Users count:", rows.length);
for (const u of rows) {
  console.log(
    `  id=${u.id}  username=${u.username}  email=${u.email}  isAdmin=${u.isAdmin}  createdAt=${u.createdAt.toISOString()}`,
  );
}
await p.$disconnect();
