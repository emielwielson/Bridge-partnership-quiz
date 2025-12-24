import Link from 'next/link'

export default function PartnershipsHeader() {
  return (
    <div style={{
      marginBottom: '2rem',
    }}>
      <div className="partnerships-header-container">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Partnerships</h1>
        <Link
          href="/partnerships/create"
          className="create-partnership-btn"
        >
          Create Partnership
        </Link>
      </div>
    </div>
  )
}

