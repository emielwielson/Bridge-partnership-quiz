'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import QuizPlayer from '@/components/quizzes/QuizPlayer'

export default function TakeQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [partnershipId, setPartnershipId] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const creatingAttempt = useRef(false)

  const createAttempt = useCallback(async (partnershipIdParam: string | null, classIdParam: string | null) => {
    if (creatingAttempt.current) {
      return
    }
    
    creatingAttempt.current = true
    try {
      setLoading(true)
      const response = await fetch('/api/attempts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          partnershipId: partnershipIdParam,
          classId: classIdParam,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create attempt')
      }

      const data = await response.json()
      
      // For class quizzes, teacher doesn't get an attempt
      if (classIdParam && data.message && !data.attempt) {
        // Quiz started successfully for class, show success message
        setError('') // Clear any errors
        setAttemptId(null) // No attempt for teacher
        return
      }
      
      if (data.attempt) {
        setAttemptId(data.attempt.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz')
    } finally {
      setLoading(false)
      creatingAttempt.current = false
    }
  }, [quizId])

  useEffect(() => {
    // Prevent multiple calls
    if (creatingAttempt.current || attemptId) {
      return
    }

    // Get partnership or class from URL params or query
    const urlParams = new URLSearchParams(window.location.search)
    const partnershipIdParam = urlParams.get('partnershipId')
    const classIdParam = urlParams.get('classId')

    if (partnershipIdParam) {
      setPartnershipId(partnershipIdParam)
    } else if (classIdParam) {
      setClassId(classIdParam)
    }

    createAttempt(partnershipIdParam, classIdParam)
  }, [quizId, attemptId, createAttempt])

  if (loading) {
    return <div>Starting quiz...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ color: '#c33', marginBottom: '1rem' }}>{error}</div>
        <button
          onClick={() => router.back()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  // For class quizzes, teacher doesn't participate, so show success message
  if (classId && !attemptId && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#28a745' }}>
          ✓ Quiz started successfully!
        </div>
        <p style={{ marginBottom: '2rem', color: '#666' }}>
          The quiz has been started for your class. Students can now take the quiz.
        </p>
        <button
          onClick={() => router.push('/quizzes/active')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Go to Active Quizzes
        </button>
      </div>
    )
  }

  if (!attemptId && !classId) {
    return <div>Failed to create attempt</div>
  }

  if (attemptId) {
    return <QuizPlayer attemptId={attemptId} />
  }

  return null
}

