# Multi-stage production build for SocietySync
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests and npm configuration
COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps

# Copy source files and build production assets
COPY . .
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json .npmrc* ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy compiled bundles and baseline data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.data ./.data
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3000

CMD ["node", "dist/server.js"]
