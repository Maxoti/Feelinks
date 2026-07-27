# ============================================================================
# Fees backend — NestJS + TypeORM
# Multi-stage build: install + compile in one stage, run with only
# production deps in a slim final image.
# ============================================================================

# ---- deps ------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build -------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Keep only production dependencies for the final image
RUN npm prune --omit=dev

# ---- runtime -----------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root user — avoids running the app as root inside the container
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

USER nodeusr

EXPOSE 3000

# Basic liveness check — adjust the path if you add a dedicated /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
