import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Group } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { BookData } from '../data/books'

export function Book({ 
  position, 
  book, 
  isSelected,
  onClick 
}: { 
  position: [number, number, number]
  book: BookData
  isSelected: boolean
  onClick: () => void
}) {
  const groupRef = useRef<Group>(null)
  const coverRef = useRef<Group>(null)
  const page1Ref = useRef<Group>(null)
  const page2Ref = useRef<Group>(null)
  const page3Ref = useRef<Group>(null)
  const page4Ref = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((_state, delta) => {
    if (groupRef.current) {
      if (isSelected) {
        groupRef.current.position.x += (0 - groupRef.current.position.x) * delta * 2
        groupRef.current.position.y += (0 - groupRef.current.position.y) * delta * 2
        groupRef.current.position.z += (3 - groupRef.current.position.z) * delta * 2
        groupRef.current.scale.x += (2.5 - groupRef.current.scale.x) * delta * 2
        groupRef.current.scale.y += (2.5 - groupRef.current.scale.y) * delta * 2
        groupRef.current.scale.z += (2.5 - groupRef.current.scale.z) * delta * 2
      } else {
        groupRef.current.position.x += (position[0] - groupRef.current.position.x) * delta * 3
        groupRef.current.position.y += (position[1] - groupRef.current.position.y) * delta * 3
        groupRef.current.position.z += (position[2] - groupRef.current.position.z) * delta * 3
        groupRef.current.scale.x += (1 - groupRef.current.scale.x) * delta * 3
        groupRef.current.scale.y += (1 - groupRef.current.scale.y) * delta * 3
        groupRef.current.scale.z += (1 - groupRef.current.scale.z) * delta * 3
      }
    }
    if (coverRef.current) {
      const targetRotation = isSelected ? -Math.PI * 0.89 : 0
      coverRef.current.rotation.y += (targetRotation - coverRef.current.rotation.y) * delta * 3
    }
    if (page1Ref.current) {
      const targetRotation = isSelected ? -Math.PI * 0.83 : 0
      page1Ref.current.rotation.y += (targetRotation - page1Ref.current.rotation.y) * delta * 3
    }
    if (page2Ref.current) {
      const targetRotation = isSelected ? -Math.PI * 0.17 : 0
      page2Ref.current.rotation.y += (targetRotation - page2Ref.current.rotation.y) * delta * 3
    }
    if (page3Ref.current) {
      const targetRotation = isSelected ? -Math.PI * 0.78 : 0
      page3Ref.current.rotation.y += (targetRotation - page3Ref.current.rotation.y) * delta * 3
    }
    if (page4Ref.current) {
      const targetRotation = isSelected ? -Math.PI * 0.22 : 0
      page4Ref.current.rotation.y += (targetRotation - page4Ref.current.rotation.y) * delta * 3
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!isSelected) onClick()
  }

  return (
    <group 
      ref={groupRef} 
      position={position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {!isSelected && (
        <>
          <mesh castShadow>
            <boxGeometry args={[0.3, 1.2, 0.8]} />
            <meshStandardMaterial 
              color={hovered ? '#ffd700' : book.color}
              emissive={hovered ? '#ff6b35' : '#000000'}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>
          <Text
            position={[0, 0, 0.41]}
            fontSize={0.08}
            color="white"
            maxWidth={0.25}
            textAlign="center"
          >
            {book.title}
          </Text>
          {hovered && (
            <mesh position={[0.2, 0.6, 0.5]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
            </mesh>
          )}
        </>
      )}

      {isSelected && (
        <group rotation={[0, Math.PI / 2, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.02, 1.4, 1]} />
            <meshStandardMaterial color="#e0e1dc" roughness={0.8} />
          </mesh>

          <group ref={page4Ref} position={[0, 0, -0.5]}>
            <mesh position={[0, 0, 0.5]} castShadow>
              <boxGeometry args={[0.015, 1.4, 1]} />
              <meshStandardMaterial color="#fdfdfd" roughness={0.8} />
            </mesh>
            <group position={[0.02, 0, 0.5]}>
              <Text
                position={[0, 0.2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.04}
                color="#666666"
                maxWidth={0.85}
                textAlign="left"
                lineHeight={1.4}
                anchorX="center"
                anchorY="middle"
              >
                Chapter 1{"\n\n"}Lorem ipsum dolor sit amet...
              </Text>
            </group>
          </group>

          <group ref={page3Ref} position={[0, 0, -0.5]}>
            <mesh position={[0, 0, 0.5]} castShadow>
              <boxGeometry args={[0.015, 1.4, 1]} />
              <meshStandardMaterial color="#fafafa" roughness={0.8} />
            </mesh>
            <group position={[0.02, 0, 0.5]}>
              <Text
                position={[0, 0.2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.04}
                color="#666666"
                maxWidth={0.85}
                textAlign="left"
                lineHeight={1.4}
                anchorX="center"
                anchorY="middle"
              >
                "A wonderful story that captures the imagination..."
              </Text>
            </group>
          </group>

          <group ref={page2Ref} position={[0, 0, -0.5]}>
            <mesh position={[0, 0, 0.5]} castShadow>
              <boxGeometry args={[0.015, 1.4, 1]} />
              <meshStandardMaterial color="#f5f5f5" roughness={0.8} />
            </mesh>
            <group position={[0.02, 0, 0.5]}>
              <Text
                position={[0, 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.055}
                color="#333333"
                maxWidth={0.85}
                textAlign="left"
                lineHeight={1.3}
                anchorX="center"
                anchorY="middle"
              >
                {book.description}
              </Text>
              <Text
                position={[0, -0.5, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.045}
                color="#999999"
                maxWidth={0.85}
                textAlign="center"
                anchorX="center"
                anchorY="middle"
              >
                Click to close
              </Text>
            </group>
          </group>

          <group ref={page1Ref} position={[0, 0, -0.5]}>
            <mesh position={[0, 0, 0.5]} castShadow>
              <boxGeometry args={[0.015, 1.4, 1]} />
              <meshStandardMaterial color="#efefef" roughness={0.8} />
            </mesh>
            <group position={[0.02, 0, 0.5]}>
              <Text
                position={[0, 0.4, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.08}
                color="#000000"
                maxWidth={0.8}
                textAlign="center"
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
              >
                {book.title}
              </Text>
              <Text
                position={[0, 0.25, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.06}
                color="#333333"
                maxWidth={0.8}
                textAlign="center"
                anchorX="center"
                anchorY="middle"
              >
                by {book.author}
              </Text>
              <Text
                position={[0, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.05}
                color="#666666"
                maxWidth={0.85}
                textAlign="left"
                lineHeight={1.2}
                anchorX="center"
                anchorY="middle"
              >
                {`Genre: ${book.genre}\nYear: ${book.year}\nPages: ${book.pages}`}
              </Text>
            </group>
          </group>

          <group ref={coverRef} position={[0, 0, -0.5]}>
            <mesh 
              position={[0, 0, 0.5]}
              castShadow
            >
              <boxGeometry args={[0.02, 1.4, 1]} />
              <meshStandardMaterial 
                color={book.color}
                emissive={book.color}
                emissiveIntensity={0.3}
                roughness={0.6}
              />
            </mesh>
            <group position={[0, 0, 0.5]}>
              <Text
                position={[0.03, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.12}
                color="white"
                maxWidth={0.8}
                textAlign="center"
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
              >
                {book.title}
              </Text>
            </group>
          </group>

          <mesh position={[-0.1, 0.8, 0.6]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#4af" transparent opacity={0.7} />
          </mesh>
          <mesh position={[-0.1, 0.8, -0.6]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#f4a" transparent opacity={0.7} />
          </mesh>
          <mesh position={[-0.1, -0.8, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#fa4" transparent opacity={0.7} />
          </mesh>
        </group>
      )}
    </group>
  )
}

export function Shelf({ yPosition }: { yPosition: number }) {
  return (
    <mesh position={[0, yPosition, 0]}>
      <boxGeometry args={[8, 0.1, 1]} />
      <meshStandardMaterial color="#8b4513" />
    </mesh>
  )
}
