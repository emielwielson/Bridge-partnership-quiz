import ClassList from '@/components/classes/ClassList'
import Link from 'next/link'

export default function ClassesPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Classes</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            href="/classes/create"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Create Class
          </Link>
          <Link
            href="/classes/join"
            style={{
              padding: '0.75rem 1.5rem',
              color: '#0070f3',
              border: '1px solid #0070f3',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Join Class
          </Link>
        </div>
      </div>

      <ClassList />
    </main>
  )
}

