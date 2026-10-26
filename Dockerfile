# Đua Vịt Peti (duavit.peti.vn) — production image.
# Node 24 (node:sqlite built in), production deps only, runs as the unprivileged "node" user.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/duavit.sqlite
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY shared ./shared
COPY public ./public
# SQLite lives in a volume; optional per-map mp3s are mounted into public/music.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz > /dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "src/index.js"]
