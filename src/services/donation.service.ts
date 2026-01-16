import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { DonationDataDto } from '../utils/validation';
import { NOTIFICATION_MILESTONES } from '../utils/constants';
import { notificationQueue } from '../queues/notification.queue';
import { donationQueue } from '../queues/donation.queue';
import redis from '../config/redis';

/**
 * Check if we should send a thank you notification
 * Only sends at milestone donation counts (2nd, 5th, 10th, etc.)
 * @param donationCount - Total number of donations from donor to beneficiary
 * @returns True if notification should be sent
 */
const shouldSendThankYou = (donationCount: number): boolean => {
    return NOTIFICATION_MILESTONES.includes(donationCount);
};

export class DonationService {
    /**
     * Make a donation from donor to beneficiary
     * Validates balances, creates donation record, and updates wallets atomically
     * Sends thank you email at milestone donation counts
     * @param donorId - User ID of the donor
     * @param dto - Donation data (beneficiaryId, amount)
     * @returns Created donation record
     * @throws NotFoundError if donor or beneficiary not found
     * @throws ValidationError if insufficient funds, invalid amount, or self-donation
     */
    async makeDonation(donorId: string, dto: DonationDataDto) {

        if (dto.amount < 50) {
            throw new ValidationError('Donation amount must be greater than fifty naira');
        }


        if (dto.amount > 50000) {
            throw new ValidationError('Donation amount cannot not exceed ₦50,000');
        }

        // Basic validation before queuing
        const donor = await prisma.user.findUnique({
            where: { id: donorId },
            include: { wallet: true },
        });

        if (!donor || !donor.wallet) {
            throw new NotFoundError('Donor not found');
        }

        // Check Balance
        if (Number(donor.wallet.balance) < dto.amount) {
            throw new ValidationError('Insufficient funds');
        }

        // Prevent self donation
        if (donorId === dto.beneficiaryId) {
            throw new ValidationError('Cannot donate to yourself');
        }

        // Add to queue
        const job = await donationQueue.add('process-donation', {
            donorId,
            dto
        });

        return {
            message: 'Donation processing started',
            jobId: job.id,
            status: 'queued'
        };
    }

    /**
     * Get paginated donation history with optional date filtering
     * Can retrieve donations as donor or beneficiary
     * @param userId - User ID to get donations for
     * @param donor - If true, get donations where user is donor; if false, where user is beneficiary
     * @param page - Page number for pagination (default: 1)
     * @param limit - Number of items per page (default: 10)
     * @param startDate - Optional start date filter
     * @param endDate - Optional end date filter
     * @returns Paginated donation list with metadata
     */
    async getDonations(userId: string, donor: boolean = false, page: number = 1, limit: number = 10, startDate?: Date, endDate?: Date) {
        const cacheKey = `donations:${userId}:${donor}:${page}:${limit}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const skip = (page - 1) * limit;
        var where: any = {}

        // always gets where you were user is beneficiary by default
        where = donor ? {
            donorId: userId,
        } : {
            beneficiaryId: userId,
        }

        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }

        const donations = await prisma.donation.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: donor
                ? { donor: { select: { email: true } } }
                :

                { beneficiary: { select: { email: true } } },
        });

        const total = await prisma.donation.count({ where });

        const result = {
            data: donations,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };

        await redis.setex(cacheKey, 300, JSON.stringify(result)); // Cache for 5 minutes

        return result;
    }

    /**
     * Get a single donation by ID with full details
     * Only donor or beneficiary can view the donation
     * Filters transactions based on user role (donor sees DEBIT, beneficiary sees CREDIT)
     * @param id - Donation ID
     * @param userId - User ID requesting the donation
     * @returns Donation with filtered transactions and user role
     * @throws NotFoundError if donation doesn't exist
     * @throws ValidationError if user is neither donor nor beneficiary
     */
    async getDonation(id: string, userId: string) {
        const cacheKey = `donation:${id}:${userId}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const donation = await prisma.donation.findUnique({
            where: { id },
            include: {
                donor: { select: { email: true, id: true, firstName: true, lastName: true } },
                beneficiary: { select: { email: true, id: true, firstName: true, lastName: true } },
                transactions: true,
            },
        });

        if (!donation) {
            throw new NotFoundError('Donation not found');
        }

        // Check if user is donor or beneficiary
        const isDonor = donation.donorId === userId;
        const isBeneficiary = donation.beneficiaryId === userId;

        if (!isDonor && !isBeneficiary) {
            throw new ValidationError('Access denied. Only the donor or beneficiary can view this donation. Admin features are not yet available.');
        }

        // Filter transactions based on user role
        const filteredTransactions = donation.transactions.filter(tx => {
            if (isDonor) {
                return tx.type === 'DEBIT';
            } else {
                return tx.type === 'CREDIT';
            }
        });

        const result = {
            ...donation,
            transactions: filteredTransactions,
            userRole: isDonor ? 'donor' : 'beneficiary'
        };

        await redis.setex(cacheKey, 300, JSON.stringify(result));

        return result;
    }

    /**
     * Get total donation count for a user
     * @param userId - User ID to count donations for
     * @param donor - If true, count donations where user is donor; if false, where user is beneficiary
     * @returns Total donation count
     */
    async getDonationCount(userId: string, donor: boolean = false): Promise<number> {
        return prisma.donation.count({
            where: donor ? { donorId: userId } : { beneficiaryId: userId },
        });
    }
}
