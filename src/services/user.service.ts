import prisma from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import redis from '../config/redis';

export class UserService {
    /**
     * Get all users with pagination and optional search
     * Supports case-insensitive search across email, firstName, and lastName
     * @param page - Page number for pagination (default: 1)
     * @param limit - Number of items per page (default: 10)
     * @param search - Optional search query to filter users
     * @returns Paginated user list with wallet and donation counts
     */
    async getUsers(page: number = 1, limit: number = 10, search?: string) {
        const cacheKey = `users:${page}:${limit}:${search || 'all'}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const skip = (page - 1) * limit;

        // Build where clause for search
        const where = search ? {
            OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
            ],
        } : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    updatedAt: true,
                    wallet: {
                        select: {
                            id: true,
                            balance: true,
                        },
                    },
                    _count: {
                        select: {
                            sentDonations: true,
                            receivedDonations: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        const result = {
            data: users,
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
     * Get a specific user by ID with wallet and donation statistics
     * @param userId - User ID to retrieve
     * @returns User object with wallet info and donation counts
     * @throws NotFoundError if user doesn't exist
     */
    async getUserById(userId: string) {
        const cacheKey = `user:${userId}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                updatedAt: true,
                wallet: {
                    select: {
                        id: true,
                        balance: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                _count: {
                    select: {
                        sentDonations: true,
                        receivedDonations: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        await redis.setex(cacheKey, 300, JSON.stringify(user));

        return user;
    }

    /**
     * Get wallet information for a specific user
     * @param userId - User ID to retrieve wallet for
     * @returns Wallet object with balance and timestamps
     * @throws NotFoundError if wallet doesn't exist
     */
    async getUserWallet(userId: string) {
        const cacheKey = `wallet:${userId}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            select: {
                id: true,
                balance: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!wallet) {
            throw new NotFoundError('Wallet not found');
        }

        await redis.setex(cacheKey, 60, JSON.stringify(wallet)); // Cache for 1 minute

        return wallet;
    }
}
