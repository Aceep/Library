import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Suppress known troika-three-text font warnings
const originalWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('unsupported GSUB')) {
    return
  }
  originalWarn.apply(console, args)
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
