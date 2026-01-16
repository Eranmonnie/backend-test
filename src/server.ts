import app from './app';
import env from './config/env';
import logger from './utils/logger';
import prisma from './utils/prisma';
import { AuthService } from './services/auth.service';

const PORT = parseInt(env.PORT, 10);
const authService = new AuthService();

const startServer = async () => {
    try {
        //start database connection
        await prisma.$connect();
        app.listen(PORT, () => {
            logger.info(`server running docs on: http://localhost:${PORT}/api-docs`);
            logger.info(`Environment: ${env.NODE_ENV}`);
        });

        // Cleanup expired blacklisted tokens every hour
        setInterval(async () => {
            try {
                await authService.cleanupExpiredTokens();
            } catch (error) {
                logger.error('Failed to cleanup expired tokens:', error);
            }
        }, 60 * 60 * 1000); // Every 1 hour

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

startServer();
