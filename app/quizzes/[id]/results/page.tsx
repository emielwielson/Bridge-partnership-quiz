'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface QuestionStat {
  questionId: string
  questionOrder: number
  totalPartnershipAttempts: number
  partnershipsWithSameAnswer: number
  partnershipsWithDifferentAnswers: number
  sameAnswerPercent: number
  differentAnswerPercent: number
}

export default function QuizmasterResultsPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<any>(null)
  const [activeView, setActiveView] = useState<'overview' | 'partnerships' | 'questions'>('overview')

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/results/quizmaster-overview?quizId=${quizId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      const data = await response.json()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    if (quizId) {
      fetchOverview()
    }
  }, [quizId, fetchOverview])

  if (loading) {
    return <div>Loading results...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  if (!overview) {
    return <div>No results found</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href={`/quizzes/${quizId}/edit`}
          style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
        >
          ← Back to Quiz
        </Link>
        <h1 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>
          Results: {overview.quiz.title}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => setActiveView('overview')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeView === 'overview' ? '#0070f3' : '#e0e0e0',
              color: activeView === 'overview' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('partnerships')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeView === 'partnerships' ? '#0070f3' : '#e0e0e0',
              color: activeView === 'partnerships' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Partnerships
          </button>
          <button
            onClick={() => setActiveView('questions')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeView === 'questions' ? '#0070f3' : '#e0e0e0',
              color: activeView === 'questions' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Questions
          </button>
        </div>
      </div>

      {activeView === 'overview' && (
        <div>
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <strong>Total Partnerships:</strong> {overview.totalPartnerships}
              </div>
              <div>
                <strong>Total Attempts:</strong> {overview.totalAttempts}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Question Statistics</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {overview.questions.map((q: QuestionStat) => (
              <div
                key={q.questionId}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <strong>Question {q.questionOrder + 1}</strong>
                  <Link
                    href={`/quizzes/${quizId}/results/questions/${q.questionId}`}
                    style={{ color: '#0070f3', textDecoration: 'none', fontSize: '0.9rem' }}
                  >
                    View Details →
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                      {q.sameAnswerPercent}%
                    </span>
                    <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                      partnerships agreed ({q.partnershipsWithSameAnswer} / {q.totalPartnershipAttempts})
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                      {q.differentAnswerPercent}%
                    </span>
                    <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                      partnerships disagreed ({q.partnershipsWithDifferentAnswers} / {q.totalPartnershipAttempts})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'partnerships' && (
        <PartnershipListView quizId={quizId} />
      )}

      {activeView === 'questions' && (
        <div>
          <p>Select a question from the overview to view detailed statistics.</p>
        </div>
      )}
    </div>
  )
}

function PartnershipListView({ quizId }: { quizId: string }) {
  const [partnerships, setPartnerships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPartnerships = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/results/partnership-list?quizId=${quizId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch partnerships')
      }
      const data = await response.json()
      setPartnerships(data.partnerships || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    fetchPartnerships()
  }, [fetchPartnerships])

  if (loading) {
    return <div>Loading partnerships...</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Partnerships</h2>
      {partnerships.length === 0 ? (
        <p>No partnerships have completed this quiz yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {partnerships.map((partnership) => (
            <div
              key={partnership.partnershipId}
              style={{
                padding: '1rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#fff',
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>
                  {partnership.members.map((m: any) => m.username).join(' - ')}
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {partnership.attempts.map((attempt: any) => (
                  <div
                    key={attempt.attemptId}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                          Attempt from {new Date(attempt.startedAt).toLocaleDateString()}
                        </span>
                        <span style={{ marginLeft: '1rem', fontWeight: 'bold' }}>
                          {attempt.overallScore}% agreed
                        </span>
                      </div>
                      <Link
                        href={`/quizzes/${quizId}/results/partnerships/${partnership.partnershipId}/attempts/${attempt.attemptId}`}
                        style={{ color: '#0070f3', textDecoration: 'none', fontSize: '0.9rem' }}
                      >
                        View Details →
                      </Link>
                    </div>
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

