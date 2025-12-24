'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    checkAuth()
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [pathname])

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768)
    if (window.innerWidth >= 768) {
      setMobileMenuOpen(false)
    }
  }

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

  const navLinks = [
    { href: '/quizzes/active', label: 'Active Quizzes', pathMatch: '/quizzes/active' },
    { href: '/results', label: 'Results', pathMatch: '/results' },
    { href: '/quizzes', label: 'Quizzes', pathMatch: '/quizzes', exclude: '/quizzes/active' },
    { href: '/partnerships', label: 'Partnerships', pathMatch: '/partnerships' },
    { href: '/classes', label: 'Classes', pathMatch: '/classes' },
  ]

  const isActive = (link: typeof navLinks[0]) => {
    if (link.exclude && pathname?.startsWith(link.exclude)) return false
    return pathname?.startsWith(link.pathMatch)
  }

  const NavLink = ({ link }: { link: typeof navLinks[0] }) => (
    <Link
      href={link.href}
      onClick={() => setMobileMenuOpen(false)}
      style={{
        color: isActive(link) ? '#0070f3' : '#666',
        textDecoration: 'none',
        fontWeight: isActive(link) ? '500' : 'normal',
        padding: isMobile ? '0.75rem 1rem' : '0',
        display: 'block',
        width: isMobile ? '100%' : 'auto',
        borderBottom: isMobile ? '1px solid #eee' : 'none',
      }}
    >
      {link.label}
    </Link>
  )

  return (
    <>
      <nav style={{
        borderBottom: '1px solid #ddd',
        padding: '1rem 2rem',
        backgroundColor: '#fff',
        position: 'relative',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1 }}>
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
            {!isMobile && (
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {navLinks.map((link) => (
                  <NavLink key={link.href} link={link} />
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {!isMobile && (
              <>
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
              </>
            )}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
                aria-label="Toggle menu"
              >
                <span style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: '#333',
                  transition: 'all 0.3s',
                  transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
                }} />
                <span style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: '#333',
                  transition: 'all 0.3s',
                  opacity: mobileMenuOpen ? 0 : 1,
                }} />
                <span style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: '#333',
                  transition: 'all 0.3s',
                  transform: mobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none',
                }} />
              </button>
            )}
          </div>
        </div>
      </nav>
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
        }} onClick={() => setMobileMenuOpen(false)} />
      )}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: '0',
          right: mobileMenuOpen ? '0' : '-100%',
          width: '280px',
          maxWidth: '80vw',
          height: '100vh',
          backgroundColor: '#fff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          zIndex: 999,
          transition: 'right 0.3s ease',
          overflowY: 'auto',
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 'bold', color: '#1a1a1a' }}>{username}</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: '#666',
              }}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {navLinks.map((link) => (
              <NavLink key={link.href} link={link} />
            ))}
          </div>
          <div style={{ padding: '1rem', borderTop: '1px solid #eee', marginTop: 'auto' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  )
}

