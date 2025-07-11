# Etapa 1: build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

# Etapa 2: producción
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV PORT 4010

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 4010

CMD ["npm", "start"]
