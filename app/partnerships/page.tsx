import PartnershipList from '@/components/partnerships/PartnershipList'
import PartnershipInvites from '@/components/partnerships/PartnershipInvites'
import InviteCodeDisplay from '@/components/partnerships/InviteCodeDisplay'
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

      <InviteCodeDisplay inviteCode={user.inviteCode} />

      <div>
        <PartnershipList />
      </div>

    </main>
  )
}

