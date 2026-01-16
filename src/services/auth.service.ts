import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env';
import logger from '../utils/logger';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { User } from '@prisma/client';
import { LoginDataDto, RegisterDataDto } from '../utils/validation';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m'; // Shortlived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Longlived refresh token

export class AuthService {
    /**
     * Generate JWT access token and refresh token for a user
     * @param user - User object from database
     * @returns Object containing accessToken (JWT) and refreshToken (random string)
     * @private
     */
    private generateTokens(user: User) {
        const jwtData = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        };

        const accessToken = jwt.sign(jwtData, env.JWT_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
        });

        const refreshToken = crypto.randomBytes(64).toString('hex');

        return { accessToken, refreshToken };
    }

    /**
     * Store refresh token in database with expiration date
     * @param userId - User ID to associate token with
     * @param refreshToken - Refresh token string to store
     * @private
     */
    private async storeRefreshToken(userId: string, refreshToken: string) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt,
            },
        });
    }

    /**
     * Register a new user with email, password, and PIN
     * Creates user account and wallet atomically
     * @param dto - Registration data (email, password, firstName, lastName, pin)
     * @returns User object (without password/pin), accessToken, and refreshToken
     * @throws ConflictError if user already exists
     */
    async register(dto: RegisterDataDto) {
        const existingUser = await prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictError('User already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const hashedPin = await bcrypt.hash(dto.pin, SALT_ROUNDS);

        // Atomic transaction: Create User and Wallet
        const user = await prisma.user.create({
            data: {
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                password: hashedPassword,
                pin: hashedPin,
                wallet: {
                    create: {
                        balance: 0.0,
                    },
                },
            },
            include: {
                wallet: true,
            },
        });

        // Generate tokens
        const { accessToken, refreshToken } = this.generateTokens(user);
        await this.storeRefreshToken(user.id, refreshToken);

        const { password, pin, ...userWithoutSecrets } = user;
        return {
            user: userWithoutSecrets,
            accessToken,
            refreshToken
        };
    }

    /**
     * Authenticate user with email and password
     * @param data - Login credentials (email and password)
     * @returns User object (without password/pin), accessToken, and refreshToken
     * @throws UnauthorizedError if credentials are invalid
     */
    async login(data: LoginDataDto) {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Generate tokens
        const { accessToken, refreshToken } = this.generateTokens(user);
        await this.storeRefreshToken(user.id, refreshToken);

        const { password, pin, ...userWithoutSecrets } = user;
        return {
            user: userWithoutSecrets,
            accessToken,
            refreshToken
        };
    }

    /**
     * Refresh access token using a valid refresh token
     * @param refreshToken - Refresh token from previous login
     * @returns New access token
     * @throws UnauthorizedError if refresh token is invalid, expired, or revoked
     */
    async refreshAccessToken(refreshToken: string) {
        // Find refresh token in database
        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!tokenRecord) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Check if token is expired
        if (new Date() > tokenRecord.expiresAt) {
            // Delete expired token
            await prisma.refreshToken.delete({
                where: { id: tokenRecord.id },
            });
            throw new UnauthorizedError('Refresh token expired');
        }

        // Check if token is revoked
        if (tokenRecord.revoked) {
            throw new UnauthorizedError('Refresh token has been revoked');
        }
        const jwtData = {
            userId: tokenRecord.user.id,
            email: tokenRecord.user.email,
            firstName: tokenRecord.user.firstName,
            lastName: tokenRecord.user.lastName,
        };

        // Generate new access token
        const accessToken = jwt.sign(jwtData, env.JWT_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
        });


        return { accessToken };
    }

    /**
     * Revoke a single refresh token and blacklist the access token (logout)
     * Adds the access token to blacklist to prevent further use
     * @param refreshToken - Refresh token to revoke
     * @param accessToken - Access token to blacklist
     * @returns Success message
     * @throws UnauthorizedError if refresh token is invalid
     */
    async revokeRefreshToken(refreshToken: string, accessToken: string) {
        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!tokenRecord) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Revoke refresh token
        await prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { revoked: true },
        });

        // Add access token to blacklist
        const decoded = jwt.decode(accessToken) as any;
        if (decoded && decoded.exp) {
            const expiresAt = new Date(decoded.exp * 1000);


            await prisma.tokenBlacklist.create({
                data: {
                    token: accessToken,
                    userId: tokenRecord.userId,
                    expiresAt
                }
            });

            logger.info('User logged out successfully', { userId: tokenRecord.userId });
        }

        return { message: 'Logged out successfully' };
    }

    /**
     * Revoke all refresh tokens for a user and blacklist current access token (logout from all devices)
     * Useful for security purposes when user wants to logout from all sessions
     * @param userId - User ID whose tokens should be revoked
     * @param accessToken - Current access token to blacklist
     * @returns Success message
     */
    async revokeAllRefreshTokens(userId: string, accessToken: string) {
        // Revoke all refresh tokens
        await prisma.refreshToken.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true },
        });

        // Add current access token to blacklist
        const decoded = jwt.decode(accessToken) as any;
        if (decoded && decoded.exp) {
            const expiresAt = new Date(decoded.exp * 1000);

            await prisma.tokenBlacklist.create({
                data: {
                    token: accessToken,
                    userId,
                    expiresAt
                }
            });

            logger.info('User logged out from all devices', { userId });
        }

        return { message: 'Logged out from all devices' };
    }

    /**
     * Clean up expired tokens from blacklist table
     * Should be run periodically (e.g., hourly via cron job)
     * Removes tokens that have already expired to keep database clean
     */
    async cleanupExpiredTokens(): Promise<void> {
        const deleted = await prisma.tokenBlacklist.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        logger.info('Cleaned up expired blacklisted tokens', { count: deleted.count });
    }

}
