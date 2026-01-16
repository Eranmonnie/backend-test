import prisma from '../utils/prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { AddBeneficiaryDataDto } from '../utils/validation';

export class BeneficiaryService {
    /**
     * Add a new beneficiary for a user
     * Validates that beneficiary exists, user is not adding themselves, 
     * relationship doesn't already exist, and nickname is unique
     * @param userId - User ID adding the beneficiary
     * @param dto - Beneficiary data (beneficiaryId and optional nickname)
     * @returns Created beneficiary relationship with user details
     * @throws ConflictError if adding self, already exists, or nickname is duplicate
     * @throws NotFoundError if beneficiary user doesn't exist
     */
    async addBeneficiary(userId: string, dto: AddBeneficiaryDataDto) {
        // Prevent adding yourself as beneficiary
        if (userId === dto.beneficiaryId) {
            throw new ConflictError('Cannot add yourself as a beneficiary');
        }

        const beneficiaryUser = await prisma.user.findUnique({
            where: { id: dto.beneficiaryId },
            select: { id: true, email: true }
        });

        if (!beneficiaryUser) {
            throw new NotFoundError('Beneficiary user not found');
        }

        const existing = await prisma.beneficiary.findUnique({
            where: {
                userId_beneficiaryId: {
                    userId,
                    beneficiaryId: dto.beneficiaryId
                }
            }
        });

        if (existing) {
            throw new ConflictError('Beneficiary already saved');
        }

        // Check if nickname is already used by this user (if nickname is provided)
        if (dto.nickname) {
            const nicknameExists = await prisma.beneficiary.findUnique({
                where: {
                    userId_nickname: {
                        userId,
                        nickname: dto.nickname
                    }
                }
            });

            if (nicknameExists) {
                throw new ConflictError(`Nickname "${dto.nickname}" is already used for another beneficiary`);
            }
        }

        const beneficiary = await prisma.beneficiary.create({
            data: {
                userId,
                beneficiaryId: dto.beneficiaryId,
                nickname: dto.nickname
            },
            include: {
                beneficiary: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            }
        });

        logger.info(`Beneficiary added: ${dto.beneficiaryId} by user ${userId}`);

        return {
            id: beneficiary.id,
            beneficiaryId: beneficiary.beneficiaryId,
            email: beneficiary.beneficiary.email,
            nickname: beneficiary.nickname,
            createdAt: beneficiary.createdAt
        };
    }

    /**
     * Get all beneficiaries for a user with pagination and optional search
     * Supports case-insensitive search across nickname, email, firstName, and lastName
     * @param userId - User ID to get beneficiaries for
     * @param page - Page number for pagination (default: 1)
     * @param limit - Number of items per page (default: 10)
     * @param search - Optional search query to filter beneficiaries
     * @returns Paginated list of beneficiaries with metadata
     */
    async getBeneficiaries(userId: string, page: number = 1, limit: number = 10, search?: string) {
        const skip = (page - 1) * limit;

        // Build where clause with search
        const where: any = { userId };
        
        if (search) {
            where.OR = [
                { nickname: { contains: search } },
                { 
                    beneficiary: {
                        OR: [
                            { email: { contains: search } },
                            { firstName: { contains: search } },
                            { lastName: { contains: search } },
                        ]
                    }
                }
            ];
        }

        const beneficiaries = await prisma.beneficiary.findMany({
            where,
            skip,
            take: limit,
            include: {
                beneficiary: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.beneficiary.count({ where });

        return {
            data: beneficiaries.map((b) => ({
                id: b.id,
                beneficiaryId: b.beneficiaryId,
                email: b.beneficiary.email,
                firstName: b.beneficiary.firstName,
                lastName: b.beneficiary.lastName,
                nickname: b.nickname,
                createdAt: b.createdAt
            })),
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Remove a beneficiary relationship
     * @param userId - User ID removing the beneficiary
     * @param beneficiaryId - Beneficiary user ID to remove
     * @returns Success message
     * @throws NotFoundError if beneficiary relationship doesn't exist
     */
    async removeBeneficiary(userId: string, beneficiaryId: string) {
        const beneficiary = await prisma.beneficiary.findUnique({
            where: {
                userId_beneficiaryId: {
                    userId,
                    beneficiaryId
                }
            }
        });

        if (!beneficiary) {
            throw new NotFoundError('Beneficiary not found');
        }

        await prisma.beneficiary.delete({
            where: { id: beneficiary.id }
        });

        logger.info(`Beneficiary removed: ${beneficiaryId} by user ${userId}`);

        return { message: 'Beneficiary removed successfully' };
    }

    /**
     * Update beneficiary nickname
     * Validates that new nickname is unique for the user (if provided)
     * @param userId - User ID who owns the beneficiary relationship
     * @param beneficiaryId - Beneficiary user ID to update
     * @param nickname - New nickname to set
     * @returns Updated beneficiary with user details
     * @throws NotFoundError if beneficiary relationship doesn't exist
     * @throws ConflictError if nickname is already used for another beneficiary
     */
    async updateNickname(userId: string, beneficiaryId: string, nickname: string) {
        const beneficiary = await prisma.beneficiary.findUnique({
            where: {
                userId_beneficiaryId: {
                    userId,
                    beneficiaryId
                }
            }
        });

        if (!beneficiary) {
            throw new NotFoundError('Beneficiary not found');
        }

        // Check if the new nickname is already used by this user for another beneficiary
        if (nickname) {
            const nicknameExists = await prisma.beneficiary.findUnique({
                where: {
                    userId_nickname: {
                        userId,
                        nickname
                    }
                }
            });

            if (nicknameExists && nicknameExists.id !== beneficiary.id) {
                throw new ConflictError(`Nickname "${nickname}" is already used for another beneficiary`);
            }
        }

        const updated = await prisma.beneficiary.update({
            where: { id: beneficiary.id },
            data: { nickname },
            include: {
                beneficiary: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            }
        });

        return {
            id: updated.id,
            beneficiaryId: updated.beneficiaryId,
            email: updated.beneficiary.email,
            nickname: updated.nickname
        };
    }
}
