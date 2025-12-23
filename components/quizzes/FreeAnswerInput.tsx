'use client'

import { useState } from 'react'

interface FreeAnswerInputProps {
  value: { intent: string; suit?: string; strength?: string } | null
  onChange: (value: { intent: string; suit?: string; strength?: string }) => void
  disabled?: boolean
}

const intents = ['FG', 'F', 'INV', 'NF', 'SI']
const suits = ['♣', '♦', '♥', '♠', 'NT']
const suitValues = ['CLUB', 'DIAMOND', 'HEART', 'SPADE', 'NO_TRUMP']
const strengthFormats = [
  '≥ x HCP',
  'x HCP',
  '≤ x HCP',
  '< x HCP',
  'x–y HCP',
]

export default function FreeAnswerInput({
  value,
  onChange,
  disabled = false,
}: FreeAnswerInputProps) {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(value?.intent || null)
  const [selectedSuit, setSelectedSuit] = useState<string | null>(value?.suit || null)
  const [selectedStrength, setSelectedStrength] = useState<string | null>(value?.strength || null)

  const handleIntentSelect = (intent: string) => {
    setSelectedIntent(intent)
    onChange({
      intent,
      suit: selectedSuit || undefined,
      strength: selectedStrength || undefined,
    })
  }

  const handleSuitSelect = (suit: string) => {
    setSelectedSuit(suit)
    onChange({
      intent: selectedIntent || '',
      suit,
      strength: selectedStrength || undefined,
    })
  }

  const handleStrengthSelect = (strength: string) => {
    setSelectedStrength(strength)
    onChange({
      intent: selectedIntent || '',
      suit: selectedSuit || undefined,
      strength,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Intent (mandatory) */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Intent <span style={{ color: '#c33' }}>*</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {intents.map((intent) => (
            <button
              key={intent}
              type="button"
              onClick={() => handleIntentSelect(intent)}
              disabled={disabled}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: selectedIntent === intent ? '#0070f3' : '#fff',
                color: selectedIntent === intent ? '#fff' : '#333',
                border: `2px solid ${selectedIntent === intent ? '#0070f3' : '#ddd'}`,
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: selectedIntent === intent ? 'bold' : 'normal',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {intent}
            </button>
          ))}
        </div>
      </div>

      {/* Suit (optional) */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Suit (optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {suits.map((suit, idx) => (
            <button
              key={suit}
              type="button"
              onClick={() => handleSuitSelect(suitValues[idx])}
              disabled={disabled || !selectedIntent}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1.2rem',
                backgroundColor: selectedSuit === suitValues[idx] ? '#0070f3' : '#fff',
                color: selectedSuit === suitValues[idx] ? '#fff' : '#333',
                border: `2px solid ${selectedSuit === suitValues[idx] ? '#0070f3' : '#ddd'}`,
                borderRadius: '8px',
                cursor: disabled || !selectedIntent ? 'not-allowed' : 'pointer',
                fontWeight: selectedSuit === suitValues[idx] ? 'bold' : 'normal',
                opacity: disabled || !selectedIntent ? 0.6 : 1,
              }}
            >
              {suit}
            </button>
          ))}
        </div>
      </div>

      {/* Strength (optional) */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Strength / HCP (optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {strengthFormats.map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => handleStrengthSelect(format)}
              disabled={disabled || !selectedIntent}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: selectedStrength === format ? '#0070f3' : '#fff',
                color: selectedStrength === format ? '#fff' : '#333',
                border: `2px solid ${selectedStrength === format ? '#0070f3' : '#ddd'}`,
                borderRadius: '8px',
                cursor: disabled || !selectedIntent ? 'not-allowed' : 'pointer',
                fontWeight: selectedStrength === format ? 'bold' : 'normal',
                opacity: disabled || !selectedIntent ? 0.6 : 1,
              }}
            >
              {format}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

