'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function PartnershipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const partnershipId = params?.partnershipId as string
  const attemptId = params?.attemptId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [partnershipId, attemptId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/results/partnership-detail?partnershipId=${partnershipId}&attemptId=${attemptId}&quizId=${quizId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch partnership details')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error || !data) {
    return <div style={{ color: '#c33' }}>{error || 'No data found'}</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <Link
        href={`/quizzes/${quizId}/results`}
        style={{ color: '#0070f3', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Results
      </Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        Partnership: {data.partnership.members.map((m: any) => m.username).join(' - ')}
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Attempt from {new Date(data.attempt.startedAt).toLocaleDateString()}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {data.questions.map((q: any) => (
          <div
            key={q.questionId}
            style={{
              padding: '1.5rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <strong>Question {q.questionOrder + 1}</strong>
              <span
                style={{
                  marginLeft: '1rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: q.agreement.agreed ? '#d4edda' : '#f8d7da',
                  color: q.agreement.agreed ? '#155724' : '#721c24',
                  fontSize: '0.9rem',
                }}
              >
                {q.agreement.agreed ? '✓ Agreed' : '✗ Disagreed'}
              </span>
            </div>
            <p style={{ marginBottom: '1rem' }}>{q.prompt}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {q.memberAnswers.map((member: any) => (
                <div
                  key={member.userId}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {member.username}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    {member.answered ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(member.answer, null, 2)}
                      </pre>
                    ) : (
                      <span style={{ fontStyle: 'italic' }}>Not answered</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

