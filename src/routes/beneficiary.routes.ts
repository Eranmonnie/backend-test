import { Router } from 'express';
import { BeneficiaryController } from '../controllers/beneficiary.controller';
import { authenticate } from '../middleware/auth.middleware';
import { beneficiaryRateLimit } from '../middleware/rateLimits';

const router = Router();
const beneficiaryController = new BeneficiaryController();

// All routes require authentication
router.use(authenticate);
router.use(beneficiaryRateLimit);
router.post('/', beneficiaryController.addBeneficiary);
router.get('/', beneficiaryController.getBeneficiaries);
router.delete('/:beneficiaryId', beneficiaryController.removeBeneficiary);
router.patch('/:beneficiaryId/nickname', beneficiaryController.updateNickname);

export default router;
