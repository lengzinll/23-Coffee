# ----- Stage 1: Dependencies -----
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ----- Stage 2: Builder -----
FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment for the build
RUN bun run build

# ----- Stage 3: Runner -----
FROM oven/bun:1.3 AS runner
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

CMD ["bun", "next", "start"]
