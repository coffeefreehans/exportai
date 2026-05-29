import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client instance.
 * Use this throughout the application to avoid creating multiple instances.
 */
const prisma = new PrismaClient();

export default prisma;
