import { Router } from 'express';
import { PaystackController } from '../controllers/paystack.controller';
import { authenticate } from '../middleware/auth.middleware';
import { paymentRateLimit } from '../middleware/rateLimits';

const router = Router();
const paystackController = new PaystackController();

router.post('/fund-wallet', authenticate, paymentRateLimit, paystackController.fundWallet);

router.post('/webhook', paystackController.handleWebhook);

export default router;
