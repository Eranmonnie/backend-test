import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';

const userService = new UserService();

export class UserController {
    /**
     * @swagger
     * /api/users:
     *   get:
     *     summary: Get all users with pagination
     *     tags: [Users]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *         description: Page number
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 10
     *         description: Number of items per page
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search by email, first name, or last name
     *     responses:
     *       200:
     *         description: List of users with pagination
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       email:
     *                         type: string
     *                       firstName:
     *                         type: string
     *                       lastName:
     *                         type: string
     *                       createdAt:
     *                         type: string
     *                         format: date-time
     *                       wallet:
     *                         type: object
     *                         properties:
     *                           balance:
     *                             type: number
     *                       _count:
     *                         type: object
     *                         properties:
     *                           sentDonations:
     *                             type: integer
     *                           receivedDonations:
     *                             type: integer
     *                 meta:
     *                   type: object
     *                   properties:
     *                     total:
     *                       type: integer
     *                     page:
     *                       type: integer
     *                     limit:
     *                       type: integer
     *                     pages:
     *                       type: integer
     *       401:
     *         description: Unauthorized
     */
    getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string | undefined;

        if (page < 1) {
            throw new ValidationError('Page must be greater than 0');
        }

        if (limit < 1 || limit > 100) {
            throw new ValidationError('Limit must be between 1 and 100');
        }

        const result = await userService.getUsers(page, limit, search);
        res.json(result);
    });

    /**
     * @swagger
     * /api/users/{id}:
     *   get:
     *     summary: Get a specific user by ID
     *     tags: [Users]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID
     *     responses:
     *       200:
     *         description: User details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                 email:
     *                   type: string
     *                 firstName:
     *                   type: string
     *                 lastName:
     *                   type: string
     *                 createdAt:
     *                   type: string
     *                   format: date-time
     *                 wallet:
     *                   type: object
     *                   properties:
     *                     balance:
     *                       type: number
     *                 _count:
     *                   type: object
     *                   properties:
     *                     sentDonations:
     *                       type: integer
     *                     receivedDonations:
     *                       type: integer
     *       404:
     *         description: User not found
     *       401:
     *         description: Unauthorized
     */
    getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;
        const user = await userService.getUserById(id);
        res.json(user);
    });

    /**
     * @swagger
     * /api/users/wallet:
     *   get:
     *     summary: Get the authenticated user's wallet information
     *     tags: [Users]
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Wallet details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                 balance:
     *                   type: number
     *                 createdAt:
     *                   type: string
     *                   format: date-time
     *                 updatedAt:
     *                   type: string
     *                   format: date-time
     *       404:
     *         description: Wallet not found
     *       401:
     *         description: Unauthorized
     */
    wallet = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        //get user wallet info
        const userId = req.user?.userId as string;
        const wallet = await userService.getUserWallet(userId);
        res.json(wallet);
    });
}

export const userController = new UserController();
