import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
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
          Create Account
        </h1>
        <RegisterForm />
        <p style={{ 
          marginTop: '1.5rem', 
          textAlign: 'center',
          color: '#666',
        }}>
          Already have an account?{' '}
          <Link 
            href="/login"
            style={{ color: '#0070f3', textDecoration: 'underline' }}
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}

