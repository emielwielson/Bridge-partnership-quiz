import CreateClass from '@/components/classes/CreateClass'
import Link from 'next/link'

export default function CreateClassPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <Link
        href="/classes"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          color: '#0070f3',
          textDecoration: 'underline',
        }}
      >
        ← Back to Classes
      </Link>
      <CreateClass />
    </main>
  )
}

