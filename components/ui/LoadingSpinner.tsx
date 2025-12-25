'use client'

import { useState, useEffect } from 'react'
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
}

const suits = ['♠', '♥', '♦', '♣']
const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']

function getRandomCard() {
  const suit = suits[Math.floor(Math.random() * suits.length)]
  const rank = ranks[Math.floor(Math.random() * ranks.length)]
  const isRed = suit === '♥' || suit === '♦'
  return { suit, rank, isRed }
}

export default function LoadingSpinner({ 
  message, 
  size = 'medium' 
}: LoadingSpinnerProps) {
  const [cards, setCards] = useState(() => [
    getRandomCard(),
    getRandomCard(),
    getRandomCard(),
    getRandomCard(),
  ])

  // Regenerate cards when animation completes (every 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setCards([
        getRandomCard(),
        getRandomCard(),
        getRandomCard(),
        getRandomCard(),
      ])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const sizeClass = `spinner-${size}`
  
  return (
    <div className="loading-spinner-container">
      <div className={`card-spinner ${sizeClass}`}>
        {cards.map((card, index) => (
          <div key={index} className="card-wrapper">
            <div className="card">
              <div className="card-front">
                <div className="card-back-pattern"></div>
              </div>
              <div className={`card-back ${card.isRed ? 'red' : 'black'}`}>
                <div className="card-rank">{card.rank}</div>
                <div className="card-suit">{card.suit}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {message && <div className="loading-spinner-message">{message}</div>}
    </div>
  )
}
