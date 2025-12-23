import PartnershipList from '@/components/partnerships/PartnershipList'
import PartnershipInvites from '@/components/partnerships/PartnershipInvites'
import Link from 'next/link'
import { getSessionId, validateSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export default async function PartnershipsPage() {
  const sessionId = await getSessionId()
  const userId = await validateSession(sessionId)
  
  if (!userId) {
    redirect('/login')
  }

  // Get user with invite code
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      inviteCode: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Partnerships</h1>
        <Link
          href="/partnerships/create"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Create Partnership
        </Link>
      </div>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f0f7ff',
        border: '2px solid #0070f3',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
          Your Invite Code (share this with partners):
        </div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          color: '#0070f3',
        }}>
          {user.inviteCode}
        </div>
      </div>

      <div>
        <PartnershipList />
      </div>

    </main>
  )
}

