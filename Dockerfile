# Multi-stage Dockerfile for production
FROM node:18-alpine AS builder

WORKDIR /app

# System deps required to build native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Install dependencies (including dev deps for build & prisma)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client and build TypeScript
RUN npm run prisma:generate && npm run build

# Drop dev dependencies to keep final image lean
RUN npm prune --omit=dev

# Production image
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Runtime dependencies for Prisma
RUN apk add --no-cache openssl

# Copy package files and production node_modules from builder
COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.sh ./start.sh

# Ensure the start script is executable
RUN chmod +x ./start.sh || true

EXPOSE 3000

# Run migrations then start (start.sh does this)
CMD ["./start.sh"]
