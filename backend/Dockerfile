# Build stage
FROM node:18-slim AS builder

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ .
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4001

CMD ["node", "dist/app.js"]
