import React from 'react'
import { OrbitControls } from '@react-three/drei'
import { Book, Shelf } from './LibraryBook'
import { books } from '../data/books'

export default function BookShelf({ selectedBook, onSelectBook }: { selectedBook: number | null; onSelectBook: (index: number | null) => void }) {
  return (
    <>
      {selectedBook !== null && (
        <mesh 
          position={[0, 0, -2]} 
          onClick={() => onSelectBook(null)}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight position={[0, 5, 5]} angle={0.5} intensity={0.8} castShadow />

      <Shelf yPosition={-2} />
      <Shelf yPosition={0} />
      <Shelf yPosition={2} />

      {books.map((book, index) => {
        const booksPerShelf = 4
        const shelfLevel = Math.floor(index / booksPerShelf)
        const positionOnShelf = (index % booksPerShelf) - (booksPerShelf - 1) / 2
        return (
          <Book
            key={book.title}
            position={[positionOnShelf * 1.5, -2 + shelfLevel * 2 + 0.65, 0]}
            book={book}
            isSelected={selectedBook === index}
            onClick={() => onSelectBook(selectedBook === index ? null : index)}
          />
        )
      })}

      <OrbitControls 
        enableZoom={selectedBook === null} 
        enablePan={selectedBook === null}
        enableRotate={selectedBook === null}
      />
    </>
  )
}
