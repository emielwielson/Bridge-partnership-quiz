'use client'

import { useState, useEffect, useCallback } from 'react'
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
  creator?: {
    id: string
    username: string
  }
  creatorId?: string
}

export default function QuizEditor() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  const fetchQuiz = useCallback(async () => {
    try {
      const response = await fetch(`/api/quizzes/get?id=${quizId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch quiz')
      }
      const data = await response.json()
      setQuiz(data.quiz)
      setTitleValue(data.quiz.title)
      
      // Get current user ID
      const userResponse = await fetch('/api/auth/session')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.authenticated && userData.user) {
          setCurrentUserId(userData.user.id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    if (quizId) {
      fetchQuiz()
    }
  }, [quizId, fetchQuiz])

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

  const handleCopy = async () => {
    if (!confirm('This will create a copy of this quiz that you can edit. Continue?')) {
      return
    }

    try {
      const response = await fetch('/api/quizzes/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to copy quiz')
      }

      const data = await response.json()
      // Navigate to the copied quiz
      router.push(`/quizzes/${data.quiz.id}/edit`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to copy quiz')
    }
  }

  const isCreator = currentUserId && quiz && (quiz.creatorId === currentUserId || quiz.creator?.id === currentUserId)
  const canEditTitle = isCreator && quiz && quiz.state === 'DRAFT'

  const handleTitleSave = async () => {
    if (!quiz || !titleValue.trim()) {
      setTitleValue(quiz?.title || '')
      setEditingTitle(false)
      return
    }

    try {
      const response = await fetch('/api/quizzes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          title: titleValue.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update title')
      }

      // Update local state
      setQuiz({ ...quiz, title: titleValue.trim() })
      setEditingTitle(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update title')
      setTitleValue(quiz.title)
      setEditingTitle(false)
    }
  }

  const handleTitleCancel = () => {
    setTitleValue(quiz?.title || '')
    setEditingTitle(false)
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
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTitleSave()
                    } else if (e.key === 'Escape') {
                      handleTitleCancel()
                    }
                  }}
                  autoFocus
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    padding: '0.5rem',
                    border: '1px solid #0070f3',
                    borderRadius: '4px',
                    flex: 1,
                    maxWidth: '600px',
                  }}
                />
                <button
                  onClick={handleTitleSave}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleTitleCancel}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '2rem', margin: 0 }}>{quiz.title}</h1>
                {canEditTitle && (
                  <button
                    onClick={() => setEditingTitle(true)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'transparent',
                      color: '#0070f3',
                      border: '1px solid #0070f3',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
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
            {isCreator && quiz.state === 'DRAFT' && (
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
            <button
              onClick={handleCopy}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Copy Quiz
            </button>
            {quiz.state === 'PUBLISHED' && (
              <Link
                href={`/quizzes/${quizId}/start`}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Take Quiz
              </Link>
            )}
            {isCreator && quiz.state === 'PUBLISHED' && (
              <Link
                href={`/quizzes/${quizId}/results`}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                View Results
              </Link>
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
                  {question.editable && isCreator && (
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
        {isCreator && (
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
        )}
      </div>
    </div>
  )
}

