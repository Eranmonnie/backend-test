import Redis from 'ioredis';
import env from './env';
import logger from '../utils/logger';

const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('error', (error) => {
    logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
    logger.info('Connected to Redis');
});

export default redis;
