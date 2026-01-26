import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import './Library.css'
import BookShelf from '../components/BookShelf'
import { books } from '../data/books'

export default function Library() {
  const [selectedBook, setSelectedBook] = useState<number | null>(null)

  return (
    <div className="library-fullscreen-wrapper">
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 60 }}
        shadows
      >
        <BookShelf selectedBook={selectedBook} onSelectBook={setSelectedBook} />
      </Canvas>
      
      <a href="/" className="library-back-home">
        <span className="back-arrow">←</span> Back to Home
      </a>
      
      {selectedBook === null ? (
        <div className="library-help">
          <p>✨ Click any book to view details • Use mouse to rotate and zoom ✨</p>
        </div>
      ) : (
        <div className="library-help library-help-reading">
          <p>📖 Reading: <strong>{books[selectedBook].title}</strong> • Click outside to close</p>
        </div>
      )}
    </div>
  )
}
