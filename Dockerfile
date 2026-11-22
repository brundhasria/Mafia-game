FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package declarations
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install

# Copy source code
COPY . .

# Build all packages (shared, server, client)
RUN npm run build

# Prune dev dependencies for production image
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["npm", "start"]
