import Link from 'next/link'
import './home.css'

export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '1rem',
          color: '#1a1a1a',
        }}>
          Bridge Partnership Quiz App
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          marginBottom: '2rem',
          color: '#666',
        }}>
          Test and align your bridge bidding agreements with your partners
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '1rem',
        }}>
          <Link 
            href="/login"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Login
          </Link>
          <Link 
            href="/register"
            style={{
              padding: '0.75rem 2rem',
              color: '#0070f3',
              border: '1px solid #0070f3',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  )
}

