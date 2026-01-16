import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Specific routes must come before parameterized routes
router.get('/wallet', userController.wallet);
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

export default router;
