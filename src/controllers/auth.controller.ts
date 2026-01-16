import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, pinSchema, registerSchema } from '../utils/validation';

const authService = new AuthService();

export class AuthController {
    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Register a new user
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - firstName
     *               - lastName
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *               firstName:
     *                 type: string
     *                 example: John
     *               lastName:
     *                 type: string
     *                 example: Doe
     *               password:
     *                 type: string
     *                 minLength: 6
     *                 example: SecurePass123!
     *               pin:
     *                 type: string
     *                 minLength: 4
     *                 maxLength: 4
     *                 example: "1234"
     *                 description: transaction PIN (4 digits)
     *     responses:
     *       201:
     *         description: User registered successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                   format: uuid
     *                 email:
     *                   type: string
     *                 token:
     *                   type: string
     *                   description: JWT authentication token
     *       400:
     *         description: Validation error
     *       409:
     *         description: Email already exists
     */
    register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const parseResult = registerSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw new ValidationError('Validation failed: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const user = await authService.register(parseResult.data);
        res.status(201).json(user);
    });

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Login to get JWT token
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *               password:
     *                 type: string
     *                 example: SecurePass123!
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   description: JWT authentication token
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     email:
     *                       type: string
     *       401:
     *         description: Invalid credentials
     */
    login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const parseResult = loginSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw new ValidationError('Validation failed: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const result = await authService.login(parseResult.data);
        res.json(result);
    });

    /**
     * @swagger
     * /api/auth/refresh:
     *   post:
     *     summary: Refresh access token using refresh token
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - refreshToken
     *             properties:
     *               refreshToken:
     *                 type: string
     *                 description: Refresh token received during login/registration
     *                 example: a1b2c3d4e5f6...
     *     responses:
     *       200:
     *         description: New access token generated
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 accessToken:
     *                   type: string
     *                   description: New JWT access token
     *       401:
     *         description: Invalid or expired refresh token
     */
    refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }

        const result = await authService.refreshAccessToken(refreshToken);
        res.json(result);
    });

    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: Logout (revoke refresh token)
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - refreshToken
     *             properties:
     *               refreshToken:
     *                 type: string
     *                 description: Refresh token to revoke
     *     responses:
     *       200:
     *         description: Logged out successfully
     *       401:
     *         description: Invalid refresh token
     */
    logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }

        // Extract access token from header
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.split(' ')[1] || '';

        const result = await authService.revokeRefreshToken(refreshToken, accessToken);
        res.json(result);
    });

    /**
     * @swagger
     * /api/auth/logout-all:
     *   post:
     *     summary: Logout from all devices (revoke all refresh tokens)
     *     tags: [Authentication]
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Logged out from all devices
     *       401:
     *         description: Unauthorized
     */
    logoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.user?.userId as string;
        
        // Extract access token from header
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.split(' ')[1] || '';
        
        const result = await authService.revokeAllRefreshTokens(userId, accessToken);
        res.json(result);
    });

    /**
     * @swagger
     * /api/auth/me:
     *   get:
     *     summary: Get current user information from JWT
     *     tags: [Authentication]
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Current user information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 userId:
     *                   type: string
     *                   format: uuid
     *                 email:
     *                   type: string
     *                   format: email
     *                 firstName:
     *                   type: string
     *                 lastName:
     *                   type: string
     *       401:
     *         description: Unauthorized - Invalid or missing token
     */
    me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        // req.user is populated by the authenticate middleware
        res.json(req.user);
    });
    
}
