'use client'

import { useState } from 'react'

interface ForcingNonForcingInputProps {
  value: { type: 'FORCING' | 'NON_FORCING' } | null
  onChange: (value: { type: 'FORCING' | 'NON_FORCING' }) => void
  disabled?: boolean
}

export default function ForcingNonForcingInput({
  value,
  onChange,
  disabled = false,
}: ForcingNonForcingInputProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
      <button
        type="button"
        onClick={() => onChange({ type: 'FORCING' })}
        disabled={disabled}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          backgroundColor: value?.type === 'FORCING' ? '#0070f3' : '#fff',
          color: value?.type === 'FORCING' ? '#fff' : '#333',
          border: '2px solid #0070f3',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontWeight: value?.type === 'FORCING' ? 'bold' : 'normal',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        Forcing
      </button>
      <button
        type="button"
        onClick={() => onChange({ type: 'NON_FORCING' })}
        disabled={disabled}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          backgroundColor: value?.type === 'NON_FORCING' ? '#0070f3' : '#fff',
          color: value?.type === 'NON_FORCING' ? '#fff' : '#333',
          border: '2px solid #0070f3',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontWeight: value?.type === 'NON_FORCING' ? 'bold' : 'normal',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        Non-forcing
      </button>
    </div>
  )
}

