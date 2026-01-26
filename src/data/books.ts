export interface BookData {
  title: string
  author: string
  color: string
  year: number
  pages: number
  genre: string
  description: string
}

export const books: BookData[] = [
  { 
    title: 'The Great Gatsby', 
    author: 'F. Scott Fitzgerald', 
    color: '#c74440',
    year: 1925,
    pages: 180,
    genre: 'Classic Fiction',
    description: 'A story of decadence and excess in the Jazz Age.'
  },
  { 
    title: '1984', 
    author: 'George Orwell', 
    color: '#2c3e50',
    year: 1949,
    pages: 328,
    genre: 'Dystopian Fiction',
    description: 'A chilling vision of totalitarian control.'
  },
  { 
    title: 'To Kill a Mockingbird', 
    author: 'Harper Lee', 
    color: '#8b4513',
    year: 1960,
    pages: 281,
    genre: 'Southern Gothic',
    description: 'A story of racial injustice and childhood innocence.'
  },
  { 
    title: 'Pride and Prejudice', 
    author: 'Jane Austen', 
    color: '#d4af37',
    year: 1813,
    pages: 432,
    genre: 'Romance',
    description: 'A timeless tale of love and social class.'
  },
  { 
    title: 'The Catcher in the Rye', 
    author: 'J.D. Salinger', 
    color: '#4a90e2',
    year: 1951,
    pages: 234,
    genre: 'Coming-of-age',
    description: 'A rebellious teenager\'s journey through New York.'
  },
  { 
    title: 'Lord of the Flies', 
    author: 'William Golding', 
    color: '#556b2f', 
    year: 1954,
    pages: 224,
    genre: 'Allegorical',
    description: 'A group of boys descend into savagery on an island.'
  },
  { 
    title: 'Animal Farm', 
    author: 'George Orwell', 
    color: '#cd5c5c',
    year: 1945,
    pages: 112,
    genre: 'Political Satire',
    description: 'A farm rebellion mirrors political revolution.'
  },
  { 
    title: 'Brave New World', 
    author: 'Aldous Huxley', 
    color: '#708090', 
    year: 1932,
    pages: 268,
    genre: 'Science Fiction',
    description: 'A society engineered for happiness and stability.'
  },
]
