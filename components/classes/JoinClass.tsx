'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function JoinClass() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classLink, setClassLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const link = searchParams?.get('link')
    if (link) {
      setClassLink(link)
    }
  }, [searchParams])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!classLink.trim()) {
      setError('Please enter a class link')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classLink: classLink.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join class')
        setLoading(false)
        return
      }

      // Redirect to class list
      router.push('/classes')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Join Class</h2>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        Enter the class link provided by your teacher.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="classLink" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Class Link
        </label>
        <input
          id="classLink"
          type="text"
          value={classLink}
          onChange={(e) => setClassLink(e.target.value)}
          required
          placeholder="Enter class link"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
          disabled={loading}
        />
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Joining...' : 'Join Class'}
      </button>
    </form>
  )
}

