'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AnswerType } from '@prisma/client'
import QuestionDisplay from '@/components/quizzes/QuestionDisplay'

export default function ClassResultsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      // Combine teacher and student classes for selection
      setClasses([...(data.teacherClasses || []), ...(data.studentClasses || [])])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatAnswer = (answer: any, answerType: AnswerType): string => {
    if (!answer) return 'Not answered'

    switch (answerType) {
      case AnswerType.FORCING_NON_FORCING:
        return answer.type === 'FORCING' ? 'Forcing' : 'Non-forcing'

      case AnswerType.DOUBLE_INTERPRETATION:
      case AnswerType.REDOUBLE_INTERPRETATION:
        return answer.option || 'Unknown'

      case AnswerType.FREE_ANSWER:
        const parts: string[] = []
        if (answer.intent) parts.push(answer.intent)
        if (answer.suit) {
          const suitSymbols: Record<string, string> = {
            CLUB: '♣',
            DIAMOND: '♦',
            HEART: '♥',
            SPADE: '♠',
            NO_TRUMP: 'NT',
          }
          // Handle multiple suits (format: "CLUB+DIAMOND")
          const suits = answer.suit.split('+').map((s: string) => suitSymbols[s] || s)
          parts.push(suits.join(' + '))
        }
        if (answer.strength) parts.push(answer.strength)
        return parts.join(' ') || 'Unknown'

      case AnswerType.MULTIPLE_CHOICE:
        return answer.option || 'Unknown'

      default:
        return JSON.stringify(answer)
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
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Completed: {new Date(quiz.completedAt).toLocaleDateString()} {new Date(quiz.completedAt).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                  {quiz.studentsAnswered} of {quiz.totalStudents} students answered
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
                {quiz.questions.map((question: any, idx: number) => (
                  <div
                    key={question.questionId}
                    style={{
                      padding: '1.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                    }}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                        Question {idx + 1}
                      </h3>
                      <p style={{ color: '#666', marginBottom: '1rem' }}>{question.prompt}</p>
                      {question.auction && (
                        <div style={{ marginBottom: '1rem' }}>
                          <QuestionDisplay
                            auction={question.auction}
                            prompt=""
                            questionOrder={idx}
                            totalQuestions={quiz.questions.length}
                          />
                        </div>
                      )}
                    </div>

                    {question.totalAnswers === 0 ? (
                      <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', color: '#666' }}>
                        No students have answered this question yet.
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
                          {question.totalAnswers} answer{question.totalAnswers !== 1 ? 's' : ''} received
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {question.answerDistribution.map((dist: any, distIdx: number) => (
                            <div
                              key={distIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.75rem',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '4px',
                                border: '1px solid #e0e0e0',
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                  {formatAnswer(dist.answer, question.answerType)}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                  {dist.count} student{dist.count !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div style={{ minWidth: '80px', textAlign: 'right' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0070f3' }}>
                                  {dist.percentage}%
                                </div>
                              </div>
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

