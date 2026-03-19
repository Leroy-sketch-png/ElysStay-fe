# ── Dependencies ──────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build ─────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These vars are baked into the client bundle at build time.
# Override via docker build --build-arg or compose.
ARG NEXT_PUBLIC_API_URL=http://localhost:8081
ARG NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
ARG NEXT_PUBLIC_KEYCLOAK_REALM=elysstay
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=elysstay-fe

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID

RUN npm run build

# ── Runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Standalone output from Next.js
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

USER appuser

ENTRYPOINT ["node", "server.js"]
