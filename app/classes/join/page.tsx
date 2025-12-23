import { Suspense } from 'react'
import JoinClass from '@/components/classes/JoinClass'
import Link from 'next/link'

function JoinClassWrapper() {
  return <JoinClass />
}

export default function JoinClassPage() {
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
      <Suspense fallback={<div>Loading...</div>}>
        <JoinClassWrapper />
      </Suspense>
    </main>
  )
}

