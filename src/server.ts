import app from './app';
import env from './config/env';
import logger from './utils/logger';
import prisma from './utils/prisma';
import { AuthService } from './services/auth.service';
import { notificationWorker } from './workers/notification.worker';
import { donationWorker } from './workers/donation.worker';
import cluster from 'cluster';
import os from 'os';

const PORT = parseInt(env.PORT, 10);
const authService = new AuthService();
const numCPUs = os.cpus().length;
const USE_CLUSTER = env.NODE_ENV === 'production'; // cluster in production

const startServer = async () => {
    try {
        
        await prisma.$connect();
        
        try {
            const dbMetrics = await prisma.$queryRaw`
                SELECT 
                    (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
                    current_setting('max_connections')::int as max_connections;
            ` as any[];
            
            logger.info(`Database: ${dbMetrics[0].active_connections}/${dbMetrics[0].max_connections} connections active`);
        } catch (error) {
            logger.warn('Could not fetch database metrics');
        }
        
        app.listen(PORT, () => {
            logger.info(`Server running on: http://localhost:${PORT}/api-docs`);
            logger.info(`Environment: ${env.NODE_ENV}`);
            logger.info(`Worker started: ${notificationWorker.name}`);
            logger.info(`Worker started: ${donationWorker.name}`);
            
            if (USE_CLUSTER) {
                logger.info(`Cluster mode: ${numCPUs} workers`);
            } else {
                logger.info(`Single process mode (development)`);
            }
        });

        // Cleanup expired blacklisted tokens every hour
        setInterval(async () => {
            try {
                await authService.cleanupExpiredTokens();
                logger.debug('Cleaned up expired tokens');
            } catch (error) {
                logger.error('Failed to cleanup expired tokens:', error);
            }
        }, 60 * 60 * 1000); // 1 hour

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

if (USE_CLUSTER && cluster.isPrimary) {
    logger.info(`Primary ${process.pid} is running`);
    logger.info(`Forking ${numCPUs} workers...`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Single process mode (development)
    startServer();
    if (USE_CLUSTER) {
        logger.info(`Worker ${process.pid} started`);
    }
}

const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    
    try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
        
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
