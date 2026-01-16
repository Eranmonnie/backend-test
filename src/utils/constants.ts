//auth  
export const SALT_ROUNDS = 10;
export const JWT_EXPIRY = '1d';
export const TOKEN_PREFIX = 'Bearer';

//pagination 
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

// rate limiting (global)
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;

// endpoint-specific rate limits
export const AUTH_RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login/register attempts per 15 min per IP
};

export const DONATION_RATE_LIMIT = {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // 20 donations per 10 min per IP
};

export const PAYMENT_RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 payment initializations per 15 min per IP
};

export const BENEFICIARY_RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 beneficiary operations per 15 min per IP
};

export const REFRESH_TOKEN_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 token refreshes per 15 min per IP
};

// pin
export const PIN_LENGTH = 4;
export const PIN_REGEX = /^\d+$/;

// donations
export const MIN_DONATION_AMOUNT = 100; // ₦100 minimum (prevent spam donations)
export const MAX_DONATION_AMOUNT = 1000000; // ₦1,000,000 maximum (anti-money laundering)
export const NOTIFICATION_MILESTONES = [2, 5, 10, 25, 50, 100]; // Send thank you at these counts
