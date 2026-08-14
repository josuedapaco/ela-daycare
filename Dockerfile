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

COPY server.js admin.html ./
COPY --from=build /app/dist ./dist

# Cupos persistentes: monta un volumen aquí (EasyPanel → Volumes → /app/data),
# si no se reinician a los valores por defecto en cada deploy.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=82
ENV DATA_DIR=/app/data
EXPOSE 82

CMD ["node", "server.js"]
