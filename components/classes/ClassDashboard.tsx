'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface ClassData {
  id: string
  name: string
  classLink: string
  members: Array<{
    user: {
      id: string
      username: string
    }
    role: string
  }>
  teacher: {
    id: string
    username: string
  }
  activeQuiz?: {
    id: string
    title: string
    description?: string
  } | null
}

interface CompletedQuiz {
  quizId: string
  quizTitle: string
  quizTopic: string
  completedAt: string
  totalStudents: number
  studentsCompleted: number
}

export default function ClassDashboard() {
  const params = useParams()
  const classId = params?.id as string
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<'TEACHER' | 'STUDENT' | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [completedQuizzes, setCompletedQuizzes] = useState<CompletedQuiz[]>([])
  const [loadingCompleted, setLoadingCompleted] = useState(false)

  const fetchClassData = useCallback(async () => {
    try {
      const response = await fetch('/api/classes/list')
      if (!response.ok) {
        throw new Error('Failed to fetch class data')
      }
      const data = await response.json()
      
      // Find the class in either teacher or student classes
      const foundClass = [...(data.teacherClasses || []), ...(data.studentClasses || [])]
        .find((c: any) => c.id === classId)
      
      if (!foundClass) {
        setError('Class not found or you are not a member')
        return
      }

      setClassData(foundClass)
      setUserRole(foundClass.role as 'TEACHER' | 'STUDENT')
    } catch (err) {
      setError('Failed to load class data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [classId])

  const fetchCompletedQuizzes = useCallback(async () => {
    if (!classId) return
    
    setLoadingCompleted(true)
    try {
      const response = await fetch(`/api/results/player-class?classId=${classId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch completed quizzes')
      }
      const data = await response.json()
      
      // Get the current active quiz ID to exclude it from completed list
      const activeQuizId = classData?.activeQuiz?.id
      
      // Filter to only show completed quizzes (where all students have completed)
      // Also exclude the currently active quiz (if any) to avoid duplicates
      const completed = (data.quizzes || []).filter((quiz: any) => {
        const isFullyCompleted = quiz.completedAt && quiz.studentsCompleted === quiz.totalStudents
        const isNotActive = quiz.quizId !== activeQuizId
        return isFullyCompleted && isNotActive
      })
      
      // Sort by completedAt date (most recent first)
      completed.sort((a: CompletedQuiz, b: CompletedQuiz) => {
        const dateA = new Date(a.completedAt).getTime()
        const dateB = new Date(b.completedAt).getTime()
        return dateB - dateA
      })
      
      setCompletedQuizzes(completed)
    } catch (err) {
      console.error('Failed to load completed quizzes:', err)
    } finally {
      setLoadingCompleted(false)
    }
  }, [classId, classData?.activeQuiz?.id])

  useEffect(() => {
    if (classId) {
      fetchClassData()
      fetchCompletedQuizzes()
    }
  }, [classId, fetchClassData, fetchCompletedQuizzes])

  const copyClassCode = async () => {
    if (classData?.classLink) {
      try {
        await navigator.clipboard.writeText(classData.classLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = classData.classLink
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr)
        }
        document.body.removeChild(textArea)
      }
    }
  }

  const handleEditName = () => {
    if (classData) {
      setNewName(classData.name)
      setEditingName(true)
    }
  }

  const handleSaveName = async () => {
    if (!classData || !newName.trim()) {
      return
    }

    try {
      const response = await fetch('/api/classes/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: classData.id,
          name: newName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update class name')
      }

      const data = await response.json()
      setClassData(data.class)
      setEditingName(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update class name')
    }
  }

  const handleCancelEdit = () => {
    setEditingName(false)
    setNewName('')
  }

  const handleRemoveMember = async (memberUserId: string) => {
    if (!classData) return

    if (!confirm('Are you sure you want to remove this member from the class?')) {
      return
    }

    try {
      setRemovingMember(memberUserId)
      const response = await fetch(
        `/api/classes/remove-member?classId=${classData.id}&memberUserId=${memberUserId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      const data = await response.json()
      setClassData(data.class)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemovingMember(null)
    }
  }

  if (loading) {
    return <div>Loading class...</div>
  }

  if (error || !classData) {
    return <div style={{ color: '#c33' }}>{error || 'Class not found'}</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        {editingName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                flex: 1,
              }}
              autoFocus
            />
            <button
              onClick={handleSaveName}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#666',
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
          <>
            <h1 style={{ fontSize: '2rem', margin: 0, flex: 1 }}>{classData.name}</h1>
            {userRole === 'TEACHER' && (
              <button
                onClick={handleEditName}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Edit Name
              </button>
            )}
          </>
        )}
      </div>
      
      {userRole === 'TEACHER' && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
            Class Code (share this with students):
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0f7ff',
            border: '2px solid #0070f3',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              color: '#0070f3',
            }}>
              {classData.classLink}
            </div>
            <button
              onClick={copyClassCode}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: copied ? '#28a745' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Class Members</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Teacher Section */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#666' }}>Teacher</h3>
            {classData.members
              .filter((member) => member.role === 'TEACHER')
              .map((member) => (
                <div
                  key={member.user.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196f3',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1976d2' }}>
                      👨‍🏫 {member.user.username}
                    </span>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      Teacher
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* Students Section */}
          {classData.members.filter((member) => member.role === 'STUDENT').length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#666' }}>
                Students ({classData.members.filter((member) => member.role === 'STUDENT').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {classData.members
                  .filter((member) => member.role === 'STUDENT')
                  .map((member) => (
                    <div
                      key={member.user.id}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem' }}>{member.user.username}</span>
                      {userRole === 'TEACHER' && (
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          disabled={removingMember === member.user.id}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: removingMember === member.user.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            opacity: removingMember === member.user.id ? 0.6 : 1,
                          }}
                        >
                          {removingMember === member.user.id ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Active Quiz</h2>
        {classData.activeQuiz ? (
          <div style={{
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#fff',
          }}>
            <h3>{classData.activeQuiz.title}</h3>
            {classData.activeQuiz.description && (
              <p style={{ color: '#666', marginTop: '0.5rem' }}>{classData.activeQuiz.description}</p>
            )}
            {userRole === 'STUDENT' && (
              <p style={{ marginTop: '1rem', color: '#666' }}>
                Quiz participation features coming soon...
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No active quiz.</p>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Completed Quizzes</h2>
        {loadingCompleted ? (
          <p style={{ color: '#666' }}>Loading completed quizzes...</p>
        ) : completedQuizzes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {completedQuizzes.map((quiz) => (
              <div
                key={quiz.quizId}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{quiz.quizTitle}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                    {quiz.quizTopic}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#888' }}>
                    Completed: {new Date(quiz.completedAt).toLocaleDateString()} • {quiz.studentsCompleted}/{quiz.totalStudents} students
                  </p>
                </div>
                <a
                  href={`/results?classId=${classId}`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  View Results
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No completed quizzes yet.</p>
        )}
      </div>
    </div>
  )
}

