import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Configure Prisma with optimized connection pooling
const prisma = new PrismaClient({
    log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' }
    ],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Log slow queries and errors
prisma.$on('warn', (e) => {
    logger.warn('Prisma warning:', e);
});

prisma.$on('error', (e) => {
    logger.error('Prisma error:', e);
});

// Warm up connection pool on startup
prisma.$connect()
    .then(() => {
        logger.info('✅ Database connection pool ready');
    })
    .catch((error) => {
        logger.error('❌ Failed to connect to database:', error);
        process.exit(1);
    });

export default prisma;
