FROM node:20-bookworm-slim AS base

# Install OpenSSL + build deps for sharp and Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    libvips-dev \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/

# Copy client package files
COPY client/package.json ./client/

# Install all dependencies
RUN cd server && npm install && npx prisma generate
RUN cd client && npm install

# Copy all source code
COPY . .

# Build the client
RUN cd client && npm run build

# Production stage
FROM node:20-bookworm-slim AS production

RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server with node_modules
COPY --from=base /app/server ./server
COPY --from=base /app/client/dist ./client/dist
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node index.js"]
