FROM node:20-alpine

WORKDIR /app

# Install system dependencies required for Sharp and other image processing
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev \
    postgresql-client

# Create directories
RUN mkdir -p /app/storage/images && chmod 777 /app/storage/images && \
    mkdir -p /app/scripts

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create init-db script
RUN echo '#!/bin/bash\n\
# Wait for PostgreSQL to be ready\n\
echo "Waiting for PostgreSQL to be ready..."\n\
while ! pg_isready -h postgres -U simmer -d simmer; do\n\
    sleep 1\n\
done\n\
\n\
# Run migrations\n\
echo "Running database migrations..."\n\
npx knex migrate:latest\n\
\n\
echo "Database initialization complete!"' > /app/scripts/init-db.sh && \
    chmod +x /app/scripts/init-db.sh

# Expose API port
EXPOSE 3000

# Start the API server with database initialization
CMD ["sh", "-c", "/app/scripts/init-db.sh && npm start"]
