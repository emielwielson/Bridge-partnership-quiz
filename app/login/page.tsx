import Link from 'next/link'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

function LoginFormWrapper() {
  return <LoginForm />
}

export default function LoginPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          marginBottom: '1rem',
          textAlign: 'center',
        }}>
          Login
        </h1>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginFormWrapper />
        </Suspense>
        <p style={{ 
          marginTop: '1.5rem', 
          textAlign: 'center',
          color: '#666',
        }}>
          Don't have an account?{' '}
          <Link 
            href="/register"
            style={{ color: '#0070f3', textDecoration: 'underline' }}
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}

