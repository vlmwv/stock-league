# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install with legacy-peer-deps
RUN npm install --legacy-peer-deps

# Copy the rest
COPY . .

# Build Nuxt
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy output from builder
COPY --from=builder /app/.output ./.output

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
