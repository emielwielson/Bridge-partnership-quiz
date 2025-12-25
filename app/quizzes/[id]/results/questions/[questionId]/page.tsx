'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function QuestionDetailPage() {
  const params = useParams()
  const quizId = params?.id as string
  const questionId = params?.questionId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/results/question-detail?quizId=${quizId}&questionId=${questionId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch question details')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details')
    } finally {
      setLoading(false)
    }
  }, [quizId, questionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <LoadingSpinner message="Loading..." />
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

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Question Details</h1>
      <p style={{ marginBottom: '2rem' }}>{data.question.prompt}</p>

      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <strong>Total Partnerships:</strong> {data.statistics.totalPartnerships}
          </div>
          <div>
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
              {data.statistics.agreedPercent}%
            </span>
            <span style={{ marginLeft: '0.5rem' }}>agreed ({data.statistics.agreedCount})</span>
          </div>
          <div>
            <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
              {data.statistics.disagreedPercent}%
            </span>
            <span style={{ marginLeft: '0.5rem' }}>disagreed ({data.statistics.disagreedCount})</span>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Answer Distribution</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.answerDistribution.map((dist: any, idx: number) => (
          <div
            key={idx}
            style={{
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {JSON.stringify(dist.answer, null, 2)}
                </pre>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {dist.count} partnerships ({dist.percentage}%)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {dist.agreements} agreed ({dist.agreementPercentage}%)
                </div>
              </div>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${dist.percentage}%`,
                  height: '100%',
                  backgroundColor: '#0070f3',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

