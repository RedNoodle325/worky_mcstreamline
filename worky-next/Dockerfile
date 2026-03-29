FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set dummy env vars for build (real ones injected at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://placeholder
ENV JWT_SECRET=placeholder
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder

RUN npm run build

# ─── Runtime ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
