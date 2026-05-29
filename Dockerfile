FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && \
    npm run build && \
    npm ci --production --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 hws && \
    adduser --system --uid 1001 hws
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
RUN mkdir -p /app/uploads && chown -R hws:hws /app
USER hws
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
