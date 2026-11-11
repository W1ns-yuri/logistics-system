# Сервер API. Собирается из папки server/ (см. deploy/docker-compose.yml)
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle
# Не от root: если в сервере найдут дыру, у атакующего не будет прав на контейнер
USER node
EXPOSE 3000
# При каждом запуске сначала применяем новые миграции базы, потом стартуем
CMD ["sh", "-c", "node --import tsx src/db/migrate.ts && node --import tsx src/server.ts"]
