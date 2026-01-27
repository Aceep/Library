import Layout from '../components/Layout'
import './Quests.css'

// Mock quest data
const quests = [
  { 
    name: 'The Dragon\'s Lair', 
    status: 'completed', 
    difficulty: 'Hard',
    reward: '1000 Gold, Dragon Scale Armor',
    creature: 'dragon'
  },
  { 
    name: 'Rescue the Lost Princess', 
    status: 'in-progress', 
    difficulty: 'Medium',
    reward: 'Royal Favor, Magic Sword',
    creature: 'knight'
  },
  { 
    name: 'Retrieve the Ancient Artifact', 
    status: 'completed', 
    difficulty: 'Hard',
    reward: 'Mystic Amulet',
    creature: 'skeleton'
  },
  { 
    name: 'Defeat the Goblin King', 
    status: 'completed', 
    difficulty: 'Easy',
    reward: '500 Gold, Goblin Crown',
    creature: 'goblin'
  },
  { 
    name: 'Explore the Forbidden Forest', 
    status: 'in-progress', 
    difficulty: 'Medium',
    reward: 'Rare Herbs, Forest Map',
    creature: 'treant'
  },
  { 
    name: 'Find the Lost City of Atlantis', 
    status: 'not-started', 
    difficulty: 'Legendary',
    reward: 'Trident of Power',
    creature: 'merman'
  },
  { 
    name: 'Slay the Ice Giant', 
    status: 'completed', 
    difficulty: 'Hard',
    reward: 'Frost Blade, 2000 Gold',
    creature: 'giant'
  },
  { 
    name: 'Solve the Wizard\'s Riddle', 
    status: 'in-progress', 
    difficulty: 'Medium',
    reward: 'Spell Tome',
    creature: 'wizard'
  },
]

const statusEmoji = {
  completed: '✅',
  'in-progress': '⏳',
  'not-started': '📋'
}

const difficultyColor = {
  Easy: '#2ecc71',
  Medium: '#f39c12',
  Hard: '#e74c3c',
  Legendary: '#9b59b6'
}

export default function Quests() {
  return (
    <Layout showBackButton title="Quests">
      <div className="quests-container">
        <div className="quests-header">
          <h2>⚔️ Fantasy Quest Log</h2>
          <p>Track your legendary adventures</p>
        </div>

        <div className="quests-grid">
          {quests.map((quest, index) => (
            <div key={index} className={`quest-card quest-${quest.status}`}>
              <div className={`pixel-creature pixel-creature-${quest.creature}`}></div>
              <div className="quest-header">
                <h3 className="quest-name">
                  {statusEmoji[quest.status as keyof typeof statusEmoji]} {quest.name}
                </h3>
                <span 
                  className="quest-difficulty"
                  style={{ 
                    background: difficultyColor[quest.difficulty as keyof typeof difficultyColor] 
                  }}
                >
                  {quest.difficulty}
                </span>
              </div>
              
              <div className="quest-status">
                Status: <strong>{quest.status.replace('-', ' ')}</strong>
              </div>
              
              <div className="quest-reward">
                <strong>Reward:</strong> {quest.reward}
              </div>
              
              <div className="quest-pixel-border"></div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
