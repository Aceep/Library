import Layout from '../components/Layout'
import './MusicHistory.css'

// Mock vinyl record data
const records = [
  { 
    title: 'Abbey Road', 
    artist: 'The Beatles', 
    year: 1969,
    genre: 'Rock',
    color: '#2c3e50'
  },
  { 
    title: 'The Dark Side of the Moon', 
    artist: 'Pink Floyd', 
    year: 1973,
    genre: 'Progressive Rock',
    color: '#34495e'
  },
  { 
    title: 'Thriller', 
    artist: 'Michael Jackson', 
    year: 1982,
    genre: 'Pop',
    color: '#e74c3c'
  },
  { 
    title: 'Back in Black', 
    artist: 'AC/DC', 
    year: 1980,
    genre: 'Hard Rock',
    color: '#1a1a1a'
  },
  { 
    title: 'Rumours', 
    artist: 'Fleetwood Mac', 
    year: 1977,
    genre: 'Rock',
    color: '#95a5a6'
  },
  { 
    title: 'Led Zeppelin IV', 
    artist: 'Led Zeppelin', 
    year: 1971,
    genre: 'Hard Rock',
    color: '#8b7355'
  },
  { 
    title: 'Kind of Blue', 
    artist: 'Miles Davis', 
    year: 1959,
    genre: 'Jazz',
    color: '#3498db'
  },
  { 
    title: 'The Wall', 
    artist: 'Pink Floyd', 
    year: 1979,
    genre: 'Progressive Rock',
    color: '#c0392b'
  },
]

export default function MusicHistory() {
  return (
    <Layout showBackButton title="Music History">
      <div className="music-container">
        <div className="music-header">
          <h2>🎵 Vinyl Collection</h2>
          <p>Your classic record collection</p>
        </div>

        <div className="vinyl-collection">
          {records.map((record, index) => (
            <div key={index} className="vinyl-card">
              <div className="vinyl-record" style={{ background: record.color }}>
                <div className="vinyl-center"></div>
                <div className="vinyl-grooves"></div>
              </div>
              
              <div className="vinyl-info">
                <h3 className="vinyl-title">{record.title}</h3>
                <p className="vinyl-artist">{record.artist}</p>
                <div className="vinyl-meta">
                  <span className="vinyl-year">{record.year}</span>
                  <span className="vinyl-genre">{record.genre}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
