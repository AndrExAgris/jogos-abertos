# Etapa 1: build do app web com Node e pnpm.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/contrato/package.json packages/contrato/
COPY packages/ui/package.json packages/ui/
COPY packages/nucleo-grade/package.json packages/nucleo-grade/
COPY tools/icones/package.json tools/icones/
RUN pnpm install --frozen-lockfile --filter @ja/web...
COPY apps/web apps/web
COPY packages packages
RUN pnpm --filter @ja/web build

# Etapa 2: só os arquivos estáticos, servidos pelo nginx.
FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
