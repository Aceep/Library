import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Seule occurrence de l'adresse de l'API dans tout le projet.
// Surchargeable : VITE_API_TARGET=http://localhost:3000 npm run dev
const API = process.env.VITE_API_TARGET ?? 'http://192.168.86.219:3000'

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
})
