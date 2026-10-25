# Static frontend for the shared VPS. The image holds only the Vite build in /build;
# nothing runs it. The VPS deploy copies /build out (docker create + docker cp) and
# Caddy serves it. The build values are public: they ship in the bundle.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_AUTH0_DOMAIN
ARG REACT_APP_AUTH0_CLIENT_ID
RUN test -n "$REACT_APP_BACKEND_URL" && test -n "$REACT_APP_AUTH0_DOMAIN" && test -n "$REACT_APP_AUTH0_CLIENT_ID" \
 && REACT_APP_BACKEND_URL="$REACT_APP_BACKEND_URL" REACT_APP_AUTH0_DOMAIN="$REACT_APP_AUTH0_DOMAIN" \
    REACT_APP_AUTH0_CLIENT_ID="$REACT_APP_AUTH0_CLIENT_ID" npm run build

FROM scratch
COPY --from=build /app/build /build
