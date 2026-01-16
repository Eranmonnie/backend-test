import { Request, Response } from 'express';
import { PaystackService } from '../services/paystack.service';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { fundWalletSchema } from '../utils/validation';

const paystackService = new PaystackService();

const verifyPaymentSchema = z.object({
    reference: z.string().min(1, 'Reference is required'),
});

export class PaystackController {
    /**
     * @swagger
     * /api/paystack/fund-wallet:
     *   post:
     *     summary: Initialize wallet funding via Paystack
     *     tags: [Payments]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - amount
     *             properties:
     *               amount:
     *                 type: number
     *                 minimum: 100
     *                 description: Amount in Naira (NGN)
     *                 example: 5000

     *     responses:
     *       200:
     *         description: Payment initialized successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 authorization_url:
     *                   type: string
     *                   description: Paystack payment URL
     *                 access_code:
     *                   type: string
     *                 reference:
     *                   type: string
     *                   description: Unique transaction reference
     *                 amount:
     *                   type: number
     *       400:
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     */
    fundWallet = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        if (!req.user?.userId) {
            throw new UnauthorizedError('User not authenticated');
        }

        const userId = req.user.userId;
        const parseResult = fundWalletSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw new ValidationError('Validation failed: ' + parseResult.error.issues.map(i => i.message).join(', '));
        }

        const { amount } = parseResult.data;

        // Get user details and wallet
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true }
        });

        if (!user || !user.wallet) {
            throw new UnauthorizedError('User or wallet not found');
        }

        // Generate unique reference
        const reference = paystackService.generateReference('FUND');

        // Create Pending Transaction First (with the reference)
        await prisma.transaction.create({
            data: {
                walletId: user.wallet.id,
                type: 'CREDIT',
                amount,
                reference,
                status: 'PENDING',
            }
        });

        logger.info('Pending transaction created', { userId, reference, amount });

        // Convert amount to kobo
        const amountInKobo = paystackService.toKobo(amount);

        // Initialize Paystack transaction (with the same reference)
        const transaction = await paystackService.initializeTransaction({
            email: user.email,
            amount: amountInKobo,
            reference, // Same reference as our local transaction
            callback_url: process.env.PAYSTACK_CALLBACK_URL,
            metadata: {
                user_id: userId,
                wallet_id: user.wallet.id,
                purpose: 'wallet_funding',
            },
        });

        logger.info('Wallet funding initialized with Paystack', { userId, reference, amount });

        res.status(200).json({
            message: 'Payment initialized successfully',
            authorization_url: transaction.data.authorization_url,
            access_code: transaction.data.access_code,
            reference: transaction.data.reference,
            amount,
        });
    });

    /**
     * @swagger
     * /api/paystack/webhook:
     *   post:
     *     summary: Paystack webhook endpoint (auto-credit wallet on success)
     *     tags: [Payments]
     *     description: This endpoint is called by Paystack when payment events occur. No authentication required - signature verified.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Paystack webhook payload
     *     responses:
     *       200:
     *         description: Webhook processed successfully
     *       401:
     *         description: Invalid signature
     */
    handleWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const signature = req.headers['x-paystack-signature'] as string;

        if (!signature) {
            throw new UnauthorizedError('No signature provided');
        }

        // Handle both raw body (Buffer) and parsed JSON
        let bodyString: string;
        let event: any;

        if (Buffer.isBuffer(req.body)) {
            // Raw body from express.raw() - convert to string
            bodyString = req.body.toString('utf8');
            event = JSON.parse(bodyString);
        } else {
            // Already parsed JSON - stringify it back for signature verification
            bodyString = JSON.stringify(req.body);
            event = req.body;
        }

        // Verify webhook signature using raw body string
        const isValid = paystackService.verifyWebhookSignature(signature, bodyString);

        if (!isValid) {
            logger.error('Invalid webhook signature', {
                receivedSignature: signature,
                bodyPreview: bodyString.substring(0, 100)
            });
            throw new UnauthorizedError('Invalid webhook signature');
        }

        logger.info('Paystack webhook received', { event: event.event, reference: event.data?.reference });

        // Handle different event types
        switch (event.event) {
            case 'charge.success':
                await this.handleChargeSuccess(event.data);
                break;

            case 'transfer.success':
                logger.info('Transfer successful', { reference: event.data.reference });
                break;

            case 'transfer.failed':
                logger.error('Transfer failed', { reference: event.data.reference });
                break;

            default:
                logger.info('Unhandled webhook event', { event: event.event });
        }

        res.status(200).json({ message: 'Webhook received' });
    });

    /**
     * Handle successful charge - Credit wallet automatically
     * @private
     */
    private async handleChargeSuccess(data: any): Promise<void> {
        const reference = data.reference;
        const amountInKobo = data.amount;
        const amount = paystackService.fromKobo(amountInKobo);

        logger.info('Processing charge success webhook', { reference, amount });

        try {
            // finds the pending transaction by reference
            const transaction = await prisma.transaction.findUnique({
                where: { reference },
                include: { wallet: true }
            });

            // If no transaction found, log and skip
            if (!transaction) {
                logger.error('No transaction found for reference', { reference });
                return;
            }

            // If already processed (status is SUCCESS), skip to avoid double-crediting
            if (transaction.status === 'SUCCESS') {
                logger.warn('Transaction already processed', { reference });
                return;
            }

            //update status and credit wallet (
            await prisma.$transaction(async (tx) => {
                // Update transaction status to success
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 'SUCCESS' }
                });

                // Credit wallet
                await tx.wallet.update({
                    where: { id: transaction.walletId },
                    data: { balance: { increment: amount } }
                });
            });

            logger.info('Wallet credited via webhook', {
                walletId: transaction.walletId,
                reference,
                amount
            });
        } catch (error: any) {
            logger.error('Failed to process charge success webhook', {
                reference,
                error: error.message,
            });

        }
    }
}
