'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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

interface Class {
  id: string
  name: string
  teacher: {
    id: string
    username: string
  }
}

interface QuizResult {
  quizId: string
  quizTitle: string
  quizTopic: string
  partnershipId?: string
  partnershipName?: string
  classId?: string
  className?: string
  completedAt: string
  overallScore?: number // Optional for class results
  attemptId?: string
  isClassResult?: boolean
  studentsCompleted?: number // For class results
  totalStudents?: number // For class results
}

interface QuestionDetail {
  questionId: string
  order: number
  prompt: string
  answerType: AnswerType
  auction: any
  memberAnswers?: Array<{
    userId: string
    username: string
    answer: any
  }>
  agreed?: boolean
  answerDistribution?: Array<{
    answer: any
    count: number
    percentage: number
  }>
  totalAnswers?: number
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
  } | null
  completedAt: string
  questions: QuestionDetail[]
  studentsCompleted?: number
  totalStudents?: number
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [allResults, setAllResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null)
  const [quizDetails, setQuizDetails] = useState<Map<string, QuizDetail>>(new Map())
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Check if partnershipId or classId is provided in URL query params
    const partnershipIdFromUrl = searchParams.get('partnershipId')
    const classIdFromUrl = searchParams.get('classId')
    if (partnershipIdFromUrl) {
      setSelectedPartnershipId(partnershipIdFromUrl)
      setSelectedClassId(null) // Clear class selection when partnership is selected
    }
    if (classIdFromUrl) {
      setSelectedClassId(classIdFromUrl)
      setSelectedPartnershipId(null) // Clear partnership selection when class is selected
    }
    fetchPartnerships()
    fetchClasses()
  }, [searchParams])

  const fetchAllResults = useCallback(async () => {
    if (!currentUserId) {
      setLoadingResults(false)
      return
    }

    try {
      setLoadingResults(true)
      const results: QuizResult[] = []

      // Fetch results for each partnership
      for (const partnership of partnerships) {
        try {
          const response = await fetch(`/api/results/player-partnership?partnershipId=${partnership.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.quizzes) {
              data.quizzes.forEach((quiz: any) => {
                // Show all completed attempts for this quiz
                // Status is returned as a string from the API ('COMPLETED' or 'IN_PROGRESS')
                // Also check for completedAt timestamp as a fallback
                const completedAttempts = quiz.attempts.filter((a: any) => {
                  // Check status - handle both string and enum formats
                  const status = String(a.status || '').toUpperCase()
                  // Consider completed if status is COMPLETED OR if completedAt is set
                  return status === 'COMPLETED' || (a.completedAt !== null && a.completedAt !== undefined)
                })
                
                // Add each completed attempt as a separate result entry
                completedAttempts.forEach((attempt: any) => {
                  results.push({
                    quizId: quiz.quizId,
                    quizTitle: quiz.quizTitle,
                    quizTopic: quiz.quizTopic,
                    partnershipId: partnership.id,
                    partnershipName: partnership.members.map((m) => m.user.username).join(' - '),
                    completedAt: attempt.completedAt || attempt.startedAt,
                    overallScore: attempt.overallScore,
                    attemptId: attempt.attemptId,
                    isClassResult: false,
                  })
                })
              })
            }
          }
        } catch (err) {
          console.error(`Failed to fetch results for partnership ${partnership.id}:`, err)
        }
      }

      // Fetch results for classes
      for (const cls of classes) {
        try {
          const response = await fetch(`/api/results/player-class?classId=${cls.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.quizzes && data.quizzes.length > 0) {
              data.quizzes.forEach((quiz: any) => {
                // Include all quizzes that have been started (even if not all students completed)
                if (quiz.completedAt) {
                  results.push({
                    quizId: quiz.quizId,
                    quizTitle: quiz.quizTitle,
                    quizTopic: quiz.quizTopic,
                    classId: cls.id,
                    className: cls.name,
                    completedAt: quiz.completedAt,
                    attemptId: quiz.quizId, // Use quizId as identifier for class results
                    isClassResult: true,
                    studentsCompleted: quiz.studentsCompleted || 0,
                    totalStudents: quiz.totalStudents || 0,
                  })
                }
              })
            }
          }
        } catch (err) {
          console.error(`Failed to fetch results for class ${cls.id}:`, err)
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
  }, [currentUserId, partnerships, classes])

  useEffect(() => {
    if (currentUserId && (partnerships.length > 0 || classes.length > 0)) {
      fetchAllResults()
    }
  }, [partnerships, classes, currentUserId, fetchAllResults])

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

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes/list')
      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }
      const data = await response.json()
      // Combine teacher and student classes
      const allClasses = [...(data.teacherClasses || []), ...(data.studentClasses || [])]
      setClasses(allClasses)
    } catch (err) {
      console.error(err)
    }
  }


  const getFilteredResults = () => {
    if (selectedPartnershipId) {
      return allResults.filter((r) => r.partnershipId === selectedPartnershipId)
    }
    if (selectedClassId) {
      return allResults.filter((r) => r.classId === selectedClassId)
    }
    return allResults
  }

  const fetchQuizDetails = async (quizId: string, partnershipId: string, attemptId?: string) => {
    const detailKey = attemptId ? `${quizId}-${partnershipId}-${attemptId}` : `${quizId}-${partnershipId}`
    if (quizDetails.has(detailKey) || loadingDetails.has(detailKey)) {
      return
    }

    try {
      loadingDetails.add(detailKey)
      setLoadingDetails(new Set(loadingDetails))

      const url = attemptId
        ? `/api/results/quiz-detail?quizId=${quizId}&partnershipId=${partnershipId}&attemptId=${attemptId}`
        : `/api/results/quiz-detail?quizId=${quizId}&partnershipId=${partnershipId}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch quiz details')
      }

      const data = await response.json()
      setQuizDetails(new Map(quizDetails.set(detailKey, data)))
    } catch (err) {
      console.error('Failed to fetch quiz details:', err)
    } finally {
      loadingDetails.delete(detailKey)
      setLoadingDetails(new Set(loadingDetails))
    }
  }

  const handleQuizClick = (quizId: string, partnershipId?: string, classId?: string, attemptId?: string, isClassResult?: boolean) => {
    if (isClassResult && classId) {
      // For class results, fetch class quiz details
      const key = `${quizId}-${classId}`
      if (expandedQuizId === key) {
        setExpandedQuizId(null)
      } else {
        setExpandedQuizId(key)
        fetchClassQuizDetails(quizId, classId)
      }
      return
    }
    
    if (!partnershipId) return
    
    const key = attemptId ? `${quizId}-${partnershipId}-${attemptId}` : `${quizId}-${partnershipId}`
    if (expandedQuizId === key) {
      setExpandedQuizId(null)
    } else {
      setExpandedQuizId(key)
      fetchQuizDetails(quizId, partnershipId, attemptId)
    }
  }

  const fetchClassQuizDetails = async (quizId: string, classId: string) => {
    const detailKey = `${quizId}-${classId}`
    if (quizDetails.has(detailKey) || loadingDetails.has(detailKey)) {
      return
    }

    try {
      loadingDetails.add(detailKey)
      setLoadingDetails(new Set(loadingDetails))

      const response = await fetch(`/api/results/player-class?classId=${classId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch class quiz details')
      }

      const data = await response.json()
      // Find the specific quiz in the results
      const quiz = data.quizzes?.find((q: any) => q.quizId === quizId)
      if (quiz) {
        setQuizDetails(new Map(quizDetails.set(detailKey, {
          quiz: {
            id: quiz.quizId,
            title: quiz.quizTitle,
            topic: quiz.quizTopic,
          },
          partnership: null,
          completedAt: quiz.completedAt,
          questions: quiz.questions.map((q: any, idx: number) => ({
            questionId: q.questionId,
            order: idx,
            prompt: q.prompt,
            answerType: q.answerType,
            auction: q.auction,
            answerDistribution: q.answerDistribution || [],
            totalAnswers: q.totalAnswers || 0,
          })),
          studentsCompleted: quiz.studentsCompleted || 0,
          totalStudents: quiz.totalStudents || 0,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch class quiz details:', err)
    } finally {
      loadingDetails.delete(detailKey)
      setLoadingDetails(new Set(loadingDetails))
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

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Results</h1>

      {/* Filter by Partnership or Class */}
      <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Filter by Partnership:
          </label>
          <select
            value={selectedPartnershipId || ''}
            onChange={(e) => {
              setSelectedPartnershipId(e.target.value || null)
              setSelectedClassId(null) // Clear class selection when partnership is selected
            }}
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
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Filter by Class:
          </label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => {
              setSelectedClassId(e.target.value || null)
              setSelectedPartnershipId(null) // Clear partnership selection when class is selected
            }}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minWidth: '300px',
            }}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Teacher: {cls.teacher.username})
              </option>
            ))}
          </select>
        </div>
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
            const detailKey = result.isClassResult
              ? `${result.quizId}-${result.classId}`
              : result.attemptId
              ? `${result.quizId}-${result.partnershipId}-${result.attemptId}`
              : `${result.quizId}-${result.partnershipId}`
            const isExpanded = expandedQuizId === detailKey
            const detail = quizDetails.get(detailKey)
            const isLoadingDetail = loadingDetails.has(detailKey)

            return (
              <div
                key={result.isClassResult ? `${result.classId}-${result.quizId}-${idx}` : `${result.partnershipId}-${result.quizId}-${idx}`}
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
                  onClick={() => handleQuizClick(result.quizId, result.partnershipId, result.classId, result.attemptId, result.isClassResult)}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                      {result.quizTitle}
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>{result.isClassResult ? 'Class' : 'Partnership'}:</strong>{' '}
                        {result.isClassResult ? result.className : result.partnershipName}
                      </div>
                      <div>
                        <strong>Completed:</strong> {new Date(result.completedAt).toLocaleDateString()} {new Date(result.completedAt).toLocaleTimeString()}
                      </div>
                      {result.isClassResult && result.totalStudents !== undefined && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: '#666', minWidth: '60px' }}>
                              Progress: {result.studentsCompleted || 0}/{result.totalStudents}
                            </div>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', maxWidth: '200px' }}>
                              <div
                                style={{
                                  height: '100%',
                                  backgroundColor: '#0070f3',
                                  width: `${result.totalStudents > 0 ? ((result.studentsCompleted || 0) / result.totalStudents) * 100 : 0}%`,
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {!result.isClassResult && result.overallScore !== undefined && (
                      <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0070f3' }}>
                          {result.overallScore}%
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                          agreed
                        </div>
                      </div>
                    )}
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
                              backgroundColor: !result.isClassResult && question.agreed !== undefined
                                ? (question.agreed ? '#d4edda' : '#f8d7da')
                                : '#fff',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <h4 style={{ fontSize: '1.1rem', margin: 0 }}>
                                Question {question.order + 1}
                              </h4>
                              {!result.isClassResult && question.agreed !== undefined && (
                                <div
                                  style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    backgroundColor: question.agreed ? '#d4edda' : '#f8d7da',
                                    color: question.agreed ? '#155724' : '#721c24',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    border: `1px solid ${question.agreed ? '#c3e6cb' : '#f5c6cb'}`,
                                  }}
                                >
                                  {question.agreed ? '✓ Agreed' : '× Disagreed'}
                                </div>
                              )}
                            </div>

                            {question.auction && (
                              <div style={{ marginBottom: '1rem' }}>
                                <QuestionDisplay
                                  auction={question.auction}
                                  prompt=""
                                  questionOrder={question.order}
                                  totalQuestions={detail.questions.length}
                                />
                              </div>
                            )}

                            {question.prompt && (
                              <p style={{ color: '#333', marginBottom: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>{question.prompt}</p>
                            )}

                            {result.isClassResult && question.answerDistribution && Array.isArray(question.answerDistribution) && question.answerDistribution.length > 0 ? (
                              <div>
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
                            ) : !result.isClassResult && (
                              <>

                            <div style={{ marginTop: '1rem' }}>
                              <strong style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'block' }}>
                                Answers:
                              </strong>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {question.memberAnswers?.map((memberAnswer) => (
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
                            </>
                            )}
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
