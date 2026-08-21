/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Seule occurrence de l'adresse de l'API dans tout le projet.
//
// Le défaut vise `localhost` — la seule adresse qui ne se démode pas. Une IP de
// réseau local a déjà changé une fois sous ce fichier, et un défaut faux coûte
// plus qu'un défaut restrictif : l'application se lance, se connecte même, puis
// échoue partout sans dire pourquoi.
//
// `loadEnv` et non `process.env` : Vite ne verse **pas** les fichiers `.env`
// dans `process.env`. Lu par `process.env`, un `.env.local` était donc ignoré
// en silence et le proxy retombait sur `localhost:3000` — un ECONNREFUSED qui
// accuse le back alors que c'est le fichier qui n'était pas lu. Le préfixe vide
// charge la variable bien qu'elle serve ici au serveur de dev et non au client,
// et laisse la variable de shell l'emporter sur le fichier.
//
// Pour viser une API qui tourne ailleurs :
//   VITE_API_TARGET=http://192.168.86.219:3000 npm run dev
// ou dans `.env.local` (non versionné), `.env` pour `docker compose`.
//
// Derrière un hébergement qui monte l'API sous `/api` — l'instance en ligne —
// l'adresse porte ce préfixe : `https://<hôte>/api`. Le proxy retire `/api` de
// la requête, la cible le remet. Sans lui, `/api/home` tombe sur la réécriture
// SPA de l'hébergeur et renvoie `index.html` en 200 : du HTML là où le code
// attend du JSON.

export default defineConfig(({ mode }) => {
  const API = loadEnv(mode, process.cwd(), '').VITE_API_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // /api/home -> <API>/home. Le navigateur ne voit qu'une seule origine,
        // le cookie de session reste first-party et repart à chaque requête.
        '/api': {
          target: API,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // Les jaquettes recopiées sont servies par l'API elle-même.
        '/covers': {
          target: API,
          changeOrigin: true,
        },
      },
    },
    /**
     * Les tests ne visent pas la couverture : ils existent pour qu'un écran
     * cassé se **voie**. On monte donc les écrans pour de vrai, avec l'API
     * simulée au niveau du module `api/endpoints`, plutôt que de tester des
     * fonctions pures qui ne cassent jamais.
     *
     * `css: false` (défaut) : les modules CSS rendent des classes vides. Les
     * tests interrogent donc les rôles et les textes, jamais les classes — ce
     * qui est de toute façon la bonne façon de les écrire.
     */
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
