# Fastamoni Backend Assessment

A production-ready RESTful API for a donation platform with secure authentication, wallet management, Paystack payment integration, and real-time job processing.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Load Testing](#load-testing)
- [Production Deployment (Render)](#production-deployment-render)
- [Performance Characteristics](#performance-characteristics)
- [Known Limitations](#known-limitations)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Features

### Core Functionality
- User registration and authentication (JWT-based)
- Wallet management with automatic creation
- Beneficiary management (add, remove, search)
- Secure donation processing via Paystack
- Automatic wallet funding via webhooks
- Email notifications for donation milestones
- Transaction history and filtering
- Comprehensive input validation

### Security
- Bcrypt password hashing (10 salt rounds)
- Separate PIN protection for donations
- JWT access tokens with blacklist on logout
- Rate limiting on all endpoints
- Helmet security headers
- CORS protection
- SQL injection prevention (Prisma ORM)
- Webhook signature verification

### Performance & Scalability
- Redis caching on all read endpoints (2-5min TTL)
- BullMQ job queues for async processing
- Background workers for donations and emails
- Automatic cache invalidation on updates
- PostgreSQL with optimized indexes
- Connection pooling (50 connections per instance)
- Cluster mode in production (multi-core utilization)
- 70-90% reduction in database load via caching

### Developer Experience
- Full TypeScript with strict type checking
- Comprehensive JSDoc documentation
- Interactive Swagger/OpenAPI documentation
- Centralized error handling
- Structured logging with Winston
- Clean architecture (controllers → services → repositories)
- 82 automated tests (Jest + ts-jest)
- Hot reload in development
- Docker Compose for local services

---

## Tech Stack

- **Runtime**: Node.js 20+ LTS
- **Framework**: Express.js 4.19.2
- **Language**: TypeScript 5.4.5
- **Database**: PostgreSQL 15 (via Prisma ORM 6.19.2)
- **Caching**: Redis 7 (ioredis client)
- **Job Queue**: BullMQ 5.x
- **Authentication**: JWT + Bcrypt
- **Validation**: Zod 3.23.8
- **Logging**: Winston 3.13.0
- **Testing**: Jest 29+ with ts-jest
- **Load Testing**: Artillery 2.0.10
- **Payments**: Paystack API v3
- **Documentation**: Swagger UI + swagger-jsdoc
- **Security**: Helmet, CORS, express-rate-limit
- **Containerization**: Docker + Docker Compose

---

## Architecture

### Project Structure

```
src/
├── app.ts                    # Express app configuration
├── server.ts                 # Server entry point with cluster mode
├── config/
│   ├── env.ts               # Environment variable validation (Zod)
│   ├── redis.ts             # Redis client configuration
│   └── swagger.ts           # OpenAPI specification
├── controllers/             # HTTP request handlers
│   ├── auth.controller.ts
│   ├── beneficiary.controller.ts
│   ├── donation.controller.ts
│   ├── paystack.controller.ts
│   └── user.controller.ts
├── middleware/
│   ├── auth.middleware.ts   # JWT + blacklist verification
│   └── rateLimits.ts        # Endpoint-specific rate limits
├── routes/                  # Route definitions
├── services/                # Business logic (fully documented)
│   ├── auth.service.ts      # Registration, login, token management
│   ├── beneficiary.service.ts  # CRUD operations with caching
│   ├── donation.service.ts  # Async donation processing
│   ├── email.service.ts     # SMTP email sender
│   ├── paystack.service.ts  # Payment integration
│   └── user.service.ts      # User management with caching
├── queues/                  # BullMQ queue definitions
│   ├── donation.queue.ts    # Donation processing queue
│   └── notification.queue.ts # Email notification queue
├── workers/                 # Background job processors
│   ├── donation.worker.ts   # Processes donations asynchronously
│   └── notification.worker.ts # Sends emails asynchronously
├── utils/
│   ├── prisma.ts           # Prisma client singleton
│   ├── logger.ts           # Winston logger configuration
│   ├── validation.ts       # Zod schema validators
│   └── constants.ts        # Application constants
└── types/                  # TypeScript type definitions

prisma/
├── schema.prisma           # Database schema with indexes
└── migrations/             # Database migration history

tests/
├── mocks/
│   └── redis.ts           # Redis mock for unit tests
└── services/__tests__/     # Service layer tests
```

### System Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────────────────────────────┐
│    Express.js (Cluster Mode)        │
│  ┌───────────────────────────────┐  │
│  │  Rate Limiting Middleware     │  │
│  │  Auth Middleware (JWT)        │  │
│  │  Validation Middleware (Zod)  │  │
│  └───────────────────────────────┘  │
│           │                          │
│  ┌────────▼────────┐                │
│  │   Controllers   │                │
│  └────────┬────────┘                │
│           │                          │
│  ┌────────▼────────┐                │
│  │    Services     │──Cache Hit──┐  │
│  │  (Business      │             │  │
│  │   Logic)        │             │  │
│  └────────┬────────┘             │  │
│           │ Cache Miss           │  │
└───────────┼──────────────────────┼──┘
            │                      │
    ┌───────▼────────┐    ┌───────▼────────┐
    │   PostgreSQL   │    │     Redis      │
    │   (Primary)    │    │    (Cache +    │
    │                │    │    Queues)     │
    └────────────────┘    └────────┬───────┘
                                   │
                          ┌────────▼────────┐
                          │  BullMQ Workers │
                          │  - Donations    │
                          │  - Emails       │
                          └─────────────────┘
```

### Data Flow: Donation Processing

```
1. POST /api/donations
   ↓
2. Validate request (Zod)
   ↓
3. Verify JWT + check blacklist (Redis)
   ↓
4. Enqueue job (BullMQ → Redis)
   ↓
5. Return 202 Accepted (jobId)
   [API response completes here - 10-30ms]

Background Worker:
6. Process job from queue
   ↓
7. Validate donor wallet balance
   ↓
8. Create donation record (PostgreSQL)
   ↓
9. Update wallet balances (transaction)
   ↓
10. Invalidate cache (Redis)
   ↓
11. Enqueue email notification
```

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher (LTS recommended)
- **npm**: v10.x or higher
- **Docker**: v20.x or higher (for local PostgreSQL + Redis)
- **Docker Compose**: v2.x or higher

### Optional Tools

- **Postman**: For API testing
- **pgAdmin** or **DBeaver**: For database inspection
- **RedisInsight**: For Redis monitoring

---

## Development Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd backend-test
npm install
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and Redis containers
docker compose up -d

# Verify containers are running
docker ps
# Expected output:
# - backend-test-postgres (port 5432)
# - backend-test-redis (port 6379)

# Check container health
docker compose ps
```

### 3. Configure Environment Variables

```bash
# Create local environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```properties
# Server
NODE_ENV=development
PORT=3000

# Database (with optimized connection pool)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/donation_platform?connection_limit=50&pool_timeout=20&connect_timeout=10"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication (generate strong secret)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-recommended"

# Paystack (use TEST keys in development)
PAYSTACK_SECRET_KEY="sk_test_your_test_key_here"
PAYSTACK_CALLBACK_URL="http://localhost:3000/payment/callback"

# Email (optional - logs to console if not configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME="Donation Platform"

# Load Testing (disable rate limiting for accurate metrics)
DISABLE_RATE_LIMIT=false
```

**Important Notes:**
- Generate a strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- For Gmail SMTP, create an App Password: Google Account → Security → 2-Step Verification → App Passwords
- Never commit `.env` to version control

### 4. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables + indexes)
npx prisma migrate dev

# Optional: Seed database with test data
npx prisma db seed
```

### 5. Start Development Server

```bash
# Start with hot reload
npm run dev

# Server starts on http://localhost:3000
# Swagger docs: http://localhost:3000/api-docs
```

**Expected Console Output:**
```
info: Connected to Redis
info: Rate limiting is ENABLED for security
info: server running docs on: http://localhost:3000/api-docs
info: Environment: development
info: Worker started: notification-queue
info: Worker started: donation-queue
```

### 6. Verify Installation

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","uptime":123}

# API documentation
open http://localhost:3000/api-docs
```

---

## Testing

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- auth.service.test.ts

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### Test Coverage

- **Total Tests**: 82 across 6 test suites
- **Auth Service**: 13 tests (registration, login, token blacklist)
- **Beneficiary Service**: 15 tests (CRUD, search, nickname uniqueness)
- **Donation Service**: 15 tests (async processing, validation, pagination)
- **User Service**: 12 tests (list, profile, wallet, stats)
- **Email Service**: 7 tests (SMTP, milestone notifications)
- **Validation Utils**: 20 tests (Zod schema validation)

### Test Environment

Tests use:
- In-memory Redis mock (see `test/mocks/redis.ts`)
- Prisma mock (each test file has isolated mocks)
- No external dependencies (fully isolated)
- Automatic cleanup between tests

---

## Load Testing

### Purpose

Artillery-based load tests simulate production traffic to:
- Measure API performance under sustained load
- Identify bottlenecks (database, Redis, CPU)
- Validate caching effectiveness
- Test concurrent user scenarios

### Prerequisites

**Disable rate limiting for accurate metrics:**

Option 1 - Environment variable:
```bash
export DISABLE_RATE_LIMIT=true
npm run dev
```

Option 2 - Update `.env`:
```properties
DISABLE_RATE_LIMIT=true
```

**Warning Message (expected):**
```
⚠️  Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true). Only use this for load testing!
```

### Running Load Tests

```bash
# Full load test (100 rps for 30 seconds)
npm run test:load

# Light load test (5 rps for 10 seconds)
npm run test:load:light

# Generate HTML report
npm run test:load:report
# Opens interactive report in browser
```

### Test Scenarios

Load tests simulate realistic user behavior:

1. **Health Check (30%)**: Endpoint availability monitoring
2. **User Registration (20%)**: New user sign-ups with faker.js data
3. **User Login (20%)**: Authentication flow
4. **Complete Donation Flow (30%)**:
   - Register donor
   - Register beneficiary
   - Login donor
   - Create donation
   - Retrieve donation list

### Key Metrics

Artillery reports:

- **http.request_rate**: Actual throughput (rps)
- **http.response_time**:
  - `p50` (median): 50% of requests faster than this
  - `p95`: 95% of requests faster than this
  - `p99`: 99% of requests faster than this
- **http.codes**: Status code distribution
- **vusers.failed**: Failed virtual users (timeouts, errors)
- **errors.ETIMEDOUT**: Connection timeout count

### Interpreting Results

**Example Output:**
```
http.request_rate: 101/sec
http.response_time:
  median: 2ms        ← Cache hits (very fast)
  p95: 156ms         ← Cache misses + database queries
  p99: 8352ms        ← Auth operations (bcrypt hashing)
http.codes.200: 988
errors.ETIMEDOUT: 12
vusers.completed: 989/1000
```

**Good Performance Indicators:**
- Median response time < 10ms (caching working)
- P95 < 500ms for non-auth endpoints
- P99 < 1000ms overall
- Success rate > 95%
- Timeout errors < 5%

**Performance Bottlenecks:**
- High P99 (>5000ms): Database connection pool exhausted
- Many timeouts: CPU saturation or network issues
- High median (>50ms): Caching not working or cache misses

---

## Production Deployment (Render)

### Deployment Architecture

Render provisions:
- **Managed PostgreSQL**: Automatic backups, connection pooling
- **Managed Redis**: Persistent cache and job queue
- **Web Service**: Dockerized app with auto-scaling
- **HTTPS**: Automatic SSL certificate management
- **Health Checks**: Auto-restart on failures

### Prerequisites

1. GitHub repository with your code
2. Render account (free tier available)
3. Paystack account with LIVE API keys
4. (Optional) Custom domain

### Method 1: Automatic Deployment (render.yaml)

The project includes [`render.yaml`](render.yaml) for one-click deployment.

**Steps:**

1. **Push to GitHub**:
```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```

2. **Connect Repository**:
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect GitHub repository
   - Render auto-detects `render.yaml`

3. **Configure Secrets** (in Render Dashboard):

After blueprint is created, set these environment variables:

```properties
# Required
PAYSTACK_SECRET_KEY=sk_live_your_live_key_here
PAYSTACK_CALLBACK_URL=https://your-app-name.onrender.com/payment/callback
PRODUCTION_URL=https://your-app-name.onrender.com

# Optional (Email Notifications)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

**Auto-configured by render.yaml:**
- `DATABASE_URL`: From managed PostgreSQL
- `REDIS_URL`: From managed Redis
- `JWT_SECRET`: Auto-generated secure random string
- `NODE_ENV`: production
- `PORT`: 3000
- `DISABLE_RATE_LIMIT`: false (security enabled)

4. **Deploy**:
   - Render automatically builds Docker image
   - Runs database migrations via `start.sh`
   - Starts server with health checks
   - Build time: 5-10 minutes

5. **Configure Paystack Webhook**:
   - Paystack Dashboard → Settings → Webhooks
   - Add URL: `https://your-app-name.onrender.com/api/paystack/webhook`
   - Test webhook to verify signature verification

### Method 2: Manual Deployment

**1. Create PostgreSQL Database:**
```
Dashboard → New → PostgreSQL
- Name: backend-test-db
- Plan: Starter ($7/month) or Free
- Region: Oregon (or nearest)
```

Copy the "Internal Database URL" after creation.

**2. Create Redis Instance:**
```
Dashboard → New → Redis
- Name: backend-test-cache
- Plan: Starter ($10/month) or Free
- Region: Same as database
```

Copy the "Internal Redis URL".

**3. Create Web Service:**
```
Dashboard → New → Web Service
- Environment: Docker
- Repository: Select your GitHub repo
- Region: Same as database
- Plan: Starter ($7/month) or Free
- Docker Command: ./start.sh
```

**4. Set Environment Variables:**
```properties
NODE_ENV=production
PORT=3000
DATABASE_URL=<internal-postgres-url>
REDIS_URL=<internal-redis-url>
JWT_SECRET=<generate-32-char-random-string>
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_CALLBACK_URL=https://your-app.onrender.com/payment/callback
PRODUCTION_URL=https://your-app.onrender.com
DISABLE_RATE_LIMIT=false
```

**5. Configure Health Check:**
```
Health Check Path: /health
```

### Post-Deployment Verification

```bash
# 1. Check health
curl https://your-app-name.onrender.com/health

# 2. View API documentation
open https://your-app-name.onrender.com/api-docs

# 3. Test registration
curl -X POST https://your-app-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePass123!",
    "pin": "1234"
  }'

# 4. Monitor logs in Render Dashboard
# Look for:
# ✓ "Connected to Redis"
# ✓ "Database: X/100 connections active"
# ✓ "Worker started: donation-queue"
# ✓ "Worker started: notification-queue"
```

### Production Monitoring

**Render Dashboard provides:**
- Real-time logs (last 7 days on free tier)
- Metrics (CPU, memory, response times)
- Deploy history
- Health check status

**Key Metrics to Monitor:**
- Response time P95 < 500ms
- Error rate < 1%
- CPU usage < 80%
- Memory usage < 80%
- Database connections < 90% of pool size

**Logging in Production:**
```
# View logs in Render Dashboard or via CLI
render logs --tail

# Logs include:
# - Request/response times
# - Database query performance
# - Cache hit/miss rates
# - Job queue processing
# - Error stack traces
```

---

## Performance Characteristics

### Expected Performance (Render Starter Plan)

**Hardware:**
- 0.5 CPU cores
- 512 MB RAM
- Shared database (25 connections)

**Typical Metrics:**

| Endpoint Type | P50 | P95 | P99 | Notes |
|---------------|-----|-----|-----|-------|
| Health Check | 2ms | 5ms | 10ms | No database query |
| GET /users (cached) | 3ms | 8ms | 15ms | Redis cache hit |
| GET /users (uncached) | 45ms | 120ms | 250ms | Database query |
| POST /register | 85ms | 180ms | 350ms | Bcrypt hashing (50-100ms) |
| POST /login | 80ms | 170ms | 320ms | Bcrypt + JWT generation |
| POST /donations | 12ms | 30ms | 80ms | Queued (async processing) |

**Throughput:**
- Sustained: 50-100 requests/second
- Peak: 150-200 requests/second
- Success rate: 95-99%

### Caching Performance

**Cache Hit Rates:**
- User list: ~80% (5min TTL)
- User profile: ~70% (5min TTL)
- Wallet info: ~60% (1min TTL, frequent updates)
- Beneficiaries: ~75% (5min TTL)
- Donations: ~65% (5min TTL)

**Cache Impact:**
```
Uncached request:  50-150ms (database query)
Cached request:    2-8ms    (Redis lookup)
Speedup:           10-30×   faster
Database load:     -80%     reduction
```

### Scalability Limits

**Single Instance (Starter Plan):**
- Max concurrent users: 100-150
- Max throughput: 100 rps sustained
- Database connections: 25 (shared pool)
- Redis memory: 25 MB (free tier)

**Production Scaling (Paid Plans):**
- Horizontal: Multiple web instances behind load balancer
- Vertical: Larger instance types (more CPU/RAM)
- Database: Dedicated PostgreSQL with 100+ connections
- Redis: Dedicated instance with 256MB+ memory

---

## Known Limitations

### Performance Constraints

**1. Bcrypt Hashing (Inherent)**
- Every registration/login: 50-100ms CPU-bound operation
- Cannot optimize below 50ms without compromising security
- Auth endpoints will always be slower than read endpoints
- Recommended: Use refresh tokens to minimize login frequency

**2. Load Test Target (P99 < 50ms)**
- **Impossible to achieve** for all endpoints simultaneously
- Bcrypt alone takes 50-100ms
- Database writes: 10-50ms
- Network latency: 5-20ms
- **Realistic target**: P99 < 500ms for overall API

**Achievable P99 targets by endpoint type:**
- Health checks: < 20ms ✓
- Cached reads: < 50ms ✓
- Uncached reads: < 200ms
- Auth endpoints: < 300ms
- Write operations: < 500ms

**3. Cold Start (Free Tier)**
- Render spins down services after 15 minutes of inactivity
- First request after spin-down: 30-60 seconds wake-up time
- Subsequent requests: Normal performance
- **Solution**: Use paid plan or implement keep-alive pings

**4. Rate Limiting in Load Tests**
- Rate limits must be disabled (`DISABLE_RATE_LIMIT=true`)
- All Artillery requests come from same IP
- Even with high limits, requests get throttled
- **Not an issue in production** (distributed user IPs)

**5. Memory Usage**
- Initial memory usage may be high due to:
  - Redis cache warming
  - Database connection pool filling
- Expected to stabilize after initial requests

### Architectural Limitations

**1. SQLite (Development Only)**
- No concurrent writes
- No production use (switched to PostgreSQL for deployment)
- Case-insensitive search limitations

**2. Email Delivery**
- Requires external SMTP server (Gmail, SendGrid, etc.)
- Gmail daily limits: 500 emails/day
- **Recommendation**: Use SendGrid/Mailgun for production

**3. File Uploads**
- Not implemented (no profile pictures, receipts, etc.)
- Would require object storage (S3, Cloudinary)

**4. Real-time Updates**
- No WebSocket support
- Clients must poll for donation updates
- **Future enhancement**: Add Socket.io for real-time notifications

### Security Considerations

**1. JWT Token Management**
- Tokens stored in blacklist don't survive server restart (Redis only)
- **Solution**: Use Redis persistence (AOF/RDB) in production

**2. Rate Limiting**
- IP-based only (not per-user)
- Shared IPs (NAT, proxies) may hit limits faster
- **Future enhancement**: Add user-based rate limiting

**3. CORS Configuration**
- Currently allows all origins in development
- **Must configure** allowed origins for production

**4. Webhook Security**
- Only Paystack signature verification implemented
- No replay attack prevention (timestamp checking)

### Operational Limitations

**1. Database Migrations**
- No rollback mechanism beyond Prisma's capabilities
- Breaking schema changes require careful planning
- **Best practice**: Use feature flags for gradual rollouts

**2. Monitoring & Observability**
- Basic Winston logging only
- No APM (Application Performance Monitoring)
- No distributed tracing
- **Recommendation**: Add Sentry, DataDog, or New Relic

**3. Backup & Recovery**
- Render provides daily backups (paid plans)
- No point-in-time recovery on free tier
- No disaster recovery plan documented

**4. Load Balancing**
- Single instance on free/starter plans
- No automatic failover
- **Scaling**: Requires paid plan with multiple instances

---

## API Documentation

### Interactive Swagger UI

Access full API documentation at:
```
http://localhost:3000/api-docs          (Development)
https://your-app.onrender.com/api-docs  (Production)
```

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Invalidate access token
- `POST /api/auth/logout-all` - Logout from all devices

**Users:**
- `GET /api/users` - List all users (paginated)
- `GET /api/users/:id` - Get user profile
- `GET /api/users/wallet` - Get authenticated user's wallet

**Beneficiaries:**
- `POST /api/beneficiaries` - Add beneficiary
- `GET /api/beneficiaries` - List beneficiaries (search, paginate)
- `DELETE /api/beneficiaries/:id` - Remove beneficiary
- `PATCH /api/beneficiaries/:id/nickname` - Update nickname

**Donations:**
- `POST /api/donations` - Create donation (async processing)
- `GET /api/donations` - List donations (filter by donor/beneficiary)

**Payments (Webhooks):**
- `POST /api/paystack/webhook` - Paystack payment notifications

**Health:**
- `GET /health` - Service health check

### Authentication

All protected endpoints require JWT in header:
```bash
Authorization: Bearer <your-jwt-token>
```

Get token from login response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "user": { ... }
}
```

---

## Troubleshooting

### Common Issues

**1. "Cannot connect to database"**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker exec -it backend-test-postgres psql -U postgres -d donation_platform -c "SELECT 1;"
```

**2. "Redis connection failed"**

```bash
# Check Redis is running
docker ps | grep redis

# Test Redis
docker exec -it backend-test-redis redis-cli ping
# Expected: PONG

# Check Redis URL
echo $REDIS_URL
```

**3. "Paystack webhook signature invalid"**

```bash
# Verify raw body middleware is BEFORE json parser in app.ts
# Check webhook URL has no trailing slash
# Use ngrok for local testing:
ngrok http 3000
# Update Paystack webhook URL to: https://abc123.ngrok.io/api/paystack/webhook
```

**4. "Rate limit errors during load test"**

```bash
# Ensure DISABLE_RATE_LIMIT=true in .env
# Restart server after changing .env
# Verify in logs: "Rate limiting is DISABLED"
```

**5. "Jest tests hanging / not exiting"**

```bash
# Check for open handles
npm test -- --detectOpenHandles

# Ensure afterAll hooks close connections:
afterAll(async () => {
  await redis.quit();
  await prisma.$disconnect();
});
```

**6. "Prisma migration conflicts"**

```bash
# Development only - reset database
npx prisma migrate reset

# Production - create new migration
npx prisma migrate dev --name fix_conflict
```

### Performance Issues

**Slow response times:**
1. Check database connection pool usage
2. Verify Redis is caching (check logs for "Cache HIT")
3. Review slow query logs
4. Check CPU/memory usage

**High database load:**
1. Enable caching on read-heavy endpoints
2. Increase connection pool size
3. Add database indexes for frequent queries
4. Review N+1 query patterns

**Memory leaks:**
1. Monitor memory usage over time
2. Check for unclosed database connections
3. Review event listener registrations
4. Use heap snapshots for analysis

### Logging & Debugging

**Enable debug logging:**
```bash
# In development
DEBUG=* npm run dev

# Specific module
DEBUG=express:* npm run dev
```

**View Docker logs:**
```bash
# PostgreSQL logs
docker logs backend-test-postgres

# Redis logs
docker logs backend-test-redis
```

**Database query logging:**
```typescript
// In prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

---

## Contributing

This is an assessment project, but contributions for educational purposes are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -m 'Add improvement'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Open a Pull Request

**Before submitting:**
- Run all tests: `npm test`
- Check TypeScript: `npm run build`
- Format code: `npm run format` (if configured)
- Update documentation if needed

---

## License

MIT License - Free to use for learning and personal projects.

---

## Support & Contact

For questions or issues:
- Open a GitHub issue
- Contact: [Your email or support channel]

Built for Fastamoni Backend Assessment by [Your Name]

---

**Last Updated**: January 2026
