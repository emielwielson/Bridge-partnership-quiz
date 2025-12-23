'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import QuestionDisplay from '@/components/quizzes/QuestionDisplay'
import { AnswerType } from '@prisma/client'

interface Partnership {
  id: string
  members: Array<{
    user: {
      id: string
      username: string
    }
  }>
}

interface QuizResult {
  quizId: string
  quizTitle: string
  quizTopic: string
  partnershipId: string
  partnershipName: string
  completedAt: string
  overallScore: number
}

interface QuestionDetail {
  questionId: string
  order: number
  prompt: string
  answerType: AnswerType
  auction: any
  memberAnswers: Array<{
    userId: string
    username: string
    answer: any
  }>
  agreed: boolean
}

interface QuizDetail {
  quiz: {
    id: string
    title: string
    topic: string
  }
  partnership: {
    id: string
    members: Array<{
      id: string
      username: string
    }>
  }
  completedAt: string
  questions: QuestionDetail[]
}

export default function ResultsPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<string | null>(null)
  const [allResults, setAllResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)
  const [quizDetails, setQuizDetails] = useState<Map<string, QuizDetail>>(new Map())
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPartnerships()
  }, [])

  const fetchAllResults = useCallback(async () => {
    if (!currentUserId || partnerships.length === 0) {
      setLoadingResults(false)
      return
    }

    try {
      setLoadingResults(true)
      const results: QuizResult[] = []

      // Fetch results for each partnership
      for (const partnership of partnerships) {
        // Get partner ID (the other member, not the current user)
        const partnerId = partnership.members.find((m) => m.user.id !== currentUserId)?.user.id

        if (!partnerId) continue

        try {
          const response = await fetch(`/api/results/player-partnership?partnerId=${partnerId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.quizzes) {
              data.quizzes.forEach((quiz: any) => {
                // Get the most recent completed attempt for this quiz
                // Status is returned as a string from the API ('COMPLETED' or 'IN_PROGRESS')
                // Also check for completedAt timestamp as a fallback
                const completedAttempts = quiz.attempts.filter((a: any) => {
                  // Check status - handle both string and enum formats
                  const status = String(a.status || '').toUpperCase()
                  // Consider completed if status is COMPLETED OR if completedAt is set
                  return status === 'COMPLETED' || (a.completedAt !== null && a.completedAt !== undefined)
                })
                
                if (completedAttempts.length > 0) {
                  // Sort by completedAt date, most recent first
                  completedAttempts.sort((a: any, b: any) => {
                    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
                    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
                    return dateB - dateA
                  })
                  
                  // Use the most recent completed attempt
                  const mostRecentAttempt = completedAttempts[0]
                  
                  results.push({
                    quizId: quiz.quizId,
                    quizTitle: quiz.quizTitle,
                    quizTopic: quiz.quizTopic,
                    partnershipId: partnership.id,
                    partnershipName: partnership.members.map((m) => m.user.username).join(' - '),
                    completedAt: mostRecentAttempt.completedAt || mostRecentAttempt.startedAt,
                    overallScore: mostRecentAttempt.overallScore,
                  })
                }
              })
            }
          }
        } catch (err) {
          console.error(`Failed to fetch results for partnership ${partnership.id}:`, err)
        }
      }

      // Sort all results by completedAt date (most recent first)
      results.sort((a, b) => {
        const dateA = new Date(a.completedAt).getTime()
        const dateB = new Date(b.completedAt).getTime()
        return dateB - dateA
      })

      setAllResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingResults(false)
    }
  }, [currentUserId, partnerships])

  useEffect(() => {
    if (partnerships.length > 0 && currentUserId) {
      fetchAllResults()
    }
  }, [partnerships, currentUserId, fetchAllResults])

  const fetchPartnerships = async () => {
    try {
      const response = await fetch('/api/partnerships/list')
      if (!response.ok) {
        throw new Error('Failed to fetch partnerships')
      }
      const data = await response.json()
      setPartnerships(data.partnerships || [])
      setCurrentUserId(data.currentUserId)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  const getFilteredResults = () => {
    if (selectedPartnershipId) {
      return allResults.filter((r) => r.partnershipId === selectedPartnershipId)
    }
    return allResults
  }

  const fetchQuizDetails = async (quizId: string, partnershipId: string) => {
    if (quizDetails.has(`${quizId}-${partnershipId}`) || loadingDetails.has(`${quizId}-${partnershipId}`)) {
      return
    }

    try {
      loadingDetails.add(`${quizId}-${partnershipId}`)
      setLoadingDetails(new Set(loadingDetails))

      const response = await fetch(`/api/results/quiz-detail?quizId=${quizId}&partnershipId=${partnershipId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch quiz details')
      }

      const data = await response.json()
      const key = `${quizId}-${partnershipId}`
      setQuizDetails(new Map(quizDetails.set(key, data)))
    } catch (err) {
      console.error('Failed to fetch quiz details:', err)
    } finally {
      loadingDetails.delete(`${quizId}-${partnershipId}`)
      setLoadingDetails(new Set(loadingDetails))
    }
  }

  const handleQuizClick = (quizId: string, partnershipId: string) => {
    const key = `${quizId}-${partnershipId}`
    if (expandedQuizId === key) {
      setExpandedQuizId(null)
    } else {
      setExpandedQuizId(key)
      fetchQuizDetails(quizId, partnershipId)
    }
  }

  const formatAnswer = (answer: any, answerType: AnswerType): string => {
    if (!answer) return 'Not answered'

    switch (answerType) {
      case AnswerType.FORCING_NON_FORCING:
        return answer.type === 'FORCING' ? 'Forcing' : 'Non-forcing'

      case AnswerType.DOUBLE_INTERPRETATION:
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

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Results</h1>

      {/* Partnership Filter */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Filter by Partnership:
        </label>
        <select
          value={selectedPartnershipId || ''}
          onChange={(e) => setSelectedPartnershipId(e.target.value || null)}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '300px',
          }}
        >
          <option value="">All Partnerships</option>
          {partnerships.map((partnership) => (
            <option key={partnership.id} value={partnership.id}>
              {partnership.members.map((m) => m.user.username).join(' - ')}
            </option>
          ))}
        </select>
      </div>

      {/* Class Results Link */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/results/class"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          View Class Results
        </Link>
      </div>

      {loadingResults ? (
        <div>Loading results...</div>
      ) : getFilteredResults().length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          <p>No completed quizzes found.</p>
          {partnerships.length === 0 && (
            <p style={{ marginTop: '0.5rem' }}>
              You need to create a partnership to see results.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {getFilteredResults().map((result, idx) => {
            const detailKey = `${result.quizId}-${result.partnershipId}`
            const isExpanded = expandedQuizId === detailKey
            const detail = quizDetails.get(detailKey)
            const isLoadingDetail = loadingDetails.has(detailKey)

            return (
              <div
                key={`${result.partnershipId}-${result.quizId}-${idx}`}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#f5f5f5' : '#fff',
                  }}
                  onClick={() => handleQuizClick(result.quizId, result.partnershipId)}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                      {result.quizTitle}
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Partnership:</strong> {result.partnershipName}
                      </div>
                      <div>
                        <strong>Completed:</strong> {new Date(result.completedAt).toLocaleDateString()} {new Date(result.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0070f3' }}>
                        {result.overallScore}%
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                        agreed
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#666' }}>
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '1.5rem', borderTop: '1px solid #ddd', backgroundColor: '#fff' }}>
                    {isLoadingDetail ? (
                      <div>Loading question details...</div>
                    ) : detail ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {detail.questions.map((question, qIdx) => (
                          <div
                            key={question.questionId}
                            style={{
                              padding: '1.5rem',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              backgroundColor: question.agreed ? '#f0f9ff' : '#fff5f5',
                            }}
                          >
                            <div style={{ marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ fontSize: '1.1rem', margin: 0 }}>
                                  Question {question.order + 1}
                                </h4>
                                <div
                                  style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '4px',
                                    backgroundColor: question.agreed ? '#d4edda' : '#f8d7da',
                                    color: question.agreed ? '#155724' : '#721c24',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                  }}
                                >
                                  {question.agreed ? '✓ Agreed' : '✗ Disagreed'}
                                </div>
                              </div>
                            </div>

                            {question.auction && (
                              <div style={{ marginBottom: '1rem' }}>
                                <QuestionDisplay
                                  auction={question.auction}
                                  prompt={question.prompt}
                                  questionOrder={question.order}
                                  totalQuestions={detail.questions.length}
                                />
                              </div>
                            )}

                            <div style={{ marginTop: '1rem' }}>
                              <strong style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'block' }}>
                                Answers:
                              </strong>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {question.memberAnswers.map((memberAnswer) => (
                                  <div
                                    key={memberAnswer.userId}
                                    style={{
                                      padding: '1rem',
                                      backgroundColor: '#f9f9f9',
                                      borderRadius: '4px',
                                      border: '1px solid #e0e0e0',
                                    }}
                                  >
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                                      {memberAnswer.username}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#333' }}>
                                      {formatAnswer(memberAnswer.answer, question.answerType)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>Failed to load question details</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
