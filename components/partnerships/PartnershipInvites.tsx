'use client'

import { useState, useEffect } from 'react'

interface Invitation {
  id: string
  partnershipId: string
  inviterId: string
  inviteeId: string
  status: string
  createdAt: string
  partnership: {
    id: string
    members: Array<{
      user: {
        id: string
        username: string
      }
    }>
  }
  inviter: {
    id: string
    username: string
  }
  invitee: {
    id: string
    username: string
  }
}

export default function PartnershipInvites() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/partnerships/invitations')
      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (err) {
      setError('Failed to load invitations')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (invitationId: string) => {
    try {
      const response = await fetch('/api/partnerships/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Refresh list
      fetchInvitations()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept invitation')
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      const response = await fetch('/api/partnerships/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject invitation')
      }

      // Refresh list
      fetchInvitations()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject invitation')
    }
  }

  if (loading) {
    return <div>Loading invitations...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  // Filter to only show received invitations (where current user is invitee)
  const receivedInvitations = invitations.filter((inv) => inv.status === 'PENDING')

  if (receivedInvitations.length === 0) {
    return (
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Partnership Invitations</h2>
        <p>You have no pending invitations.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Partnership Invitations</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {receivedInvitations.map((invitation) => (
          <div
            key={invitation.id}
            style={{
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>{invitation.inviter.username}</strong> invited you to join a partnership
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Partnership members: {invitation.partnership.members.map((m) => m.user.username).join(', ')}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleAccept(invitation.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => handleReject(invitation.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  border: '1px solid #c33',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

