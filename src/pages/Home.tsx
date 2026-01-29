import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import './Home.css'
import { useChat, User } from '../hooks/useChat'

const collections = [
  { title: 'Library', description: 'Browse your book collection on virtual shelves', to: '/library', icon: '📚', color: '#4a90e2' },
  { title: 'Movies', description: 'Explore your VHS cassette collection', to: '/movies', icon: '📼', color: '#e74c3c' },
  { title: 'Quests', description: 'Track your fantasy adventures', to: '/quests', icon: '⚔️', color: '#9b59b6' },
  { title: 'Music History', description: 'Dive into your vinyl collection', to: '/music', icon: '🎵', color: '#2ecc71' },
]

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const currentUser: User = JSON.parse(sessionStorage.getItem('currentUser') || '{"name":"Guest","avatar":"👤","color":"#888"}')
  const { messages, onlineUsers, sendMessage, messagesEndRef } = useChat(currentUser)

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    sendMessage(inputValue)
    setInputValue('')
  }

  return (
    <Layout>
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">Personal Library</h1>
          <p className="home-subtitle">Explore your collections</p>
        </header>
        
        <div className="floating-cards">
          {collections.map((item, index) => (
            <Link 
              key={item.title} 
              to={item.to} 
              className={`floating-card floating-card-${index + 1}`}
              style={{ '--accent': item.color } as React.CSSProperties}
            >
              <div className="floating-card-icon">{item.icon}</div>
              <div className="floating-card-content">
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <div className="floating-card-glow"></div>
            </Link>
          ))}
        </div>

        {/* Decorative elements */}
        <div className="decor-circle decor-circle-1"></div>
        <div className="decor-circle decor-circle-2"></div>
        <div className="decor-circle decor-circle-3"></div>
        <div className="decor-line decor-line-1"></div>
        <div className="decor-line decor-line-2"></div>
      </div>

      {/* Chat Widget */}
      <div className={`chat-widget ${chatOpen ? 'chat-open' : ''}`}>
        <button className="chat-toggle" onClick={() => setChatOpen(!chatOpen)}>
          {chatOpen ? '✕' : '💬'}
          {!chatOpen && <span className="chat-badge">{onlineUsers.length}</span>}
        </button>
        
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <div className="chat-header-info">
                <span className="chat-user-avatar" style={{ background: currentUser.color }}>
                  {currentUser.avatar}
                </span>
                <div>
                  <h3>Chat Room</h3>
                  <span className="chat-online-count">{onlineUsers.length} online</span>
                </div>
              </div>
              <div className="chat-online-avatars">
                {onlineUsers.slice(0, 4).map((u, i) => (
                  <span 
                    key={i} 
                    className="online-avatar" 
                    style={{ background: u.color }}
                    title={u.name}
                  >
                    {u.avatar}
                  </span>
                ))}
              </div>
            </div>
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`chat-message ${msg.isCurrentUser ? 'user-message' : 'other-message'}`}
                >
                  {!msg.isCurrentUser && (
                    <span className="message-avatar" style={{ background: msg.user.color }}>
                      {msg.user.avatar}
                    </span>
                  )}
                  <div className="message-content">
                    {!msg.isCurrentUser && (
                      <span className="message-author" style={{ color: msg.user.color }}>
                        {msg.user.name}
                      </span>
                    )}
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <span className="input-avatar" style={{ background: currentUser.color }}>
                {currentUser.avatar}
              </span>
              <input 
                type="text" 
                placeholder={`Message as ${currentUser.name}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
