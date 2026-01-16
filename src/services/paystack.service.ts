import axios from 'axios';
import env from '../config/env';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

interface InitializeTransactionData {
    email: string;
    amount: number; // in kobo 
    reference: string;
    callback_url?: string;
    metadata?: Record<string, any>;
}

interface InitializeTransactionResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

interface VerifyTransactionResponse {
    status: boolean;
    message: string;
    data: {
        id: number;
        reference: string;
        amount: number;
        status: 'success' | 'failed' | 'abandoned';
        paid_at: string;
        channel: string;
        currency: string;
        customer: {
            email: string;
        };
    };
}

interface TransferRecipientData {
    type: 'nuban' | 'mobile_money' | 'basa';
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
}

interface TransferData {
    source: 'balance';
    amount: number; // in kobo
    reference: string;
    recipient: string;
    reason?: string;
}

export class PaystackService {
    private apiKey: string;
    private baseUrl: string = 'https://api.paystack.co';

    constructor() {
        this.apiKey = env.PAYSTACK_SECRET_KEY;
    }

    private getHeaders() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Initialize a payment transaction
     * @param data - Transaction initialization data
     * @returns Payment authorization URL and reference
     */
    async initializeTransaction(data: InitializeTransactionData): Promise<InitializeTransactionResponse> {
        try {
            logger.info('Initializing Paystack transaction', { reference: data.reference });

            const response = await axios.post<InitializeTransactionResponse>(
                `${this.baseUrl}/transaction/initialize`,
                data,
                { headers: this.getHeaders() }
            );

            logger.info('Paystack transaction initialized', { 
                reference: data.reference,
                authorization_url: response.data.data.authorization_url 
            });

            return response.data;
        } catch (error: any) {
            logger.error('Paystack initialization failed', { 
                error: error.response?.data || error.message,
                reference: data.reference 
            });

            throw new AppError(
                500,
                error.response?.data?.message || 'Failed to initialize payment'
            );
        }
    }

    /**
     * Verify a payment transaction
     * @param reference - Transaction reference
     * @returns Transaction verification data
     */
    async verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
        try {
            logger.info('Verifying Paystack transaction', { reference });

            const response = await axios.get<VerifyTransactionResponse>(
                `${this.baseUrl}/transaction/verify/${reference}`,
                { headers: this.getHeaders() }
            );

            logger.info('Paystack transaction verified', { 
                reference,
                status: response.data.data.status 
            });

            return response.data;
        } catch (error: any) {
            logger.error('Paystack verification failed', { 
                error: error.response?.data || error.message,
                reference 
            });

            throw new AppError(
                500,
                error.response?.data?.message || 'Failed to verify payment'
            );
        }
    }

    /**
     * Create a transfer recipient
     * @param data - Recipient data
     * @returns Recipient code
     */
    async createTransferRecipient(data: TransferRecipientData): Promise<string> {
        try {
            logger.info('Creating Paystack transfer recipient', { name: data.name });

            const response = await axios.post(
                `${this.baseUrl}/transferrecipient`,
                data,
                { headers: this.getHeaders() }
            );

            const recipientCode = response.data.data.recipient_code;

            logger.info('Paystack transfer recipient created', { 
                name: data.name,
                recipient_code: recipientCode 
            });

            return recipientCode;
        } catch (error: any) {
            logger.error('Paystack recipient creation failed', { 
                error: error.response?.data || error.message 
            });

            throw new AppError(
                500,
                error.response?.data?.message || 'Failed to create transfer recipient'
            );
        }
    }

    /**
     * Initiate a transfer (payout)
     * @param data - Transfer data
     * @returns Transfer reference and status
     */
    async initiateTransfer(data: TransferData): Promise<any> {
        try {
            logger.info('Initiating Paystack transfer', { reference: data.reference });

            const response = await axios.post(
                `${this.baseUrl}/transfer`,
                data,
                { headers: this.getHeaders() }
            );

            logger.info('Paystack transfer initiated', { 
                reference: data.reference,
                status: response.data.data.status 
            });

            return response.data;
        } catch (error: any) {
            logger.error('Paystack transfer failed', { 
                error: error.response?.data || error.message,
                reference: data.reference 
            });

            throw new AppError(
                500,
                error.response?.data?.message || 'Failed to initiate transfer'
            );
        }
    }

    /**
     * Generate a unique transaction reference
     * @param prefix - Optional prefix for the reference
     * @returns Unique reference string
     */
    generateReference(prefix: string = 'TXN'): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Convert amount to kobo (Paystack uses smallest currency unit)
     * @param amount - Amount in Naira
     * @returns Amount in kobo
     */
    toKobo(amount: number): number {
        return Math.round(amount * 100);
    }

    /**
     * Convert amount from kobo to Naira
     * @param kobo - Amount in kobo
     * @returns Amount in Naira
     */
    fromKobo(kobo: number): number {
        return kobo / 100;
    }

    /**
     * Verify webhook signature
     * @param signature - Signature from webhook header
     * @param body - Request body (string or Buffer)
     * @returns Whether signature is valid
     */
    verifyWebhookSignature(signature: string, body: string | Buffer): boolean {
        const crypto = require('crypto');
        
        // Convert Buffer to string
        const bodyString = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        
        const hash = crypto
            .createHmac('sha512', this.apiKey)
            .update(bodyString)
            .digest('hex');
        
        logger.info('Webhook signature verification', {
            receivedSignature: signature,
            computedHash: hash,
            matches: hash === signature
        });
        
        return hash === signature;
    }
}
