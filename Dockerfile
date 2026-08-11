FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY astro.config.mjs ./
COPY src ./src
COPY public ./public

RUN npm run build


FROM node:20-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=82
EXPOSE 82

CMD ["node", "server.js"]
