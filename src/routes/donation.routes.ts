import { Router } from 'express';
import { DonationController } from '../controllers/donation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { donationRateLimit } from '../middleware/rateLimits';

const router = Router();
const donationController = new DonationController();

router.use(authenticate); 
router.post('/', donationRateLimit, donationController.createDonation);
router.get('/count', donationController.getDonationCount);
router.get('/', donationController.getDonations);
router.get('/:id', donationController.getDonation);

export default router;
