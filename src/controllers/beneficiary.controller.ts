import { Request, Response } from 'express';
import { BeneficiaryService } from '../services/beneficiary.service';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { addBeneficiarySchema, updateNicknameSchema, paginationQuerySchema } from '../utils/validation';

const beneficiaryService = new BeneficiaryService();

export class BeneficiaryController {
    /**
     * @swagger
     * /api/beneficiaries:
     *   post:
     *     summary: Add a beneficiary to saved list
     *     tags: [Beneficiaries]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - beneficiaryId
     *             properties:
     *               beneficiaryId:
     *                 type: string
     *                 format: uuid
     *                 description: User ID to add as beneficiary
     *               nickname:
     *                 type: string
     *                 maxLength: 50
     *                 description: Optional display name
     *     responses:
     *       201:
     *         description: Beneficiary added successfully
     *       400:
     *         description: Validation error
     *       409:
     *         description: Beneficiary already exists
     */
    addBeneficiary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        if (!req.user?.userId) {
            throw new UnauthorizedError('User not authenticated');
        }

        const userId = req.user.userId;
        const parseResult = addBeneficiarySchema.safeParse(req.body);

        if (!parseResult.success) {
            throw new ValidationError('Validation failed: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const result = await beneficiaryService.addBeneficiary(
            userId,
            parseResult.data
        );

        res.status(201).json(result);
    });

    /**
     * @swagger
     * /api/beneficiaries:
     *   get:
     *     summary: Get list of saved beneficiaries with pagination
     *     tags: [Beneficiaries]
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
     *         description: Items per page
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search by nickname, email, first name, or last name
     *     responses:
     *       200:
     *         description: Paginated list of beneficiaries
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
     *                       beneficiaryId:
     *                         type: string
     *                       email:
     *                         type: string
     *                       firstName:
     *                         type: string
     *                       lastName:
     *                         type: string
     *                       nickname:
     *                         type: string
     *                       createdAt:
     *                         type: string
     *                         format: date-time
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
     */
    getBeneficiaries = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        if (!req.user?.userId) {
            throw new UnauthorizedError('User not authenticated');
        }

        const userId = req.user.userId;
        
        // Validate query parameters
        const parseResult = paginationQuerySchema.safeParse(req.query);
        
        if (!parseResult.success) {
            throw new ValidationError('Invalid query parameters: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const { page, limit } = parseResult.data;
        const search = req.query.search as string | undefined;

        const beneficiaries = await beneficiaryService.getBeneficiaries(userId, page, limit, search);
        res.json(beneficiaries);
    });

    /**
     * @swagger
     * /api/beneficiaries/{beneficiaryId}:
     *   delete:
     *     summary: Remove a beneficiary from saved list
     *     tags: [Beneficiaries]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: beneficiaryId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Beneficiary removed successfully
     *       404:
     *         description: Beneficiary not found
     */
    removeBeneficiary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        if (!req.user?.userId) {
            throw new UnauthorizedError('User not authenticated');
        }

        const userId = req.user.userId;
        const { beneficiaryId } = req.params;

        if (!beneficiaryId) {
            throw new ValidationError('Beneficiary ID is required');
        }

        const result = await beneficiaryService.removeBeneficiary(userId, beneficiaryId);
        res.json(result);
    });

    /**
     * @swagger
     * /api/beneficiaries/{beneficiaryId}/nickname:
     *   patch:
     *     summary: Update beneficiary nickname
     *     tags: [Beneficiaries]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: beneficiaryId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - nickname
     *             properties:
     *               nickname:
     *                 type: string
     *                 maxLength: 50
     *     responses:
     *       200:
     *         description: Nickname updated successfully
     *       404:
     *         description: Beneficiary not found
     */
    updateNickname = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        if (!req.user?.userId) {
            throw new UnauthorizedError('User not authenticated');
        }

        const userId = req.user.userId;
        const { beneficiaryId } = req.params;
        const parseResult = updateNicknameSchema.safeParse(req.body);

        if (!beneficiaryId) {
            throw new ValidationError('Beneficiary ID is required');
        }

        if (!parseResult.success) {
            throw new ValidationError('Validation failed: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const result = await beneficiaryService.updateNickname(
            userId,
            beneficiaryId,
            parseResult.data.nickname
        );

        res.json(result);
    });
}
