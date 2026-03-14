# ===========================================
# Mystasis Backend Dockerfile
# Multi-stage build for optimized production image
# ===========================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat openssl

# Copy package files and prisma config
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client (dummy URL — generate doesn't connect to DB)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy generated Prisma client (output is now in src/generated/prisma/)
COPY --from=deps /app/src/generated ./src/generated

# Copy source code
COPY . .

# Build the application
# Prisma 7 generates .ts extension imports that tsc preserves in compiled output.
# Node.js CJS require() cannot resolve .ts extensions, so we fix them post-build.
RUN npm run build && \
    find dist/src/generated -name '*.js' -exec sed -i "s/\.ts\"/\.js\"/g; s/\.ts'/\.js'/g" {} +

# Stage 3: Production
FROM node:22-alpine AS production
WORKDIR /app

# Install necessary runtime dependencies
RUN apk add --no-cache libc6-compat openssl dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files for production dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and config (needed for migrations)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy built application (dist/ includes generated prisma client)
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
