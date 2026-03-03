# Lightweight Node runtime
FROM node:22-alpine

LABEL maintainer="madara27495@gmail.com" \
      version="1.2.0" \
      description="Lightweight API testing CLI — curl with a brain"

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Optional: tests are NOT copied
# test/ is intentionally excluded

# Make CLI executable
RUN chmod +x app.mjs

# CLI entry
ENTRYPOINT ["node", "/app/app.mjs"]
