FROM node:20-alpine

WORKDIR /app

# Install production dependencies separately for Docker build cache optimization
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source code
COPY . .

# Set up writable data permissions for non-root user
RUN chown -R node:node /app/data

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Run as non-privileged user
USER node

# Expose HTTP port
EXPOSE 3000

CMD ["node", "server.js"]
