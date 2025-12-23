import CreatePartnership from '@/components/partnerships/CreatePartnership'
import Link from 'next/link'

export default function CreatePartnershipPage() {
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
      <CreatePartnership />
    </main>
  )
}

