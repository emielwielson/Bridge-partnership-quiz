import InvitePartner from '@/components/partnerships/InvitePartner'
import Link from 'next/link'

export default function InvitePartnerPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <Link
        href="/partnerships"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          color: '#0070f3',
          textDecoration: 'underline',
        }}
      >
        ← Back to Partnerships
      </Link>
      <InvitePartner />
    </main>
  )
}

