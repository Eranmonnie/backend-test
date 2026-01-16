import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import env from '../config/env';

// Disable rate limiting for load tests (set DISABLE_RATE_LIMIT=true in .env)
const RATE_LIMIT_DISABLED = env.DISABLE_RATE_LIMIT;

// Log rate limiting status on startup
if (RATE_LIMIT_DISABLED) {
    logger.warn('⚠️  Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true). Only use this for load testing!');
} else {
    logger.info('✅ Rate limiting is ENABLED for security');
}

/**
 * Strict rate limit for authentication endpoints (login, register)
 * Prevents brute force attacks
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: RATE_LIMIT_DISABLED ? 100000 : 5, // Effectively unlimited during load tests
    message: {
        error: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            error: 'Too many authentication attempts. Please try again in 15 minutes.',
        });
    },
});

/**
 * Moderate rate limit for donation endpoints
 * Prevents spam donations
 */
export const donationRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: RATE_LIMIT_DISABLED ? 100000 : 20, // 20 donations per 10 minutes per IP
    message: {
        error: 'Too many donation attempts. Please wait 10 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Donation rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.user?.userId || 'anonymous',
        });
        res.status(429).json({
            error: 'Too many donation attempts. Please wait 10 minutes.',
        });
    },
});

/**
 * Stricter rate limit for payment initialization
 * Extra protection for wallet funding
 */
export const paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: RATE_LIMIT_DISABLED ? 100000 : 10, // 10 payment initializations per 15 minutes
    message: {
        error: 'Too many payment attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Payment rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.user?.userId || 'anonymous',
        });
        res.status(429).json({
            error: 'Too many payment attempts. Please try again in 15 minutes.',
        });
    },
});

/**
 * Rate limit for beneficiary operations
 */
export const beneficiaryRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: RATE_LIMIT_DISABLED ? 100000 : 50, // 50 operations per 15 minutes (generous for read operations)
    message: {
        error: 'Too many beneficiary operations. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Beneficiary rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.user?.userId || 'anonymous',
        });
        res.status(429).json({
            error: 'Too many beneficiary operations. Please try again later.',
        });
    },
});

/**
 * Rate limit for refresh token endpoint
 * Prevent token refresh abuse
 */
export const refreshTokenLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: RATE_LIMIT_DISABLED ? 100000 : 10, // 10 refresh attempts per 15 minutes
    message: {
        error: 'Too many token refresh attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Refresh token rate limit exceeded', {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            error: 'Too many token refresh attempts. Please try again later.',
        });
    },
});
