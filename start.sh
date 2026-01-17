#!/bin/sh
set -eu

echo "Starting deployment process..."

# Simple retry logic for database connection
echo "Running database migrations (will retry if DB not ready)..."
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "Migration attempt $attempt/$max_attempts..."
  
  if npx prisma migrate deploy 2>&1; then
    echo "Migrations completed successfully!"
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: Migration failed after $max_attempts attempts"
    exit 1
  fi
  
  echo "Migration failed, retrying in 3 seconds..."
  sleep 3
  attempt=$((attempt + 1))
done

# Start the application
echo "Starting server..."
exec npm run start
