'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Partnership {
  id: string
  createdAt: string
  members: Array<{
    user: {
      id: string
      username: string
    }
  }>
}

export default function PartnershipList() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (err) {
      setError('Failed to load partnerships')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async (partnershipId: string) => {
    if (!confirm('Are you sure you want to leave this partnership?')) {
      return
    }

    try {
      const response = await fetch('/api/partnerships/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnershipId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to leave partnership')
      }

      // Refresh list
      fetchPartnerships()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave partnership')
    }
  }

  if (loading) {
    return <div>Loading partnerships...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  if (partnerships.length === 0) {
    return (
      <div>
        <p>You don't have any partnerships yet.</p>
        <Link href="/partnerships/create" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Create a partnership
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Partnerships</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {partnerships.map((partnership) => (
          <div
            key={partnership.id}
            style={{
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>{partnership.members.map((m) => m.user.username).join(' - ')}</strong>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
              Created: {new Date(partnership.createdAt).toLocaleDateString()}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleLeave(partnership.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  border: '1px solid #c33',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Leave Partnership
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

