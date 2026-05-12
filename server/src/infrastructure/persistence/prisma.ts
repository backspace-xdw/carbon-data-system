import { PrismaClient } from '@prisma/client';
import { logger } from '../logging/logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

prisma.$on('error', (e) => logger.error({ event: e }, 'prisma error'));
prisma.$on('warn', (e) => logger.warn({ event: e }, 'prisma warn'));
