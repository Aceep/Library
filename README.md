# Personal Library - React TypeScript SPA

A full-featured single-page application with password protection, routing, and 3D visualizations for managing personal collections.

## Features

- 🔒 **Password Protection** - Secure login page (default password: `library2026`)
- 🎨 **4 Collection Types**:
  - 📚 **Library** - 3D bookshelf with rotating books
  - 📼 **Movies** - VHS cassette collection with 3D visualization
  - ⚔️ **Quests** - Fantasy pixel art quest tracker
  - 🎵 **Music History** - Vinyl record collection
- 🎭 **3D Animations** - Interactive Three.js/React Three Fiber scenes
- 🧩 **Component Architecture** - Maintainable, independent page structure
- ✅ **ESLint** - Code quality and consistency
- 🎯 **TypeScript** - Full type safety

## Project Structure

```
src/
├── components/           # Shared reusable components
│   ├── Layout.tsx       # Page layout wrapper
│   ├── Layout.css
│   ├── Card.tsx         # Home page cards
│   ├── Card.css
│   └── ProtectedRoute.tsx  # Auth guard
├── pages/               # Independent page components
│   ├── Login.tsx        # Password entry
│   ├── Login.css
│   ├── Home.tsx         # Landing with 4 cards
│   ├── Home.css
│   ├── Library.tsx      # 3D bookshelf
│   ├── Library.css
│   ├── Movies.tsx       # 3D VHS cassettes
│   ├── Movies.css
│   ├── Quests.tsx       # Quest tracker
│   ├── Quests.css
│   ├── MusicHistory.tsx # Vinyl records
│   └── MusicHistory.css
├── App.tsx              # Router & route definitions
├── main.tsx             # App entry point
└── index.css            # Global styles & CSS variables
```

## Development

### Local (with Docker - recommended)

```bash
# Start dev server
docker run -d --name spa-dev -p 5173:5173 \
  -v "$PWD":/app -w /app node:18-bullseye-slim \
  bash -c "npm install && npm run dev -- --host 0.0.0.0 --port 5173"

# View logs
docker logs -f spa-dev

# Stop
docker stop spa-dev && docker rm spa-dev
```

### Local (without Docker)

Requires Node.js 18+

```bash
npm install
npm run dev
```

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

## Production

### Build and run Docker image

```bash
docker build -t react-ts-spa .
docker run -d -p 8080:80 --name react-ts-spa react-ts-spa
```

Visit: http://localhost:8080

### Build locally

```bash
npm run build     # Creates dist/ folder
npm run preview   # Preview production build
```

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** - Client-side routing
- **React Three Fiber** - 3D rendering (Three.js wrapper)
- **@react-three/drei** - Three.js helpers
- **ESLint** - Code linting

## Authentication

Simple session-based auth using `sessionStorage`. Change the password in [src/pages/Login.tsx](src/pages/Login.tsx):

```typescript
const CORRECT_PASSWORD = 'library2026' // Change this
```

## Customization

### Adding New Collections

1. Create `src/pages/YourPage.tsx` and `src/pages/YourPage.css`
2. Add route in [src/App.tsx](src/App.tsx):
   ```tsx
   <Route path="/yourpage" element={<ProtectedRoute><YourPage /></ProtectedRoute>} />
   ```
3. Add card in [src/pages/Home.tsx](src/pages/Home.tsx)

### Styling

All colors are CSS variables in [src/index.css](src/index.css). Modify the `:root` section:

```css
:root {
  --primary-color: #4a90e2;
  --bg-color: #0f1419;
  /* ... */
}
```

## License

Private project - all rights reserved.
