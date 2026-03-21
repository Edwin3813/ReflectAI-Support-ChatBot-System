FROM node:22-alpine

WORKDIR /app

# Production mode
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Expose API port
EXPOSE 5000

# Start app with migration
CMD ["sh", "-c", "node ./scripts/migrate.js && node src/app.js"]