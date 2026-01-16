import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import donationRoutes from './routes/donation.routes';
import beneficiaryRoutes from './routes/beneficiary.routes';
import paystackRoutes from './routes/paystack.routes';
import userRoutes from './routes/user.routes';
import { AppError } from './utils/errors';
import logger from './utils/logger';
import env from './config/env';
import { errors } from './middleware/auth.middleware';
import { swaggerSpec } from './config/swagger';

// Create Express app
const app: Application = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate Limiting
// Rate Limiting
if (!env.DISABLE_RATE_LIMIT) {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
    });
    app.use('/api/', limiter);
}

// Body Parser - Special handling for Paystack webhook to preserve raw body
app.use('/api/paystack/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-01-15T14:30:00.000Z
 */
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/paystack', paystackRoutes);
app.use('/api/users', userRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use(errors);

export default app;
