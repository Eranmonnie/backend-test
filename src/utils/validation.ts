import z from "zod";
import prisma from "./prisma";
import { UnauthorizedError, ValidationError } from "./errors";
import bcrypt from 'bcrypt';
import { MIN_DONATION_AMOUNT, MAX_DONATION_AMOUNT } from "./constants";

export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const pinSchema = z.object({
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});

export const donationSchema = z.object({
    beneficiaryId: z.string().uuid('Invalid beneficiary ID format'),
    amount: z.number()
        .min(MIN_DONATION_AMOUNT, `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}`)
        .max(MAX_DONATION_AMOUNT, `Maximum donation amount is ₦${MAX_DONATION_AMOUNT.toLocaleString()}`),
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});

export const addBeneficiarySchema = z.object({
    beneficiaryId: z.string().uuid('Invalid beneficiary ID'),
    nickname: z.string().min(1).max(50).optional()
});
export const updateNicknameSchema = z.object({
    nickname: z.string().min(1, 'Nickname is required').max(50, 'Nickname must be at most 50 characters')
});

// Query parameter schemas
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const getDonationsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    donor: z.enum(['true', 'false']).default('false'),
});

export const getDonationCountQuerySchema = z.object({
    donor: z.enum(['true', 'false']).default('false'),
});

export const fundWalletSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
});


export const validatePin = async (userId: string, pin: string): Promise<boolean | ValidationError> => {
    const donor = await prisma.user.findUnique({ where: { id: userId } });
    if (!donor || !donor.pin) {
        throw new ValidationError('User has no PIN set');
    }

    return await bcrypt.compare(pin, donor.pin);
}


export type RegisterDataDto = z.infer<typeof registerSchema>;
export type LoginDataDto = z.infer<typeof loginSchema>;
export type PinDataDto = z.infer<typeof pinSchema>;
export type DonationDataDto = z.infer<typeof donationSchema>;
export type AddBeneficiaryDataDto = z.infer<typeof addBeneficiarySchema>;
export type UpdateNicknameDataDto = z.infer<typeof updateNicknameSchema>;
export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
export type GetDonationsQueryDto = z.infer<typeof getDonationsQuerySchema>;
export type GetDonationCountQueryDto = z.infer<typeof getDonationCountQuerySchema>;