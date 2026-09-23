FROM node:22.23.2-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:node

FROM build AS verify
RUN npm run typecheck \
    && npm run test:sqlite \
    && npm run test:media \
    && TEST_ORIGIN=http://127.0.0.1:8082 npm run test:integration:node

FROM node:22.23.2-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8082 \
    DATABASE_PATH=/data/mvp.sqlite \
    MEDIA_PATH=/data/uploads \
    SEED_SAMPLE_EVENTS=false \
    TEMP_LOGIN_ENABLED=false \
    SKIP_PAY_DEV=false

WORKDIR /app
COPY --from=build /app/dist/standalone/ ./
COPY --from=build /app/scripts/migrate-node.mjs ./scripts/migrate-node.mjs
COPY --from=build /app/drizzle/ ./drizzle/
COPY deploy/docker-entrypoint.sh /usr/local/bin/mvp-entrypoint

# Docker populates a fresh named volume with this directory's ownership.
RUN mkdir -p /data/uploads \
    && chown -R node:node /data \
    && chmod 700 /data /data/uploads \
    && chmod 755 /usr/local/bin/mvp-entrypoint

USER node
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/api/health`, { signal: AbortSignal.timeout(4000) }).then(response => process.exit(response.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/mvp-entrypoint"]
CMD ["node", "server.js"]
