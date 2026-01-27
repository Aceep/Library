import Layout from '../components/Layout'
import Card from '../components/Card'
import './Home.css'

export default function Home() {
  return (
    <Layout>
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">Personal Library</h1>
          <p className="home-subtitle">Choose your collection</p>
        </header>
        
        <div className="cards-grid">
          <Card
            title="Library"
            description="Browse your book collection on virtual shelves"
            to="/library"
            icon="📚"
            color="#4a90e2"
          />
          
          <Card
            title="Movies"
            description="Explore your VHS cassette collection"
            to="/movies"
            icon="📼"
            color="#e74c3c"
          />
          
          <Card
            title="Quests"
            description="Track your fantasy adventures"
            to="/quests"
            icon="⚔️"
            color="#9b59b6"
          />
          
          <Card
            title="Music History"
            description="Dive into your vinyl collection"
            to="/music"
            icon="🎵"
            color="#2ecc71"
          />
        </div>
      </div>
    </Layout>
  )
}
