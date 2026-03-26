# ----- Stage 1: Dependencies -----
FROM oven/bun:latest AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ----- Stage 2: Builder -----
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment for the build
ENV NODE_ENV=production
RUN bun run build

# ----- Stage 3: Runner -----
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment if you want to skip telemetry
# ENV NEXT_TELEMETRY_DISABLED 1

# Copy only necessary files from builder
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
# Copy sqlite database if it exists
COPY --from=builder /app/sqlite.db ./sqlite.db 

EXPOSE 3000

CMD ["bun", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
