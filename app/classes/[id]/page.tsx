import { Suspense } from 'react'
import ClassDashboard from '@/components/classes/ClassDashboard'
import Link from 'next/link'

function ClassDashboardWrapper() {
  return <ClassDashboard />
}

export default function ClassDetailPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '1200px',
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
        <ClassDashboardWrapper />
      </Suspense>
    </main>
  )
}

