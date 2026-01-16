#!/usr/bin/env bash
set -euo pipefail

# Deploy migrations before booting the API
npx prisma migrate deploy

# Launch the compiled server
npm run start
