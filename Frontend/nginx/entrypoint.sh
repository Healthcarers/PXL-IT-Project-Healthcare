#!/bin/sh
set -eu

# 1. Resolve WebSocket endpoint without requiring code edits in Frontend/src
if [ -z "${WS_BASE_URL:-}" ]; then
  if [ -n "${CONTAINER_APP_NAME:-}" ] && [ -n "${CONTAINER_APP_ENV_DNS_SUFFIX:-}" ]; then
    WS_BASE_URL="wss://${CONTAINER_APP_NAME}.${CONTAINER_APP_ENV_DNS_SUFFIX}/ws"
  else
    WS_BASE_URL="ws://localhost:8080/ws"
  fi
fi

# Inject runtime WebSocket URL into compiled JS bundles (idempotent)
for js_file in /usr/share/nginx/html/assets/*.js; do
  if [ -f "$js_file" ] && grep -q "__RUNTIME_WS_BASE_URL__" "$js_file"; then
    sed -i "s|__RUNTIME_WS_BASE_URL__|${WS_BASE_URL}|g" "$js_file"
  fi
done

# 2. Resolve upstream API URL and host header for internal Container App routing
export API_UPSTREAM="${API_UPSTREAM:-http://localhost:8090}"
export API_HOST="$(echo "$API_UPSTREAM" | sed -E 's|^https?://||; s|/.*$||')"

# 3. Extract IPv4 container DNS resolver from /etc/resolv.conf (works in Azure and Docker)
export RESOLVER_IP="${RESOLVER_IP:-$(awk '/^nameserver[ \t]+[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/{print $2; exit}' /etc/resolv.conf)}"
if [ -z "${RESOLVER_IP:-}" ]; then
  export RESOLVER_IP="168.63.129.16"
fi

# 4. Rate limiting defaults (overridable via Container App / Compose env vars)
export AUTH_RATE_LIMIT="${AUTH_RATE_LIMIT:-10r/s}"
export AUTH_BURST="${AUTH_BURST:-15}"
export API_RATE_LIMIT="${API_RATE_LIMIT:-300r/s}"
export API_BURST="${API_BURST:-600}"
export MAX_CONNS_PER_IP="${MAX_CONNS_PER_IP:-150}"

envsubst '${RESOLVER_IP} ${API_UPSTREAM} ${API_HOST} ${API_RATE_LIMIT} ${API_BURST} ${AUTH_RATE_LIMIT} ${AUTH_BURST} ${MAX_CONNS_PER_IP}' \
  < /opt/nginx/default.conf.template \
  > /etc/nginx/conf.d/default.conf
