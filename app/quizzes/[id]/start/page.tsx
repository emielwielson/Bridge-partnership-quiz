'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function StartQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const [partnerships, setPartnerships] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'partnership' | 'class' | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [partnershipsRes, classesRes] = await Promise.all([
        fetch('/api/partnerships/list'),
        fetch('/api/classes/list'),
      ])

      if (partnershipsRes.ok) {
        const partnershipsData = await partnershipsRes.json()
        setPartnerships(partnershipsData.partnerships || [])
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setClasses(classesData.classes || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = (partnershipId?: string, classId?: string) => {
    const params = new URLSearchParams()
    if (partnershipId) {
      params.append('partnershipId', partnershipId)
    } else if (classId) {
      params.append('classId', classId)
    }
    router.push(`/quizzes/${quizId}/take?${params.toString()}`)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!mode) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <Link
          href={`/quizzes/${quizId}/edit`}
          style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
        >
          ← Back to Quiz
        </Link>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Start Quiz</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => setMode('partnership')}
            disabled={partnerships.length === 0}
            style={{
              padding: '1.5rem',
              fontSize: '1.2rem',
              backgroundColor: partnerships.length === 0 ? '#e0e0e0' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: partnerships.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Start with Partnership
            {partnerships.length === 0 && ' (No partnerships available)'}
          </button>
          <button
            onClick={() => setMode('class')}
            disabled={classes.length === 0}
            style={{
              padding: '1.5rem',
              fontSize: '1.2rem',
              backgroundColor: classes.length === 0 ? '#e0e0e0' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: classes.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Start with Class
            {classes.length === 0 && ' (No classes available)'}
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'partnership') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <button
          onClick={() => setMode(null)}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Select Partnership</h1>
        {partnerships.length === 0 ? (
          <p>You don't have any partnerships. <Link href="/partnerships/create" style={{ color: '#0070f3' }}>Create one</Link> to start.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {partnerships.map((partnership) => (
              <button
                key={partnership.id}
                onClick={() => handleStart(partnership.id)}
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {partnership.members.map((m: any) => m.user.username).join(' - ')}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (mode === 'class') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <button
          onClick={() => setMode(null)}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Select Class</h1>
        {classes.length === 0 ? (
          <p>You are not a member of any classes. <Link href="/classes" style={{ color: '#0070f3' }}>Join a class</Link> to start.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => handleStart(undefined, cls.id)}
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

