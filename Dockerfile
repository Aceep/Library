# build stage
# Node 24, comme `.nvmrc`, `engines` et la CI. L'image restait sur 18 : le build
# y passait encore, et c'est bien le problème — ce qui en sortait n'était plus
# ce que la CI avait vérifié, sans que rien ne le signale.
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# `ci --engine-strict`, comme en CI : installe exactement le lockfile au lieu de
# le réécrire, et refuse un Node hors de `engines` à l'installation plutôt que
# de laisser la casse arriver à l'exécution, loin de sa cause.
RUN npm ci --engine-strict --no-audit --no-fund
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
