import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import { NOTIFICATION_QUEUE_NAME } from '../queues/notification.queue';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

interface NotificationJobData {
    donorEmail: string;
    beneficiaryName: string;
    donorName: string;
    donationCount: number;
    donorId: string;
    beneficiaryId: string;
}

export const notificationWorker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
        const { donorEmail, beneficiaryName, donorName, donationCount, donorId, beneficiaryId } = job.data;

        logger.info(`Processing notification job ${job.id} for donor ${donorId}`);

        try {
            await emailService.sendThankYouEmail(
                donorEmail,
                beneficiaryName,
                donorName,
                donationCount
            );

            logger.info('Thank you notification sent', {
                donorId,
                beneficiaryId,
                donationCount,
                milestone: true,
                jobId: job.id
            });
        } catch (error) {
            logger.error('Failed to send thank you email', {
                donorId,
                beneficiaryId,
                donationCount,
                error,
                jobId: job.id
            });
            throw error;
        }
    },
    {
        connection: redis as any,
        concurrency: 5,
    }
);

notificationWorker.on('completed', (job) => {
    logger.debug(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification job ${job?.id} failed with ${err.message}`);
});
