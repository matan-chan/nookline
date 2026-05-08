import "../../utils/defaultDatabaseRuntime";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
