import { useState, useEffect, useRef } from 'react'

export interface User {
  name: string
  avatar: string
  color: string
}

export interface ChatMessage {
  text: string
  user: User
  timestamp: number
  isCurrentUser: boolean
}

const OTHER_USERS: User[] = [
  { name: 'Alice', avatar: '🦊', color: '#f97316' },
  { name: 'Charlie', avatar: '🐺', color: '#8b5cf6' },
  { name: 'Bob', avatar: '🦁', color: '#06b6d4' },
  { name: 'Diana', avatar: '🦋', color: '#ec4899' },
]

export function useChat(currentUser: User) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Welcome message from system
    const systemUser: User = { name: 'System', avatar: '🤖', color: '#6366f1' }
    setMessages([
      {
        text: `Welcome ${currentUser.name}! ${currentUser.avatar} You're now in the chat room.`,
        user: systemUser,
        timestamp: Date.now(),
        isCurrentUser: false,
      },
    ])
    // Simulate other users online (excluding current user)
    const others = OTHER_USERS.filter(u => u.name !== currentUser.name).slice(0, 3)
    setOnlineUsers([currentUser, ...others])
    // Simulate another user joining after 2 seconds
    setTimeout(() => {
      const joiner = others[0]
      if (joiner) {
        setMessages(prev => [
          ...prev,
          {
            text: `Hey ${currentUser.name}! Good to see you here 👋`,
            user: joiner,
            timestamp: Date.now(),
            isCurrentUser: false,
          },
        ])
      }
    }, 2500)
    // eslint-disable-next-line
  }, [currentUser.name])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage(text: string) {
    if (!text.trim()) return
    setMessages(prev => [
      ...prev,
      {
        text,
        user: currentUser,
        timestamp: Date.now(),
        isCurrentUser: true,
      },
    ])
    // Simulate response from another user
    setTimeout(() => {
      const responder = onlineUsers.find(u => u.name !== currentUser.name) || OTHER_USERS[0]
      const responses = [
        `That's cool, ${currentUser.name}! 😄`,
        'I totally agree with that!',
        'Interesting thought... 🤔',
        'Haha nice one!',
        'Have you checked out the Library section?',
        'The Quests page is really fun!',
      ]
      setMessages(prev => [
        ...prev,
        {
          text: responses[Math.floor(Math.random() * responses.length)],
          user: responder,
          timestamp: Date.now(),
          isCurrentUser: false,
        },
      ])
    }, 1000 + Math.random() * 1500)
  }

  return {
    messages,
    onlineUsers,
    sendMessage,
    messagesEndRef,
  }
}
