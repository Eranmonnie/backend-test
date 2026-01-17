# Multi-stage Dockerfile for production
FROM node:18-alpine AS builder

WORKDIR /app

# System deps required to build native modules (bcrypt, prisma)
RUN apk add --no-cache python3 make g++ openssl

# Install dependencies (including dev deps for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Remove dev dependencies for smaller image
RUN npm prune --omit=dev

# --- Production stage ---
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Copy built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy start script
COPY start.sh ./

# Make start script executable (important!)
RUN chmod +x start.sh

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run migrations and start server
CMD ["./start.sh"]
