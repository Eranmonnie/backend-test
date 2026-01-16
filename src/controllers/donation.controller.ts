import { Request, Response } from 'express';
import { DonationService } from '../services/donation.service';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { donationSchema, validatePin, getDonationsQuerySchema, getDonationCountQuerySchema } from '../utils/validation';
import { formatDatesUTC } from '../utils/dateFormatter';

const donationService = new DonationService();

export class DonationController {
    /**
     * @swagger
     * /api/donations:
     *   post:
     *     summary: Make a donation
     *     tags: [Donations]
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
     *               - amount
     *               - pin
     *             properties:
     *               beneficiaryId:
     *                 type: string
     *                 format: uuid
     *                 description: User ID of the donation recipient
     *               amount:
     *                 type: number
     *                 minimum: 100
     *                 maximum: 1000000
     *                 description: Donation amount in Naira (₦100 - ₦1,000,000)
     *                 example: 5000
     *               pin:
     *                 type: string
     *                 minLength: 4
     *                 maxLength: 4
     *                 description: Transaction PIN (4 digits)
     *                 example: "1234"
     *     responses:
     *       201:
     *         description: Donation created successfully
     *       400:
     *         description: Validation error (insufficient funds, invalid amount, cannot donate to self)
     *       401:
     *         description: Invalid PIN
     *       404:
     *         description: Beneficiary not found
     */
    createDonation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const parseResult = donationSchema.safeParse(req.body);
        const userId = req.user?.userId as string;

        if (!parseResult.success) {
            throw new ValidationError('Validation failed: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        //pin verification
        const isPinValid = await validatePin(userId, parseResult.data.pin);
        if (!isPinValid) {
            throw new UnauthorizedError('Invalid PIN');
        }

        const result = await donationService.makeDonation(userId, parseResult.data);
        res.status(201).json(formatDatesUTC(result));
    });

    /**
     * @swagger
     * /api/donations:
     *   get:
     *     summary: Get user's donations with pagination and filtering
     *     tags: [Donations]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: donor
     *         schema:
     *           type: boolean
     *           default: false
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date-time
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date-time
     *     responses:
     *       200:
     *         description: List of donations
     */
    getDonations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.user?.userId as string;
        
        // Validate query parameters
        const parseResult = getDonationsQuerySchema.safeParse(req.query);
        
        if (!parseResult.success) {
            throw new ValidationError('Invalid query parameters: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const { page, limit, startDate, endDate, donor } = parseResult.data;
        
        // Parse dates if provided
        const parsedStartDate = startDate ? new Date(startDate) : undefined;
        const parsedEndDate = endDate ? new Date(endDate) : undefined;
        const isDonor = donor === 'true';
        

        const result = await donationService.getDonations(userId, isDonor, page, limit, parsedStartDate, parsedEndDate);
        res.json(formatDatesUTC(result));
    });

    /**
     * @swagger
     * /api/donations/count:
     *   get:
     *     summary: Get total count of user's donations
     *     tags: [Donations]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: donor
     *         schema:
     *           type: boolean
     *         description: Filter by donor or beneficiary
     *     responses:
     *       200:
     *         description: Donation count
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 count:
     *                   type: integer
     */
    getDonationCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.user?.userId as string;
        
        // Validate query parameters
        const parseResult = getDonationCountQuerySchema.safeParse(req.query);
        
        if (!parseResult.success) {
            throw new ValidationError('Invalid query parameters: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const { donor } = parseResult.data;
        const isDonor = donor == 'true';
        
        const count = await donationService.getDonationCount(userId, isDonor);
        res.json({ count });
    });

    /**
     * @swagger
     * /api/donations/{id}:
     *   get:
     *     summary: Get single donation details (filtered by user role)
     *     tags: [Donations]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Donation details with filtered transactions
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: string
     *                 donorId:
     *                   type: string
     *                 beneficiaryId:
     *                   type: string
     *                 amount:
     *                   type: number
     *                 donor:
     *                   type: object
     *                 beneficiary:
     *                   type: object
     *                 transactions:
     *                   type: array
     *                   description: Filtered - donor sees only DEBIT, beneficiary sees only CREDIT
     *                 userRole:
     *                   type: string
     *                   enum: [donor, beneficiary]
     *       400:
     *         description: Access denied - not authorized to view this donation
     *       404:
     *         description: Donation not found
     */
    getDonation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { id } = req.params;
        const userId = req.user?.userId as string;
        
        const result = await donationService.getDonation(String(id), userId);

        res.json(formatDatesUTC(result));
    });
}
