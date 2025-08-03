FROM node:20-alpine

WORKDIR /app

# Install system dependencies required for Sharp and other image processing
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

# Create directories
RUN mkdir -p /app/storage/images && chmod 777 /app/storage/images

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose API port
EXPOSE 3000

# Start the API server directly (skip database init for Fargate)
CMD ["npm", "start"]