'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Attempt {
  id: string
  quiz: {
    id: string
    title: string
    topic: string
  }
  partnership: {
    id: string
    members: Array<{
      user: {
        id: string
        username: string
      }
    }>
  } | null
  class: {
    id: string
    name: string
  } | null
  status: string
  startedAt: string
  _count: {
    answers: number
  }
}

export default function ActiveQuizzesPage() {
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchActiveAttempts()
  }, [])

  const fetchActiveAttempts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/attempts/list?status=IN_PROGRESS')
      if (!response.ok) {
        throw new Error('Failed to fetch active attempts')
      }
      const data = await response.json()
      setAttempts(data.attempts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active quizzes')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading active quizzes...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Active Quizzes</h1>

      {attempts.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          <p>You don&apos;t have any active quizzes.</p>
          <Link
            href="/quizzes"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Browse Quizzes
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="active-quiz-item"
            >
              <div className="active-quiz-item-content">
                <div className="active-quiz-item-main">
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    {attempt.quiz.title}
                  </h3>
                  <div className="active-quiz-item-info">
                    <span>Topic: {attempt.quiz.topic}</span>
                    {attempt.partnership && (
                      <span>
                        Partnership: {attempt.partnership.members.map((m) => m.user.username).join(' - ')}
                      </span>
                    )}
                    {attempt.class && (
                      <span>
                        Class: {attempt.class.name}
                      </span>
                    )}
                  </div>
                  <div className="active-quiz-item-meta">
                    <span>Started: {new Date(attempt.startedAt).toLocaleDateString()}</span>
                    <span>Answers: {attempt._count.answers}</span>
                  </div>
                </div>
                <div className="active-quiz-item-action">
                  <Link
                    href={`/quizzes/${attempt.quiz.id}/take?${attempt.partnership ? `partnershipId=${attempt.partnership.id}` : attempt.class ? `classId=${attempt.class.id}` : ''}`}
                    className="continue-quiz-btn"
                  >
                    Continue Quiz
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

