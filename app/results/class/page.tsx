'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function ClassResultsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchResults = useCallback(async () => {
    if (!selectedClassId) return
    
    try {
      setLoadingResults(true)
      const response = await fetch(`/api/results/player-class?classId=${selectedClassId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setLoadingResults(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedClassId) {
      fetchResults()
    }
  }, [selectedClassId, fetchResults])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/classes/list')
      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }
      const data = await response.json()
      setClasses(data.classes || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  if (loading && !selectedClassId) {
    return <div>Loading classes...</div>
  }

  if (!selectedClassId) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <Link
          href="/results"
          style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
        >
          ← Back to Results
        </Link>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Select a Class</h1>
        {classes.length === 0 ? (
          <p>You are not a member of any classes yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
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

  if (!results) {
    return <div>Loading results...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <Link
        href="/results/class"
        onClick={() => setSelectedClassId(null)}
        style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Select Different Class
      </Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        Results: {results.class.name}
      </h1>

      {results.quizzes.length === 0 ? (
        <p>No quizzes completed in this class yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
          {results.quizzes.map((quiz: any) => (
            <div
              key={quiz.quizId}
              style={{
                padding: '1.5rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#fff',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{quiz.quizTitle}</h2>
              <p style={{ color: '#666', marginBottom: '1rem' }}>Topic: {quiz.quizTopic}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {quiz.attempts.map((attempt: any) => (
                  <div
                    key={attempt.attemptId}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', color: '#666' }}>
                        Attempt from {new Date(attempt.startedAt).toLocaleDateString()}
                      </span>
                      <span style={{ marginLeft: '1rem' }}>
                        {attempt.answeredQuestions} / {attempt.totalQuestions} answered ({attempt.completionPercent}%)
                      </span>
                    </div>

                    {attempt.status === 'COMPLETED' && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Your Answers:</strong>
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {attempt.questions.map((q: any, idx: number) => (
                            <div
                              key={q.questionId}
                              style={{
                                padding: '0.75rem',
                                backgroundColor: q.answered ? '#e3f2fd' : '#fff',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                              }}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                Question {idx + 1}
                              </div>
                              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>
                                {q.prompt}
                              </div>
                              {q.answered ? (
                                <div style={{ fontSize: '0.9rem' }}>
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {JSON.stringify(q.userAnswer, null, 2)}
                                  </pre>
                                </div>
                              ) : (
                                <span style={{ fontStyle: 'italic', color: '#999' }}>Not answered</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

