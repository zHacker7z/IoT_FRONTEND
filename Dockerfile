# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copia primeiro os manifests para aproveitar o cache de camadas do npm ci.
COPY package.json package-lock.json ./
RUN npm ci

# As variáveis VITE_* são embutidas no bundle em tempo de build: o Vite lê
# process.env e grava os valores no JavaScript gerado. Por isso precisam
# existir antes de `npm run build`.
ARG VITE_API_BASE_URL=""
ARG VITE_API_LATEST_PATH=""
ARG VITE_API_HISTORY_PATH=""
ARG VITE_API_TIMEOUT_MS=""
ARG VITE_REFRESH_INTERVAL_SECONDS=""
ARG VITE_STALE_AFTER_MINUTES=""
ARG VITE_API_FIELD_TEMPERATURE=""
ARG VITE_API_FIELD_HUMIDITY=""
ARG VITE_API_FIELD_TIMESTAMP=""

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_API_LATEST_PATH=${VITE_API_LATEST_PATH} \
    VITE_API_HISTORY_PATH=${VITE_API_HISTORY_PATH} \
    VITE_API_TIMEOUT_MS=${VITE_API_TIMEOUT_MS} \
    VITE_REFRESH_INTERVAL_SECONDS=${VITE_REFRESH_INTERVAL_SECONDS} \
    VITE_STALE_AFTER_MINUTES=${VITE_STALE_AFTER_MINUTES} \
    VITE_API_FIELD_TEMPERATURE=${VITE_API_FIELD_TEMPERATURE} \
    VITE_API_FIELD_HUMIDITY=${VITE_API_FIELD_HUMIDITY} \
    VITE_API_FIELD_TIMESTAMP=${VITE_API_FIELD_TIMESTAMP}

COPY . .

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
