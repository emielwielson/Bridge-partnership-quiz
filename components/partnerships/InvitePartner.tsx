'use client'

import { useState, FormEvent, useEffect } from 'react'

interface Partnership {
  id: string
  members: Array<{
    user: {
      id: string
      username: string
    }
  }>
}

export default function InvitePartner() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [selectedPartnershipId, setSelectedPartnershipId] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchPartnerships()
  }, [])

  const fetchPartnerships = async () => {
    try {
      const response = await fetch('/api/partnerships/list')
      if (!response.ok) {
        throw new Error('Failed to fetch partnerships')
      }
      const data = await response.json()
      setPartnerships(data.partnerships || [])
      if (data.partnerships && data.partnerships.length > 0) {
        setSelectedPartnershipId(data.partnerships[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!selectedPartnershipId || !inviteCode.trim()) {
      setError('Please select a partnership and enter an invite code')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/partnerships/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnershipId: selectedPartnershipId,
          inviteCode: inviteCode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation')
        setLoading(false)
        return
      }

      setSuccess('Invitation sent successfully!')
      setInviteCode('')
      fetchPartnerships()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (partnerships.length === 0) {
    return (
      <div>
        <p>You need to create a partnership first before you can invite partners.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Invite Partner</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="partnership" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Partnership
        </label>
        <select
          id="partnership"
          value={selectedPartnershipId}
          onChange={(e) => setSelectedPartnershipId(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
          disabled={loading}
        >
          {partnerships.map((p) => (
            <option key={p.id} value={p.id}>
              {p.members.map((m) => m.user.username).join(', ')}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="inviteCode" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Partner&apos;s Invite Code
        </label>
        <input
          id="inviteCode"
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          required
          placeholder="Enter invite code"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
          disabled={loading}
        />
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

      {success && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#efe',
          color: '#3c3',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}>
          {success}
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
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
    </form>
  )
}

