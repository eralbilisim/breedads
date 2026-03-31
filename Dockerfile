FROM node:20-alpine AS base

# Install dependencies for sharp
RUN apk add --no-cache vips-dev build-base python3

WORKDIR /app

# Copy root package files
COPY package.json ./

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
FROM node:20-alpine AS production

RUN apk add --no-cache vips

WORKDIR /app

# Copy server with node_modules
COPY --from=base /app/server ./server
COPY --from=base /app/client/dist ./client/dist
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run migrations and start server
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node index.js"]
