import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Mesh } from 'three'
import Layout from '../components/Layout'
import './Movies.css'

// Mock movie data
const movies = [
  { title: 'The Shawshank Redemption', year: '1994', color: '#2c3e50' },
  { title: 'The Godfather', year: '1972', color: '#8b0000' },
  { title: 'Pulp Fiction', year: '1994', color: '#f39c12' },
  { title: 'Forrest Gump', year: '1994', color: '#3498db' },
  { title: 'The Matrix', year: '1999', color: '#27ae60' },
  { title: 'Goodfellas', year: '1990', color: '#c0392b' },
  { title: 'Fight Club', year: '1999', color: '#e74c3c' },
  { title: 'Inception', year: '2010', color: '#34495e' },
]

function VHSCassette({ position, color, title }: { position: [number, number, number]; color: string; title: string }) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        {/* VHS cassette body */}
        <boxGeometry args={[1.2, 0.8, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Label on cassette */}
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[1.0, 0.5, 0.01]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      <Text
        position={[0, 0, 0.09]}
        fontSize={0.06}
        color="black"
        maxWidth={0.9}
        textAlign="center"
      >
        {title}
      </Text>
    </group>
  )
}

function MovieShelf() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <spotLight position={[0, 10, 0]} angle={0.3} intensity={0.5} />

      {/* Background wall */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[15, 10]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Movie cassettes in a grid */}
      {movies.map((movie, index) => {
        const row = Math.floor(index / 4)
        const col = (index % 4) - 1.5
        return (
          <VHSCassette
            key={movie.title}
            position={[col * 1.5, 1 - row * 1.2, 0]}
            color={movie.color}
            title={movie.title}
          />
        )
      })}

      <OrbitControls enableZoom={true} enablePan={true} />
    </>
  )
}

export default function Movies() {
  return (
    <Layout showBackButton title="Movies">
      <div className="movies-container">
        <div className="canvas-container">
          <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
            <MovieShelf />
          </Canvas>
        </div>
        
        <div className="movies-info">
          <h2>📼 VHS Collection</h2>
          <p>Browse your classic movie cassettes</p>
          <ul className="movie-list">
            {movies.map((movie) => (
              <li key={movie.title}>
                <strong>{movie.title}</strong>
                <span className="movie-year">({movie.year})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  )
}
