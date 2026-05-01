import { PrismaClient } from "@prisma/client";

if (process.env.DELETE_ALL_USERS !== "1") {
  console.error("Refusing: set DELETE_ALL_USERS=1 to confirm you want to remove every user (and cascade libraries/books/entries per DB constraints).");
  process.exit(1);
}

const p = new PrismaClient();
const n = await p.user.count();
const deleted = await p.user.deleteMany();
console.log(`Deleted ${deleted.count} user(s) (previously ${n} row(s) in User).`);
await p.$disconnect();
