'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatePartnership() {
  const router = useRouter()
  const [inviteCodes, setInviteCodes] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addInviteCodeField = () => {
    setInviteCodes([...inviteCodes, ''])
  }

  const removeInviteCodeField = (index: number) => {
    if (inviteCodes.length > 1) {
      setInviteCodes(inviteCodes.filter((_, i) => i !== index))
    }
  }

  const updateInviteCode = (index: number, value: string) => {
    const updated = [...inviteCodes]
    updated[index] = value.toUpperCase()
    setInviteCodes(updated)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // Filter out empty codes and validate at least one
    const validCodes = inviteCodes.filter(code => code.trim().length > 0)
    
    if (validCodes.length === 0) {
      setError('Please enter at least one partner invite code')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCodes: validCodes }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create partnership')
        setLoading(false)
        return
      }

      // Redirect to partnerships list
      router.push('/partnerships')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Create Partnership</h2>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        Enter your partner's invite codes. You must add at least one partner to create a partnership.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Partner Invite Codes
        </label>
        {inviteCodes.map((code, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={code}
              onChange={(e) => updateInviteCode(index, e.target.value)}
              placeholder="Enter invite code"
              required={index === 0}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
              disabled={loading}
            />
            {inviteCodes.length > 1 && (
              <button
                type="button"
                onClick={() => removeInviteCodeField(index)}
                disabled={loading}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  border: '1px solid #c33',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addInviteCodeField}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f5f5f5',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          + Add Another Partner
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Creating...' : 'Create Partnership'}
      </button>
    </form>
  )
}

