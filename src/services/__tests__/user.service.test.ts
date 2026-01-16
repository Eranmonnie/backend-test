import { UserService } from '../user.service';
import prisma from '../../utils/prisma';
import { NotFoundError } from '../../utils/errors';

// Mock Prisma
jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
        },
        wallet: {
            findUnique: jest.fn(),
        },
        donation: {
            aggregate: jest.fn(),
            count: jest.fn(),
        },
    },
}));

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        userService = new UserService();
        jest.clearAllMocks();
    });

    describe('getUsers', () => {
        it('should return paginated users', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    email: 'user1@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    wallet: {
                        id: 'wallet-1',
                        balance: 5000,
                    },
                    _count: {
                        sentDonations: 5,
                        receivedDonations: 3,
                    },
                },
                {
                    id: 'user-2',
                    email: 'user2@example.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    wallet: {
                        id: 'wallet-2',
                        balance: 3000,
                    },
                    _count: {
                        sentDonations: 2,
                        receivedDonations: 7,
                    },
                },
            ];

            (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
            (prisma.user.count as jest.Mock).mockResolvedValue(2);

            const result = await userService.getUsers(1, 10);

            expect(result.data).toEqual(mockUsers);
            expect(result.meta).toEqual({
                total: 2,
                page: 1,
                limit: 10,
                pages: 1,
            });
            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: {},
                skip: 0,
                take: 10,
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
            });
        });

        it('should handle pagination correctly', async () => {
            const mockUsers = [
                {
                    id: 'user-3',
                    email: 'user3@example.com',
                    firstName: 'Bob',
                    lastName: 'Johnson',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    wallet: null,
                    _count: {
                        sentDonations: 0,
                        receivedDonations: 0,
                    },
                },
            ];

            (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
            (prisma.user.count as jest.Mock).mockResolvedValue(25);

            const result = await userService.getUsers(3, 10);

            expect(result.meta).toEqual({
                total: 25,
                page: 3,
                limit: 10,
                pages: 3,
            });
            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: {},
                skip: 20, // (3 - 1) * 10
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: expect.any(Object),
            });
        });

        it('should filter users by search query', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    email: 'john@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    wallet: null,
                    _count: {
                        sentDonations: 0,
                        receivedDonations: 0,
                    },
                },
            ];

            (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
            (prisma.user.count as jest.Mock).mockResolvedValue(1);

            const result = await userService.getUsers(1, 10, 'john');

            expect(result.data).toEqual(mockUsers);
            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { email: { contains: 'john', mode: 'insensitive' } },
                        { firstName: { contains: 'john', mode: 'insensitive' } },
                        { lastName: { contains: 'john', mode: 'insensitive' } },
                    ],
                },
                skip: 0,
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: expect.any(Object),
            });
        });

        it('should return empty array when no users found', async () => {
            (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.user.count as jest.Mock).mockResolvedValue(0);

            const result = await userService.getUsers(1, 10);

            expect(result.data).toEqual([]);
            expect(result.meta).toEqual({
                total: 0,
                page: 1,
                limit: 10,
                pages: 0,
            });
        });
    });

    describe('getUserById', () => {
        it('should return user details by ID', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                createdAt: new Date(),
                updatedAt: new Date(),
                wallet: {
                    id: 'wallet-123',
                    balance: 10000,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                _count: {
                    sentDonations: 10,
                    receivedDonations: 5,
                },
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await userService.getUserById('user-123');

            expect(result).toEqual(mockUser);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-123' },
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
        });

        it('should throw NotFoundError if user not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(userService.getUserById('invalid-id')).rejects.toThrow('User not found');
        });
    });

    describe('getUserWallet', () => {
        it('should return wallet information for user', async () => {
            const mockWallet = {
                id: 'wallet-123',
                balance: 5000,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            };

            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

            const result = await userService.getUserWallet('user-123');

            expect(result).toEqual(mockWallet);
            expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                select: {
                    id: true,
                    balance: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });

        it('should throw NotFoundError if wallet not found', async () => {
            (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(userService.getUserWallet('invalid-id')).rejects.toThrow(
                'Wallet not found'
            );
        });
    });
});
