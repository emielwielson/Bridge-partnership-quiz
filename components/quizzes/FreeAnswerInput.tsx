'use client'

import { useState, useEffect } from 'react'

interface FreeAnswerInputProps {
  value: { intent: string; suit?: string; strength?: string } | null
  onChange: (value: { intent: string; suit?: string; strength?: string }) => void
  disabled?: boolean
}

const intents = ['NF', 'F', 'INV', 'GF', 'SI']
const suits = ['♣', '♦', '♥', '♠']
const suitValues = ['CLUB', 'DIAMOND', 'HEART', 'SPADE']
const strengthFormats = [
  '≥ x HCP',
  'x HCP',
  '≤ x HCP',
  '< x HCP',
  'x–y HCP',
]

// Helper to parse strength value
function parseStrength(strength: string | undefined): { format: string | null; value1: number | null; value2: number | null } {
  if (!strength) return { format: null, value1: null, value2: null }
  
  // Try to match patterns like "≥ 12 HCP", "15 HCP", "≤ 10 HCP", "< 8 HCP", "12-15 HCP"
  const match1 = strength.match(/^(≥|≤|<)\s*(\d+)\s*HCP$/)
  if (match1) {
    return { format: `${match1[1]} x HCP`, value1: parseInt(match1[2]), value2: null }
  }
  
  const match2 = strength.match(/^(\d+)\s*HCP$/)
  if (match2) {
    return { format: 'x HCP', value1: parseInt(match2[1]), value2: null }
  }
  
  const match3 = strength.match(/^(\d+)\s*–\s*(\d+)\s*HCP$/)
  if (match3) {
    return { format: 'x–y HCP', value1: parseInt(match3[1]), value2: parseInt(match3[2]) }
  }
  
  // If it's just a format string without values, return it
  if (strengthFormats.includes(strength)) {
    return { format: strength, value1: null, value2: null }
  }
  
  return { format: null, value1: null, value2: null }
}

// Helper to format strength value
function formatStrength(format: string, value1: number | null, value2: number | null): string | undefined {
  if (!format || value1 === null) return undefined
  
  if (format === 'x–y HCP') {
    if (value2 === null) return undefined // Don't include strength until both values are entered
    return `${value1}–${value2} HCP`
  }
  
  // Replace x with the value
  return format.replace('x', value1.toString())
}

export default function FreeAnswerInput({
  value,
  onChange,
  disabled = false,
}: FreeAnswerInputProps) {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(value?.intent || null)
  const [selectedSuits, setSelectedSuits] = useState<string[]>(() => {
    // Parse suit from value - can be single suit or "CLUB+DIAMOND" format
    if (!value?.suit) return []
    return value.suit.split('+').filter(s => s)
  })
  const [selectedStrengthFormat, setSelectedStrengthFormat] = useState<string | null>(null)
  const [strengthValue1, setStrengthValue1] = useState<number | null>(null)
  const [strengthValue2, setStrengthValue2] = useState<number | null>(null)

  // Initialize strength format and values from existing value
  useEffect(() => {
    if (value?.strength) {
      const parsed = parseStrength(value.strength)
      setSelectedStrengthFormat(parsed.format)
      setStrengthValue1(parsed.value1)
      setStrengthValue2(parsed.value2)
    } else {
      setSelectedStrengthFormat(null)
      setStrengthValue1(null)
      setStrengthValue2(null)
    }
  }, [value?.strength])

  // Initialize suits from value
  useEffect(() => {
    if (value?.suit) {
      setSelectedSuits(value.suit.split('+').filter(s => s))
    } else {
      setSelectedSuits([])
    }
  }, [value?.suit])

  const handleIntentSelect = (intent: string) => {
    setSelectedIntent(intent)
    const suitStr = selectedSuits.length > 0 ? selectedSuits.join('+') : undefined
    const strengthStr = selectedStrengthFormat && strengthValue1 !== null
      ? formatStrength(selectedStrengthFormat, strengthValue1, strengthValue2)
      : undefined
    onChange({
      intent,
      suit: suitStr,
      strength: strengthStr,
    })
  }

  const handleSuitToggle = (suitValue: string) => {
    let newSuits: string[]
    if (selectedSuits.includes(suitValue)) {
      // Remove suit
      newSuits = selectedSuits.filter(s => s !== suitValue)
    } else {
      // Add suit
      newSuits = [...selectedSuits, suitValue]
    }
    setSelectedSuits(newSuits)
    
    const suitStr = newSuits.length > 0 ? newSuits.join('+') : undefined
    const strengthStr = selectedStrengthFormat && strengthValue1 !== null
      ? formatStrength(selectedStrengthFormat, strengthValue1, strengthValue2)
      : undefined
    onChange({
      intent: selectedIntent || '',
      suit: suitStr,
      strength: strengthStr,
    })
  }

  const handleStrengthFormatSelect = (format: string) => {
    setSelectedStrengthFormat(format)
    // Reset values when format changes
    setStrengthValue1(null)
    setStrengthValue2(null)
    
    // Update answer without strength (since no value entered yet)
    if (selectedIntent) {
      const suitStr = selectedSuits.length > 0 ? selectedSuits.join('+') : undefined
      onChange({
        intent: selectedIntent,
        suit: suitStr,
        strength: undefined,
      })
    }
  }

  const handleStrengthValueChange = (value: number | null, isSecond: boolean = false) => {
    if (isSecond) {
      setStrengthValue2(value)
    } else {
      setStrengthValue1(value)
    }
    
    // Update the answer immediately
    const newValue1 = isSecond ? strengthValue1 : value
    const newValue2 = isSecond ? value : strengthValue2
    
    const strengthStr = selectedStrengthFormat && newValue1 !== null
      ? formatStrength(selectedStrengthFormat, newValue1, newValue2)
      : undefined
    
    const suitStr = selectedSuits.length > 0 ? selectedSuits.join('+') : undefined
    onChange({
      intent: selectedIntent || '',
      suit: suitStr,
      strength: strengthStr,
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

      {/* Suit (optional, multiple selection) */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Suit (optional, select multiple)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {suits.map((suit, idx) => {
            const suitValue = suitValues[idx]
            const isSelected = selectedSuits.includes(suitValue)
            return (
              <button
                key={suit}
                type="button"
                onClick={() => handleSuitToggle(suitValue)}
                disabled={disabled || !selectedIntent}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1.2rem',
                  backgroundColor: isSelected ? '#0070f3' : '#fff',
                  color: isSelected ? '#fff' : '#333',
                  border: `2px solid ${isSelected ? '#0070f3' : '#ddd'}`,
                  borderRadius: '8px',
                  cursor: disabled || !selectedIntent ? 'not-allowed' : 'pointer',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  opacity: disabled || !selectedIntent ? 0.6 : 1,
                }}
              >
                {suit}
              </button>
            )
          })}
        </div>
        {selectedSuits.length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            Selected: {selectedSuits.map(s => suits[suitValues.indexOf(s)]).join(' + ')}
          </div>
        )}
      </div>

      {/* Strength (optional) */}
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Strength / HCP (optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {strengthFormats.map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => handleStrengthFormatSelect(format)}
              disabled={disabled || !selectedIntent}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: selectedStrengthFormat === format ? '#0070f3' : '#fff',
                color: selectedStrengthFormat === format ? '#fff' : '#333',
                border: `2px solid ${selectedStrengthFormat === format ? '#0070f3' : '#ddd'}`,
                borderRadius: '8px',
                cursor: disabled || !selectedIntent ? 'not-allowed' : 'pointer',
                fontWeight: selectedStrengthFormat === format ? 'bold' : 'normal',
                opacity: disabled || !selectedIntent ? 0.6 : 1,
              }}
            >
              {format}
            </button>
          ))}
        </div>
        
        {/* Number input(s) for selected strength format */}
        {selectedStrengthFormat && selectedStrengthFormat !== 'x–y HCP' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500' }}>Value:</label>
            <input
              type="number"
              min="0"
              max="40"
              step="1"
              value={strengthValue1 ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseInt(e.target.value)
                if (val !== null && (val < 0 || val > 40)) return
                handleStrengthValueChange(val)
              }}
              disabled={disabled || !selectedIntent}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '80px',
                opacity: disabled || !selectedIntent ? 0.6 : 1,
              }}
              placeholder="0-40"
            />
            <span>HCP</span>
          </div>
        )}
        
        {selectedStrengthFormat === 'x–y HCP' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500' }}>Range:</label>
            <input
              type="number"
              min="0"
              max="40"
              step="1"
              value={strengthValue1 ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseInt(e.target.value)
                if (val !== null && (val < 0 || val > 40)) return
                handleStrengthValueChange(val, false)
              }}
              disabled={disabled || !selectedIntent}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '80px',
                opacity: disabled || !selectedIntent ? 0.6 : 1,
              }}
              placeholder="0-40"
            />
            <span>–</span>
            <input
              type="number"
              min="0"
              max="40"
              step="1"
              value={strengthValue2 ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : parseInt(e.target.value)
                if (val !== null && (val < 0 || val > 40)) return
                handleStrengthValueChange(val, true)
              }}
              disabled={disabled || !selectedIntent}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '80px',
                opacity: disabled || !selectedIntent ? 0.6 : 1,
              }}
              placeholder="0-40"
            />
            <span>HCP</span>
          </div>
        )}
      </div>
    </div>
  )
}

