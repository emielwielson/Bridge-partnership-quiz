'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnswerType } from '@prisma/client'
import QuestionDisplay from './QuestionDisplay'
import ForcingNonForcingInput from './ForcingNonForcingInput'
import DoubleInterpretationInput from './DoubleInterpretationInput'
import FreeAnswerInput from './FreeAnswerInput'
import MultipleChoiceInput from './MultipleChoiceInput'

interface Question {
  id: string
  prompt: string
  order: number
  answerType: AnswerType
  answerOptions: string[] | null
  auction: {
    dealer: any
    vulnerability: any
    bids: Array<{
      bidType: any
      level?: number
      suit?: any
      position: string
      sequence: number
      alert?: {
        meaning: string
      }
    }>
  } | null
  userAnswer: {
    answerData: any
  } | null
}

interface QuizPlayerProps {
  attemptId: string
}

export default function QuizPlayer({ attemptId }: QuizPlayerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, any>>(new Map())
  const [saving, setSaving] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<Map<string, any>>(new Map())
  const [partnershipId, setPartnershipId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)

  useEffect(() => {
    fetchAttempt()
  }, [attemptId])

  const fetchAttempt = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/attempts/get?id=${attemptId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch attempt')
      }
      const data = await response.json()
      setQuiz(data.attempt.quiz)
      setQuestions(data.attempt.quiz.questions)

      // Store partnership info for redirect
      if (data.attempt.partnershipId && data.attempt.partnership) {
        setPartnershipId(data.attempt.partnershipId)
        // Find the partner ID (the other member, not the current user)
        // We need to get the current user ID from the session or from the attempt
        // The attempt has userId field which is the user who created the attempt
        const currentUserId = data.attempt.userId
        const partner = data.attempt.partnership.members.find(
          (m: any) => m.user.id !== currentUserId
        )
        if (partner) {
          setPartnerId(partner.user.id)
        }
      }

      // Load existing answers
      const answersMap = new Map()
      data.attempt.quiz.questions.forEach((q: Question) => {
        if (q.userAnswer) {
          answersMap.set(q.id, q.userAnswer.answerData)
        }
      })
      setAnswers(answersMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers.get(currentQuestion?.id)
  const pendingAnswer = pendingAnswers.get(currentQuestion?.id)

  const handleAnswerChange = (answerData: any) => {
    // Store pending answer locally
    const newPendingAnswers = new Map(pendingAnswers)
    newPendingAnswers.set(currentQuestion.id, answerData)
    setPendingAnswers(newPendingAnswers)
  }

  const saveAnswer = async (questionId: string, answerData: any) => {
    const existingAnswer = answers.get(questionId)
    const url = existingAnswer ? '/api/answers/update' : '/api/answers/submit'
    const method = existingAnswer ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        attemptId,
        answerData,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to save answer')
    }

    // Update local state
    const newAnswers = new Map(answers)
    newAnswers.set(questionId, answerData)
    setAnswers(newAnswers)
    
    // Remove from pending
    const newPendingAnswers = new Map(pendingAnswers)
    newPendingAnswers.delete(questionId)
    setPendingAnswers(newPendingAnswers)
  }

  const handleNext = async () => {
    if (!currentQuestion) return

    // Save current answer if there's a pending one
    const answerToSave = pendingAnswer || currentAnswer
    if (answerToSave) {
      setSaving(true)
      try {
        await saveAnswer(currentQuestion.id, answerToSave)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save answer')
        setSaving(false)
        return
      }
      setSaving(false)
    }

    // Move to next question or check completion
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // This is the last question - user has finished answering all questions
      // Update local answers state to include the just-saved answer
      if (answerToSave) {
        const newAnswers = new Map(answers)
        newAnswers.set(currentQuestion.id, answerToSave)
        setAnswers(newAnswers)
      }
      
      // Check if the attempt is completed (all partnership members finished)
      // If completed, go to results; otherwise, go to active quizzes
      try {
        const response = await fetch(`/api/attempts/get?id=${attemptId}`)
        if (response.ok) {
          const data = await response.json()
          const attempt = data.attempt
          
          // Check if attempt is completed
          const isCompleted = attempt.status === 'COMPLETED' || attempt.completedAt !== null
          
          if (isCompleted) {
            // All members have completed - go to results
            if (partnerId) {
              router.push(`/results/partnership?partnerId=${partnerId}`)
            } else {
              router.push('/results')
            }
          } else {
            // Not all members have completed yet - go to active quizzes
            router.push('/quizzes/active')
          }
        } else {
          // If we can't check status, default to active quizzes
          router.push('/quizzes/active')
        }
      } catch (err) {
        // If there's an error checking status, default to active quizzes
        router.push('/quizzes/active')
      }
    }
  }

  const handleSkip = async () => {
    // Save current answer if there's a pending one before skipping
    if (currentQuestion && pendingAnswer) {
      setSaving(true)
      try {
        await saveAnswer(currentQuestion.id, pendingAnswer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save answer')
        setSaving(false)
        return
      }
      setSaving(false)
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = async () => {
    // Save current answer if there's a pending one before going back
    if (currentQuestion && pendingAnswer) {
      setSaving(true)
      try {
        await saveAnswer(currentQuestion.id, pendingAnswer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save answer')
        setSaving(false)
        return
      }
      setSaving(false)
    }

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  if (loading) {
    return <div>Loading quiz...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  if (!currentQuestion) {
    return <div>No questions found</div>
  }

  const answeredCount = Array.from(answers.values()).filter((a) => a !== null).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', minHeight: '100vh' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Progress: {answeredCount} / {questions.length} answered
          </span>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {Math.round(progress)}%
          </span>
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
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#0070f3',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Question Display */}
      {currentQuestion.auction && (
        <QuestionDisplay
          auction={currentQuestion.auction as any}
          prompt={currentQuestion.prompt}
          questionOrder={currentQuestion.order}
          totalQuestions={questions.length}
        />
      )}

      {/* Answer Input */}
      <div style={{ marginBottom: '2rem' }}>
        {currentQuestion.answerType === AnswerType.FORCING_NON_FORCING && (
          <ForcingNonForcingInput
            value={pendingAnswer || currentAnswer || null}
            onChange={handleAnswerChange}
            disabled={saving}
          />
        )}

        {currentQuestion.answerType === AnswerType.DOUBLE_INTERPRETATION && (
          <DoubleInterpretationInput
            options={(currentQuestion.answerOptions as string[]) || ['Penalty', 'Take-out', 'Values']}
            value={pendingAnswer || currentAnswer || null}
            onChange={handleAnswerChange}
            disabled={saving}
          />
        )}

        {currentQuestion.answerType === AnswerType.FREE_ANSWER && (
          <FreeAnswerInput
            value={pendingAnswer || currentAnswer || null}
            onChange={handleAnswerChange}
            disabled={saving}
          />
        )}

        {currentQuestion.answerType === AnswerType.MULTIPLE_CHOICE && (
          <MultipleChoiceInput
            options={(currentQuestion.answerOptions as string[]) || []}
            value={pendingAnswer || currentAnswer || null}
            onChange={handleAnswerChange}
            disabled={saving}
          />
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || saving}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentQuestionIndex === 0 ? '#e0e0e0' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentQuestionIndex === 0 || saving ? 'not-allowed' : 'pointer',
          }}
        >
          Previous
        </button>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleSkip}
            disabled={currentQuestionIndex === questions.length - 1 || saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: currentQuestionIndex === questions.length - 1 || saving ? 'not-allowed' : 'pointer',
            }}
          >
            Skip
          </button>

          <button
            onClick={handleNext}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

