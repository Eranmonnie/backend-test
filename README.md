# Fastamoni Backend Assessment

A production-ready Node.js REST API built with TypeScript for the Fastamoni coding assessment. Features secure authentication, wallet management, P2P donations, beneficiary management, and Paystack payment integration.

## Features

### Core Functionality
- User authentication with JWT and refresh tokens
- Token blacklist system for immediate logout
- Wallet management with automatic creation
- Peer-to-peer donation system with atomic transactions
- Beneficiary management with nickname support
- Paystack integration for wallet funding
- Webhook handling for automatic payment processing
- User search and pagination across all resources

### Security
- JWT authentication with 15-minute access tokens
- Refresh tokens with 7-day expiration
- Token blacklist for revoked sessions
- Bcrypt password hashing (10 salt rounds)
- 4-6 digit PIN for transaction authorization
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet security headers
- CORS protection
- Input validation with Zod schemas
- SQL injection protection via Prisma ORM

### Developer Experience
- Full TypeScript with strict type checking
- Comprehensive JSDoc documentation on all services
- Interactive Swagger API documentation
- Centralized error handling
- Winston logging with multiple transports
- Clean architecture (controllers, services, middleware)
- 80 automated tests with Jest
- Hot reload in development with nodemon

## Tech Stack

- **Runtime**: Node.js v20+
- **Framework**: Express.js 4.19.2
- **Language**: TypeScript 5.4.5
- **Database**: Prisma ORM 6.19.2 (SQLite dev, PostgreSQL prod)
- **Authentication**: JWT + Bcrypt
- **Validation**: Zod 3.23.8
- **Logging**: Winston 3.13.0
- **Testing**: Jest 29+ with ts-jest
- **Load Testing**: Artillery 2.0.10 with @faker-js/faker 8.4.1
- **Payments**: Paystack API
- **Documentation**: Swagger UI + swagger-jsdoc
- **Security**: Helmet, CORS, express-rate-limit

## Project Structure

```
src/
├── app.ts                      # Express app configuration
├── server.ts                   # Server entry point with cleanup cron
├── config/
│   ├── env.ts                 # Environment variable validation
│   └── swagger.ts             # OpenAPI specification
├── controllers/               # HTTP request handlers
│   ├── auth.controller.ts
│   ├── donation.controller.ts
│   ├── beneficiary.controller.ts
│   ├── paystack.controller.ts
│   └── user.controller.ts
├── middleware/
│   ├── auth.middleware.ts     # JWT + token blacklist verification
│   └── rateLimits.ts          # Rate limiting configuration
├── routes/                    # Route definitions
│   ├── auth.routes.ts
│   ├── donation.routes.ts
│   ├── beneficiary.routes.ts
│   ├── paystack.routes.ts
│   └── user.routes.ts
├── services/                  # Business logic (fully documented)
│   ├── auth.service.ts
│   ├── donation.service.ts
│   ├── beneficiary.service.ts
│   ├── paystack.service.ts
│   ├── email.service.ts
│   ├── user.service.ts
│   └── __tests__/            # Service unit tests
├── types/
│   └── express.d.ts          # TypeScript type extensions
└── utils/
    ├── asyncHandler.ts       # Async error wrapper
    ├── errors.ts             # Custom error classes
    ├── logger.ts             # Winston configuration
    ├── validation.ts         # Zod schemas
    ├── constants.ts          # Application constants
    ├── dateFormatter.ts      # UTC date formatting
    └── prisma.ts             # Prisma client singleton

prisma/
├── schema.prisma             # Database schema
└── migrations/               # Database migrations
```

## Setup

### Prerequisites
- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone and install dependencies:
```bash
git clone <repository-url>
cd backend-test
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PAYSTACK_SECRET_KEY="sk_test_your_paystack_secret_key"

# Optional: Payment callback URL
PAYMENT_CALLBACK_URL="http://localhost:3000/payment/callback"

# Optional: Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME="Donation Platform"
```

3. Setup database:
```bash
npx prisma generate
npx prisma migrate dev
```

4. Run development server:
```bash
npm run dev
```

5. Access API documentation:
```
http://localhost:3000/api-docs
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (creates wallet automatically)
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout from current session (blacklists token)
- `POST /api/auth/logout-all` - Logout from all devices
- `GET /api/auth/me` - Get current user info

### Donations
- `POST /api/donations` - Make a donation (requires PIN)
- `GET /api/donations` - List donations with pagination and date filters
- `GET /api/donations/sent` - Get sent donations
- `GET /api/donations/received` - Get received donations
- `GET /api/donations/:id` - Get single donation details
- `GET /api/donations/count` - Get donation count
- `GET /api/donations/count/sent` - Get sent donation count

### Beneficiaries
- `GET /api/beneficiaries` - List beneficiaries with pagination and search
- `POST /api/beneficiaries` - Add new beneficiary with optional nickname
- `DELETE /api/beneficiaries/:id` - Remove beneficiary
- `PATCH /api/beneficiaries/:id/nickname` - Update beneficiary nickname

### Users
- `GET /api/users` - List all users with pagination and search
- `GET /api/users/:id` - Get specific user by ID
- `GET /api/users/wallet` -Get wallet information

### Payments (Paystack)
- `POST /api/paystack/fund-wallet` - Initialize wallet funding
- `POST /api/paystack/verify/:reference` - Verify payment manually
- `POST /api/paystack/webhook` - Webhook endpoint (called by Paystack)

### System
- `GET /health` - Health check endpoint

## Database Schema

### Models
- **User**: User account (email, password, PIN, firstName, lastName)
- **Wallet**: User wallet (balance)
- **Donation**: Donation record (donor, beneficiary, amount)
- **Transaction**: Transaction record (wallet, type, amount, reference, status)
- **Beneficiary**: Saved beneficiary relationship (with optional nickname)
- **RefreshToken**: Refresh token storage
- **TokenBlacklist**: Blacklisted access tokens

### Key Features
- Unique constraint on userId + nickname (per-user nickname uniqueness)
- Unique constraint on userId + beneficiaryId (prevent duplicate beneficiaries)
- Composite keys for efficient lookups
- Cascading deletes where appropriate
- Transaction-level locks for atomic operations

## Testing

Run the full test suite:
```bash
npm test
```

Run specific test file:
```bash
npm test -- src/services/__tests__/auth.service.test.ts
```

### Test Coverage
- 82 total tests across 6 test suites
- Auth service: 13 tests (registration, login, token management, blacklist)
- Beneficiary service: 15 tests (CRUD, search, nickname uniqueness)
- Donation service: 15 tests (make donation, pagination, filtering)
- User service: 12 tests (list users, get user, wallet, stats)
- Email service: 7 tests (sending emails, milestones)
- Validation utils: 24 tests (Zod schema validation)

## Load Testing

The project includes Artillery-based load testing to simulate real-world traffic and measure API performance under load.

### Prerequisites

**Option 1: Using .env file (Recommended)**

Add to your `.env` file:
```properties
DISABLE_RATE_LIMIT=true
```

Then start the server normally:
```bash
npm run dev
```

**Option 2: Using environment variable**

Start your dev server with rate limiting disabled:
```bash
DISABLE_RATE_LIMIT=true npm run dev
```

Or set it in your environment:
```bash
export DISABLE_RATE_LIMIT=true
npm run dev
```

**Important**: You'll see a warning message when rate limiting is disabled:
```
⚠️  Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true). Only use this for load testing!
```

### Running Load Tests

**Full Load Test** (100 requests/sec for 30 seconds):
```bash
npm run test:load
```

**Light Load Test** (5 requests/sec for 10 seconds):
```bash
npm run test:load:light
```

**Generate HTML Report**:
```bash
npm run test:load:report
# Opens report.html in your browser
```

**Important**: Always run load tests with `DISABLE_RATE_LIMIT=true` to get accurate performance metrics without rate limiting interference.

### Test Scenarios

The load tests simulate realistic user behavior with the following scenarios:

1. **Health Check (30% weight)**: Basic endpoint availability
2. **User Registration (20% weight)**: New user sign-ups with random data
3. **User Login (20% weight)**: Authentication flow
4. **Complete Donation Flow (30% weight)**: 
   - Register donor
   - Register beneficiary
   - Login donor
   - Create donation
   - Retrieve donations

### Understanding Results

Artillery provides key metrics:

- **http.request_rate**: Requests per second achieved
- **http.response_time**: Response time percentiles (p50, p95, p99)
- **http.responses**: Total successful/failed requests
- **vusers.created**: Number of virtual users

**Performance Targets**:
- P99 response time: < 500ms (99% of requests under 500ms)
- Success rate: > 99%
- Throughput: 100 requests/sec sustained

### Customizing Load Tests

Edit `load-test.yml` to adjust:
- **duration**: Test duration in seconds
- **arrivalRate**: Requests per second
- **weight**: Scenario distribution (must sum to 100)

The test data generator (`load-test-processor.js`) uses faker.js to create realistic random data for each test scenario.

## Key Features Explained

### Token Blacklist System
When a user logs out, their access token is added to a blacklist table with its expiration time. The auth middleware checks this blacklist before verifying the JWT. A cleanup cron job runs hourly to remove expired tokens from the blacklist.

### Unique Nicknames Per User
Each user can assign unique nicknames to their beneficiaries. The same nickname cannot be used twice by the same user, but different users can use the same nickname for their own beneficiaries. This is enforced at both the database level (unique constraint) and application level (validation).

### Atomic Donations
Donations use Prisma transactions to ensure atomicity:
1. Debit donor wallet
2. Credit beneficiary wallet
3. Create donation record
4. Create debit transaction
5. Create credit transaction

If any step fails, all changes are rolled back.

### Webhook Signature Verification
Paystack webhooks are verified using HMAC-SHA512 signature verification. The raw request body is preserved using express.raw() middleware specifically for the webhook route, ensuring the signature can be properly validated.

### Milestone Email Notifications
After donations at specific milestones (2nd, 5th, 10th, 25th, 50th, 100th), a thank you email is sent to the donor. Emails include personalized messages, emojis, and celebration graphics. If SMTP is not configured, emails are logged to the console.

### Search Functionality
All list endpoints support search:
- **Users**: Search by email, firstName, or lastName
- **Beneficiaries**: Search by nickname, email, firstName, or lastName
- Searches are case-insensitive (SQLite) or case-sensitive (PostgreSQL)

## Environment Variables Reference

```env
# Server Configuration
NODE_ENV=development|production|test
PORT=3000

# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
DATABASE_URL="postgresql://..."  # PostgreSQL for production

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-10-chars"

# Payments
PAYSTACK_SECRET_KEY="sk_test_..."  # Test key
PAYSTACK_SECRET_KEY="sk_live_..."  # Live key

# Payment Callback (Optional)
PAYMENT_CALLBACK_URL="http://localhost:3000/payment/callback"

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME="Donation Platform"

# Donation Configuration
MIN_DONATION_AMOUNT=100
MAX_DONATION_AMOUNT=1000000

# Notification Milestones (comma-separated)
NOTIFICATION_MILESTONES=2,5,10,25,50,100
```

## Deployment

### Render.com (Recommended)

1. **Create PostgreSQL Database**:
   - Database name: `donation_db`
   - Plan: Free or Starter
   - Copy the Internal Database URL

2. **Create Web Service**:
   - Connect your GitHub repository
   - Build Command: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     NODE_ENV=production
     DATABASE_URL=<your-postgres-url>
     JWT_SECRET=<strong-secret-key>
     PAYSTACK_SECRET_KEY=<your-paystack-key>
     PAYMENT_CALLBACK_URL=https://your-app.onrender.com/payment/callback
     ```

3. **Configure Paystack Webhook**:
   - Go to Paystack Dashboard > Settings > Webhooks
   - Add webhook URL: `https://your-app.onrender.com/api/paystack/webhook`
   - Test the webhook to verify it works

4. **Verify Deployment**:
   - Health check: `https://your-app.onrender.com/health`
   - API docs: `https://your-app.onrender.com/api-docs`

### Using render.yaml

The project includes a `render.yaml` file for automatic deployment. Simply connect your repository to Render and it will auto-configure both the database and web service.

## Development

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio (visual database editor)
npx prisma studio

# Check migration status
npx prisma migrate status
```

### TypeScript

```bash
# Type check without emitting files
npx tsc --noEmit

# Watch mode for type checking
npx tsc --noEmit --watch
```

### Logging

Winston logger configuration:
- **Development**: Logs to console only
- **Production**: Logs to console + files
  - `logs/error.log` - Error level only
  - `logs/combined.log` - All levels

Log levels: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`

## Architecture Decisions

### Why Refresh Tokens?
Access tokens are short-lived (15 minutes) for security. Refresh tokens (7 days) allow users to get new access tokens without re-logging in. This balances security with user experience.

### Why Token Blacklist?
JWT tokens can't be "revoked" since they're stateless. The blacklist allows immediate logout by storing revoked tokens until they expire naturally. An hourly cron job cleans up expired tokens.

### Why Atomic Transactions?
Donations involve multiple database operations (debit, credit, create records). Prisma transactions ensure all operations succeed or all fail, preventing inconsistent state where money could be lost or duplicated.

### Why Unique Nicknames Per User?
Users often save multiple beneficiaries and need to distinguish them. Unique nicknames per user (not globally) allow "Mom", "Best Friend", etc. without conflicts, while preventing the same user from having duplicate nicknames.

### Why Raw Body for Webhooks?
Paystack signs the raw request body. If Express parses it to JSON first, the signature verification fails. The app uses `express.raw()` middleware specifically for the webhook route to preserve the original body.

## Performance Considerations

- **Database Indexes**: Composite indexes on frequently queried fields (userId, reference, email)
- **Pagination**: All list endpoints use cursor-based pagination to prevent large dataset issues
- **Connection Pooling**: Prisma manages database connection pool automatically
- **Rate Limiting**: Prevents abuse and protects against DDoS
- **Selective Field Queries**: Only fetch needed fields using Prisma's select
- **N+1 Prevention**: Use Prisma's include for related data in single query

## Security Best Practices Implemented

1. **Password Storage**: Bcrypt with 10 salt rounds (never store plain text)
2. **PIN Storage**: Also bcrypted, separate from password
3. **Token Security**: Short-lived access tokens, longer refresh tokens, blacklist for revocation
4. **Input Validation**: Zod schemas validate all inputs before processing
5. **SQL Injection**: Prisma's parameterized queries prevent injection
6. **XSS Protection**: Helmet middleware sets security headers
7. **CORS**: Configured to only allow specific origins (customizable)
8. **Rate Limiting**: Prevents brute force attacks
9. **Error Messages**: No sensitive data exposed in error responses
10. **Logging**: No passwords or tokens logged

## Common Issues and Solutions

### SQLite: "mode" parameter error
SQLite doesn't support `mode: 'insensitive'` for case-insensitive search. The code handles this by omitting the mode parameter for SQLite (case-insensitive by default for ASCII).

### Webhook signature verification fails
Ensure:
1. Raw body middleware is BEFORE json parser: `app.use('/api/paystack/webhook', express.raw(...))`
2. No trailing slash in webhook URL: use `/webhook` not `/webhook/`
3. Correct secret key in environment variables
4. HTTPS in production (ngrok for local testing)

### Tests failing after adding mocks
Each test file needs its own Prisma mock. Don't use shared setup files for mocks as Jest isolates test files.

### Migration conflicts
If migrations get out of sync:
```bash
npx prisma migrate reset  # Development only!
npx prisma migrate dev
```

## Future Enhancements

Potential features for production deployment:

- Email verification on registration
- Password reset flow via email
- Two-factor authentication (2FA)
- Wallet withdrawal functionality
- Transaction receipts (PDF generation)
- Admin dashboard for monitoring
- Rate limiting per user (not just per IP)
- Scheduled donations (recurring)
- Multi-currency support
- GraphQL API alternative
- Redis caching for performance
- Elasticsearch for advanced search
- WebSocket for real-time notifications
- Mobile app integration (React Native)
- Comprehensive monitoring (Sentry, DataDog)
- Load balancing for horizontal scaling

## Contributing

This is an assessment project, but contributions are welcome for educational purposes:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Ensure all tests pass before submitting: `npm test`

## License

MIT License - feel free to use this code for learning and personal projects.

## Author

Built for Fastamoni Backend Assessment

## Acknowledgments

- Fastamoni team for the interesting challenge
- Prisma for excellent ORM and documentation
- Paystack for reliable payment infrastructure
- The Node.js and TypeScript communities

---

**Note**: This is a demonstration project showcasing backend development best practices. For production use, implement additional security measures, comprehensive monitoring, and scale according to your needs.
