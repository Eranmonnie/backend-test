import { Queue } from 'bullmq';
import redis from '../config/redis';

export const DONATION_QUEUE_NAME = 'donation-queue';

export const donationQueue = new Queue(DONATION_QUEUE_NAME, {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
