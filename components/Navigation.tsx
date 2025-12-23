'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      if (data.authenticated) {
        setAuthenticated(true)
        setUsername(data.user?.username || '')
      }
    } catch (err) {
      // Not authenticated
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (!authenticated) {
    return null
  }

  return (
    <nav style={{
      borderBottom: '1px solid #ddd',
      padding: '1rem 2rem',
      backgroundColor: '#fff',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link
            href="/"
            style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#1a1a1a',
              textDecoration: 'none',
            }}
          >
            Bridge Quiz
          </Link>
          <Link
            href="/partnerships"
            style={{
              color: pathname?.startsWith('/partnerships') ? '#0070f3' : '#666',
              textDecoration: 'none',
              fontWeight: pathname?.startsWith('/partnerships') ? '500' : 'normal',
            }}
          >
            Partnerships
          </Link>
          <Link
            href="/classes"
            style={{
              color: pathname?.startsWith('/classes') ? '#0070f3' : '#666',
              textDecoration: 'none',
              fontWeight: pathname?.startsWith('/classes') ? '500' : 'normal',
            }}
          >
            Classes
          </Link>
          <Link
            href="/quizzes"
            style={{
              color: pathname?.startsWith('/quizzes') ? '#0070f3' : '#666',
              textDecoration: 'none',
              fontWeight: pathname?.startsWith('/quizzes') ? '500' : 'normal',
            }}
          >
            Quizzes
          </Link>
          <Link
            href="/player"
            style={{
              color: pathname?.startsWith('/player') ? '#0070f3' : '#666',
              textDecoration: 'none',
              fontWeight: pathname?.startsWith('/player') ? '500' : 'normal',
            }}
          >
            Player
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>{username}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

