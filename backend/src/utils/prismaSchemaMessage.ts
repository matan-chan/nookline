import { Prisma } from "@prisma/client";

export const prismaSchemaMessage = (e: unknown): string | null => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022")
    return "Database is missing columns (e.g. TTS fields on User). From the backend folder run: bunx prisma db push";
  if (e instanceof Prisma.PrismaClientInitializationError)
    return "Database connection failed. Check DATABASE_URL in backend/.env";
  const msg = e instanceof Error ? e.message : "";
  if (/no such column|does not exist/i.test(msg))
    return "Database schema is out of date. From the backend folder run: bunx prisma db push";
  return null;
};
