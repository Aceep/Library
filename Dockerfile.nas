# Le front de l'instance hébergée : la même construction, une autre
# configuration de serveur.
#
# `Dockerfile` sert un front statique sans relais — un usage qui reste valable,
# et qu'on ne casse pas. Celui-ci embarque `nginx.nas.conf`, qui relaie `/api`
# et `/covers` vers l'API du même réseau Compose, ce qui met le front et l'API
# sous une seule origine.

# Le Journal (dépôt biblio-journal), déjà construit. Vide par défaut : construite
# seule, l'image est celle d'avant, avec un /journal/ vide. `livrer.yml` (dépôt
# de l'API) remplace cet étage par le `dist/` du Journal, contexte nommé
# `journal` de `docker/build-push-action`.
FROM scratch AS journal

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --engine-strict --no-audit --no-fund
COPY . .
# Aucune variable de construction : le front appelle `/api` en relatif, et ne
# sait donc rien de l'adresse où il sera servi. C'est ce qui permet de changer
# de nom d'hôte sans reconstruire.
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=journal / /usr/share/nginx/html/journal/
COPY nginx.nas.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
