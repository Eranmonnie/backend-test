import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { DONATION_QUEUE_NAME } from '../queues/donation.queue';
import { NOTIFICATION_MILESTONES } from '../utils/constants';
import { notificationQueue } from '../queues/notification.queue';
import { DonationDataDto } from '../utils/validation';

interface DonationJobData {
    donorId: string;
    dto: DonationDataDto;
}

const shouldSendThankYou = (donationCount: number): boolean => {
    return NOTIFICATION_MILESTONES.includes(donationCount);
};

export const donationWorker = new Worker<DonationJobData>(
    DONATION_QUEUE_NAME,
    async (job: Job<DonationJobData>) => {
        const { donorId, dto } = job.data;
        logger.info(`Processing donation job ${job.id} for donor ${donorId}`);

        try {
            // Validate Donor and PIN
            const donor = await prisma.user.findUnique({
                where: { id: donorId },
                include: { wallet: true },
            });

            if (!donor || !donor.wallet) {
                throw new Error('Donor not found');
            }

            // Check Balance
            if (Number(donor.wallet.balance) < dto.amount) {
                throw new Error('Insufficient funds');
            }

            // Validate Beneficiary
            const beneficiary = await prisma.user.findUnique({
                where: { id: dto.beneficiaryId },
                include: { wallet: true },
            });

            if (!beneficiary || !beneficiary.wallet) {
                throw new Error('Beneficiary not found');
            }

            // Prevent self donation
            if (donorId === dto.beneficiaryId) {
                throw new Error('Cannot donate to yourself');
            }

            const result = await prisma.$transaction(async (tx: any) => {
                // Debit Donor
                await tx.wallet.update({
                    where: { id: donor.wallet!.id },
                    data: { balance: { decrement: dto.amount } },
                });

                // Credit Beneficiary
                await tx.wallet.update({
                    where: { id: beneficiary.wallet!.id },
                    data: { balance: { increment: dto.amount } },
                });

                // Create Donation
                const donation = await tx.donation.create({
                    data: {
                        donorId,
                        beneficiaryId: dto.beneficiaryId,
                        amount: dto.amount,
                    },
                });

                // Create Transactions
                await tx.transaction.create({
                    data: {
                        walletId: donor.wallet!.id,
                        type: 'DEBIT',
                        amount: dto.amount,
                        reference: `DON-${donation.id}-DEBIT`,
                        status: 'SUCCESS',
                        donationId: donation.id,
                    },
                });

                await tx.transaction.create({
                    data: {
                        walletId: beneficiary.wallet!.id,
                        type: 'CREDIT',
                        amount: dto.amount,
                        reference: `DON-${donation.id}-CREDIT`,
                        status: 'SUCCESS',
                        donationId: donation.id,
                    },
                });

                return donation;
            });

            const donationCount = await prisma.donation.count({
                where: {
                    donorId,
                    beneficiaryId: dto.beneficiaryId
                },
            });

            // Only send notification at milestones  2, 5, 10, 25, 50, 100
            if (shouldSendThankYou(donationCount)) {
                try {
                    await notificationQueue.add('send-thank-you', {
                        donorEmail: donor.email,
                        beneficiaryName: beneficiary.firstName || 'Beneficiary',
                        donorName: donor.firstName || 'Donor',
                        donationCount,
                        donorId,
                        beneficiaryId: dto.beneficiaryId,
                    });

                    logger.info('Thank you notification queued', {
                        donorId,
                        beneficiaryId: dto.beneficiaryId,
                        donationCount,
                        milestone: true,
                    });
                } catch (error) {
                    // Log errors but dont fail 
                    logger.error('Failed to queue thank you email', {
                        donorId,
                        beneficiaryId: dto.beneficiaryId,
                        donationCount,
                        error,
                    });
                }
            }

            // Invalidate caches
            const donationKeys = await redis.keys(`donations:${donorId}:*`);
            const donationKeys2 = await redis.keys(`donations:${dto.beneficiaryId}:*`);
            const countKeys = await redis.keys(`donation_count:*`);
            const walletKey = `wallet:${donorId}`;
            const walletKey2 = `wallet:${dto.beneficiaryId}`;
            const userKey = `user:${donorId}`;
            const userKey2 = `user:${dto.beneficiaryId}`;
            const usersKeys = await redis.keys('users:*');

            if (donationKeys.length > 0) await redis.del(...donationKeys);
            if (donationKeys2.length > 0) await redis.del(...donationKeys2);
            if (countKeys.length > 0) await redis.del(...countKeys);
            if (usersKeys.length > 0) await redis.del(...usersKeys);
            await redis.del(walletKey, walletKey2, userKey, userKey2);

            logger.debug(`Caches invalidated for donation ${result.id}`);

            logger.info(`Donation job ${job.id} completed successfully`);
            return result;

        } catch (error: any) {
            logger.error(`Donation job ${job.id} failed: ${error.message}`);
            throw error;
        }
    },
    {
        connection: redis as any,
        concurrency: 5,
    }
);

donationWorker.on('completed', (job) => {
    logger.debug(`Donation job ${job.id} completed`);
});

donationWorker.on('failed', (job, err) => {
    logger.error(`Donation job ${job?.id} failed with ${err.message}`);
});
