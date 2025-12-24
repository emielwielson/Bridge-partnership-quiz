import Link from 'next/link'

export default function ClassesHeader() {
  return (
    <div style={{
      marginBottom: '2rem',
    }}>
      <div className="classes-header-container">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Classes</h1>
        <div className="classes-buttons-container">
          <Link
            href="/classes/create"
            className="create-class-btn"
          >
            Create Class
          </Link>
          <Link
            href="/classes/join"
            className="join-class-btn"
          >
            Join Class
          </Link>
        </div>
      </div>
    </div>
  )
}

