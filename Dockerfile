# Dockerfile

# ---------- Этап 1: сборка ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем манифесты и ставим зависимости
COPY package.json package-lock.json ./
RUN npm ci

# Копируем весь проект и собираем
COPY . .
RUN npm run build

# ---------- Этап 2: запуск ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Создаём непривилегированного пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Копируем standalone-сборку и статику
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
