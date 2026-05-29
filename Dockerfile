# ============================================
# Stage 1: Build Frontend (Vite + React)
# ============================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx vite build

# ============================================
# Stage 2: Bundle Server (Express + esbuild)
# ============================================
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY server.ts ./
RUN mkdir -p dist && npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:22-alpine
RUN apk add --no-cache tini wget
WORKDIR /app

# Copy frontend build (dist/ has index.html + assets/)
COPY --from=frontend-builder /app/dist ./dist

# Copy server bundle (dist/server.cjs)
COPY --from=server-builder /app/dist/server.cjs ./dist/server.cjs
COPY --from=server-builder /app/dist/server.cjs.map ./dist/server.cjs.map

# Install production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Create non-root user
RUN addgroup -S hws && adduser -S hws -G hws

EXPOSE 3000
USER hws
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.cjs"]
