import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * Build « bibliothèque » réservé à design-sync.
 *
 * Il ne remplace pas `npm run build` (qui produit l'application) : il compile
 * les mêmes composants en un module ES, avec les modules CSS résolus par la
 * chaîne d'outils du dépôt. C'est ce que le convertisseur consomme — jamais
 * une réécriture, toujours le code réellement livré.
 */
export default defineConfig({
  root: repoRoot,
  plugins: [react()],
  build: {
    outDir: `${here}.cache/dist-ds`,
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: `${here}ds-entry.tsx`,
      formats: ['es'],
      fileName: () => 'ds-entry.es.js',
    },
    rollupOptions: {
      // React vient du runtime des aperçus (`_vendor/`) : le laisser dans le
      // bundle donnerait deux instances et casserait les hooks.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
})
