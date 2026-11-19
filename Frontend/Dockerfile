# ==============================================================================
# Stage 1: Build Vue 3 + Vite PWA Frontend
# ==============================================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relative /api keeps API traffic same-origin behind the Nginx gateway;
# __RUNTIME_WS_BASE_URL__ is substituted cleanly at container startup.
ENV VITE_API_BASE_URL=/api
ENV VITE_WS_BASE_URL=__RUNTIME_WS_BASE_URL__

RUN npm run build

# ==============================================================================
# Stage 2: Hardened Unprivileged Nginx Gateway & SPA Host
# ==============================================================================
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf.template /opt/nginx/default.conf.template
COPY nginx/entrypoint.sh /docker-entrypoint.d/20-runtime-config.sh

RUN sed -i 's/\r$//' /docker-entrypoint.d/20-runtime-config.sh /opt/nginx/default.conf.template /etc/nginx/snippets/security-headers.conf \
    && chmod +x /docker-entrypoint.d/20-runtime-config.sh \
    && chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/snippets /opt/nginx

USER 101

EXPOSE 8080
