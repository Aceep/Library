# Vercel — déploiement suspendu

Vercel est branché sur ce dépôt via l'application GitHub, sans qu'aucun fichier
ne l'ait indiqué : c'est pourquoi il est resté invisible longtemps. Il
déployait une **Production à chaque fusion sur `main`** et une Preview à chaque
proposition de fusion.

`vercel.json` coupe désormais ces déploiements automatiques
(`git.deploymentEnabled: false`).

## Pourquoi

Ce qui était publié ne pouvait pas fonctionner, pour deux raisons
indépendantes.

**L'API n'est pas joignable depuis Internet.** Elle tourne sur
`192.168.86.219`, une adresse RFC1918 : elle n'existe que sur le réseau local.
Les serveurs de Vercel ne l'atteindront jamais, quelle que soit la
configuration.

**Aucun proxy n'était configuré.** Le front appelle des chemins relatifs
(`/api/...`), et c'est structurel : le cookie de session est en
`SameSite=Lax`, un appel inter-domaines ferait réussir la connexion puis
répondre `401` partout. Sur Vercel, ces chemins tombaient sur le repli SPA —
donc sur du HTML au lieu de JSON.

Laisser tourner ce déploiement donnait une fausse impression de mise en
production.

## Pour réactiver

Deux choses, dans cet ordre. La seconde ne sert à rien sans la première.

**1. Exposer l'API sur une adresse publique en HTTPS.** Tunnel depuis la
machine qui l'héberge, ou hébergement en ligne. À noter : la machine actuelle
est un poste de travail qui s'endort — un `EHOSTUNREACH` a déjà interrompu une
session de développement.

**2. Rétablir les déploiements et ajouter les réécritures :**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<adresse-de-l-api>/:path*" },
    { "source": "/covers/:path*", "destination": "https://<adresse-de-l-api>/covers/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Trois points de vigilance sur ces réécritures :

- **Le préfixe `/api` doit disparaître.** Le proxy de développement le retire
  (`vite.config.ts`), l'API attend `/home`, pas `/api/home`. La forme
  `/api/:path*` → `.../:path*` ci-dessus le fait ; ne pas écrire
  `.../api/:path*`.
- **`/covers` garde son préfixe**, lui : l'API sert bien `/covers/...`.
- **Le repli SPA doit venir en dernier.** Placé avant, il avalerait les appels
  API.

Vérifier ensuite que le cookie de session revient bien : si la connexion
réussit puis que tout répond `401`, c'est que le proxy ne fonctionne pas et que
le navigateur est reparti en inter-domaines.
