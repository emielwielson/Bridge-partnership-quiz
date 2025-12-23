'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PartnershipResultsPage() {
  const router = useRouter()
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchResults = useCallback(async () => {
    if (!selectedPartnerId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/results/player-partnership?partnerId=${selectedPartnerId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [selectedPartnerId])

  useEffect(() => {
    if (selectedPartnerId) {
      fetchResults()
    }
  }, [selectedPartnerId, fetchResults])

  const fetchPartners = async () => {
    try {
      setLoading(true)
      // Get user's partnerships
      const response = await fetch('/api/partnerships/list')
      if (!response.ok) {
        throw new Error('Failed to fetch partnerships')
      }
      const data = await response.json()
      
      // Extract unique partners (excluding current user)
      const partnersMap = new Map()
      data.partnerships.forEach((p: any) => {
        p.members.forEach((m: any) => {
          if (m.userId !== data.currentUserId) {
            partnersMap.set(m.userId, {
              id: m.userId,
              username: m.username,
            })
          }
        })
      })
      
      setPartners(Array.from(partnersMap.values()))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  if (loading && !selectedPartnerId) {
    return <div>Loading partners...</div>
  }

  if (!selectedPartnerId) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <Link
          href="/results"
          style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
        >
          ← Back to Results
        </Link>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Select a Partner</h1>
        {partners.length === 0 ? (
          <p>You don&apos;t have any partnerships yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {partners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => setSelectedPartnerId(partner.id)}
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {partner.username}
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
        href="/results/partnership"
        onClick={() => setSelectedPartnerId(null)}
        style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Select Different Partner
      </Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        Results with {results.partner?.username}
      </h1>

      {results.quizzes.length === 0 ? (
        <p>No quizzes completed together yet.</p>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                          Attempt from {new Date(attempt.startedAt).toLocaleDateString()}
                        </span>
                        <span style={{ marginLeft: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {attempt.overallScore}% agreed
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <strong>Question-by-Question:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {attempt.questionComparisons.map((qc: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: qc.agreed ? '#d4edda' : '#f8d7da',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              textAlign: 'center',
                            }}
                          >
                            Q{idx + 1}: {qc.agreed ? '✓' : '✗'}
                          </div>
                        ))}
                      </div>
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

