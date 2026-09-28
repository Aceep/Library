#!/usr/bin/env bash
# Construit l'image du NAS sans Journal, puis avec un faux Journal passé comme
# `livrer.yml` le passe (contexte nommé `journal`), et interroge nginx.
#
# `--no-cache` sur les deux constructions, et il n'est pas décoratif : mesuré le
# 28 septembre 2026, le cache de BuildKit confond l'étage vide `journal` et un
# contexte nommé — une construction sans contexte a rendu le Journal d'une
# construction précédente, et l'inverse un dossier vide.
set -euo pipefail
ici=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
nettoyer() { docker rm -f essai-nas-vide essai-nas-plein >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap nettoyer EXIT

mkdir -p "$tmp/journal/assets"
echo '<p>journal-temoin</p>' > "$tmp/journal/index.html"
echo 'sw' > "$tmp/journal/sw.js"
echo '{}' > "$tmp/journal/manifest.webmanifest"
echo 'x' > "$tmp/journal/assets/index-temoin.js"

docker buildx build -q --load --no-cache -f "$ici/Dockerfile.nas" -t essai-nas:vide "$ici" >/dev/null
docker buildx build -q --load --no-cache -f "$ici/Dockerfile.nas" --build-context journal="$tmp/journal" -t essai-nas:plein "$ici" >/dev/null
docker rm -f essai-nas-vide essai-nas-plein >/dev/null 2>&1 || true   # restes d'un essai interrompu
for t in vide plein; do docker run -d --name "essai-nas-$t" --add-host api:127.0.0.1 "essai-nas:$t" >/dev/null; done
# On attend que nginx réponde, pas une durée : une pause fixe court contre ce
# qu'elle attend (les scripts de /docker-entrypoint.d passent avant nginx) et
# rendrait la CI rouge loin de toute faute. Dix secondes au plus, puis les
# lignes ci-dessous disent ECHEC d'elles-mêmes.
for t in vide plein; do
  for _ in $(seq 50); do
    docker exec "essai-nas-$t" wget -q -O /dev/null http://127.0.0.1:8080/ 2>/dev/null && break
    sleep 0.2
  done
done

echec=0
# En-têtes et corps d'une adresse, lus de l'intérieur du conteneur.
lire() { docker exec "essai-nas-$1" sh -c "wget -S -q -O - 'http://127.0.0.1:8080$2' 2>&1" || true; }
exiger() {
  if lire "$1" "$2" | grep -qiF -- "$3"; then echo "ok    $4"; else echo "ECHEC $4"; echec=1; fi
}
refuser() {
  if lire "$1" "$2" | grep -qiF -- "$3"; then echo "ECHEC $4"; echec=1; else echo "ok    $4"; fi
}

exiger  plein /journal/annee/1950             'journal-temoin'                          'une adresse profonde du Journal sert son index.html'
exiger  plein /journal/annee/1950             'Cache-Control: no-cache'                 'index.html du Journal jamais mis en cache'
exiger  plein /journal/sw.js                  'Cache-Control: no-cache'                 'sw.js jamais mis en cache'
exiger  plein /journal/manifest.webmanifest   'Content-Type: application/manifest+json' 'le manifeste porte son type'
exiger  plein /journal/manifest.webmanifest   'Cache-Control: no-cache'                 'le manifeste jamais mis en cache'
exiger  plein /journal/assets/index-temoin.js 'public, immutable'                       'les fichiers a empreinte en cache long'
exiger  plein /journal                        'Location: /journal/'                     '/journal redirige vers /journal/ sans nom ni port'
refuser plein /                               'journal-temoin'                          'la racine reste la SPA de Library'
refuser vide  /journal/annee/1950             'id="root"'                               'sans Journal, /journal/ ne sert pas la SPA de Library'
exiger  vide  /journal/annee/1950             'HTTP/1.1 404'                            'sans Journal, une adresse du Journal repond 404'
exit $echec
