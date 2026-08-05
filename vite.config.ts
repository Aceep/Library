/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Seule occurrence de l'adresse de l'API dans tout le projet.
//
// Le défaut vise `localhost` — la seule adresse qui ne se démode pas. Une IP de
// réseau local a déjà changé une fois sous ce fichier, et un défaut faux coûte
// plus qu'un défaut restrictif : l'application se lance, se connecte même, puis
// échoue partout sans dire pourquoi.
//
// Pour viser une API qui tourne sur une autre machine :
//   VITE_API_TARGET=http://192.168.86.219:3000 npm run dev
// ou en le posant une fois pour toutes dans `.env.local` (non versionné).
const API = process.env.VITE_API_TARGET ?? 'http://localhost:3000'

export default defineConfig({
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
})
