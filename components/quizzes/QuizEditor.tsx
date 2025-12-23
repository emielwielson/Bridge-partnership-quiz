'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  prompt: string
  order: number
  editable: boolean
  editabilityReason?: string
  auction?: {
    bids: Array<{
      bidType: string
      level?: number
      suit?: string
      position: string
      alert?: {
        meaning: string
      }
    }>
  }
}

interface Quiz {
  id: string
  title: string
  description?: string
  topic: string
  state: 'DRAFT' | 'PUBLISHED'
  questions: Question[]
}

export default function QuizEditor() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)

  useEffect(() => {
    if (quizId) {
      fetchQuiz()
    }
  }, [quizId])

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/quizzes/get?id=${quizId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch quiz')
      }
      const data = await response.json()
      setQuiz(data.quiz)
    } catch (err) {
      setError('Failed to load quiz')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this quiz? Once published, it cannot be deleted and editing is limited.')) {
      return
    }

    try {
      const response = await fetch('/api/quizzes/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish quiz')
      }

      fetchQuiz()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish quiz')
    }
  }

  if (loading) {
    return <div>Loading quiz...</div>
  }

  if (error || !quiz) {
    return <div style={{ color: '#c33' }}>{error || 'Quiz not found'}</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{quiz.title}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  backgroundColor: quiz.state === 'PUBLISHED' ? '#efe' : '#ffe',
                  color: quiz.state === 'PUBLISHED' ? '#060' : '#660',
                }}
              >
                {quiz.state}
              </span>
              <span style={{ color: '#666' }}>Topic: {quiz.topic}</span>
            </div>
            {quiz.description && (
              <p style={{ color: '#666', marginTop: '0.5rem' }}>{quiz.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {quiz.state === 'DRAFT' && (
              <button
                onClick={handlePublish}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Publish Quiz
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Questions</h2>
        {quiz.questions.length === 0 ? (
          <p style={{ color: '#666' }}>No questions yet. Add your first question to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quiz.questions.map((question) => (
              <div
                key={question.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong>Question {question.order + 1}</strong>
                      {!question.editable && (
                        <span style={{ fontSize: '0.75rem', color: '#c33' }}>
                          (Read-only: {question.editabilityReason || 'Has answers'})
                        </span>
                      )}
                    </div>
                    <p>{question.prompt}</p>
                  </div>
                  {question.editable && (
                    <button
                      onClick={() => router.push(`/quizzes/${quizId}/questions/${question.id}/edit`)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={() => router.push(`/quizzes/${quizId}/questions/new`)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            + Add Question
          </button>
        </div>
      </div>
    </div>
  )
}

