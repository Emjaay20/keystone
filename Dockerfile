# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package configurations for caching
COPY package*.json ./
COPY packages/domain/package*.json ./packages/domain/
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy the rest of the monorepo source code
COPY . .

# Build the domain package and Next.js web app
RUN npm run build -w @keystone/domain
RUN cd apps/web && npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start", "-w", "web"]
