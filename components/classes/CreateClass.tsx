'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateClass() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdClass, setCreatedClass] = useState<{ classLink: string; name: string } | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/classes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create class')
        setLoading(false)
        return
      }

      setCreatedClass({
        classLink: data.class.classLink,
        name: data.class.name,
      })
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (createdClass) {
      navigator.clipboard.writeText(`${window.location.origin}/classes/join?link=${createdClass.classLink}`)
      alert('Class link copied to clipboard!')
    }
  }

  if (createdClass) {
    return (
      <div style={{ maxWidth: '500px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Class Created!</h2>
        <div style={{
          padding: '1rem',
          backgroundColor: '#efe',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          <p><strong>Class:</strong> {createdClass.name}</p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Class Link:</strong> {createdClass.classLink}
          </p>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <p>Share this link with your students:</p>
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {window.location.origin}/classes/join?link={createdClass.classLink}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={copyLink}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Copy Link
          </button>
          <button
            onClick={() => router.push('/classes')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Go to Classes
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Create Class</h2>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        Create a new class. You'll be the teacher and can share the class link with students.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Class Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter class name"
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
        {loading ? 'Creating...' : 'Create Class'}
      </button>
    </form>
  )
}

