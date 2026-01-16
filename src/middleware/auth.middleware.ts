import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { AppError, UnauthorizedError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import prisma from '../utils/prisma';

interface JwtPayload {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
}

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        throw new UnauthorizedError('Invalid token format');
    }

    // Check if token is blacklisted
    const blacklisted = await prisma.tokenBlacklist.findUnique({
        where: { token }
    });

    if (blacklisted) {
        throw new UnauthorizedError('Token has been revoked');
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = { 
            userId: decoded.userId,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName
        };
        next();
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired token');
    }
});


export const errors = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Handle custom AppError instances
    if (err instanceof AppError) {
        logger.error(`${err.statusCode} - ${err.message}`, {
            path: req.path,
            method: req.method,
            statusCode: err.statusCode,
        });
        
        res.status(err.statusCode).json({
            error: err.message,
            ...(env.NODE_ENV === 'development' && { stack: err.stack }),
        });
        return;
    }

    // Handle unexpected errors
    logger.error('Unexpected error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    res.status(500).json({
        error: 'Internal server error',
        ...(env.NODE_ENV === 'development' && { message: err.message, stack: err.stack }),
    });
}