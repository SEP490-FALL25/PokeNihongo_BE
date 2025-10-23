#!/bin/sh

set -e

echo "=== Starting container entrypoint ==="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    echo "Please make sure DATABASE_URL is passed as environment variable to the container"
    exit 1
fi

echo "Database URL found: ${DATABASE_URL:0:20}..." # Only show first 20 chars for security

# Chạy lệnh migrate deploy để cập nhật database
echo "Running Prisma migrations..."
if npx prisma migrate deploy; then
    echo "Prisma migrations completed successfully!"
else
    echo "ERROR: Prisma migrations failed!"
    exit 1
fi

# After migrations, run the CMD from Dockerfile (i.e., "node dist/main.js")
echo "Starting application..."
exec "$@"