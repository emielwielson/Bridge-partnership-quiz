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

export default function ClassDashboard() {
  const params = useParams()
  const classId = params?.id as string
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<'TEACHER' | 'STUDENT' | null>(null)

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

  useEffect(() => {
    if (classId) {
      fetchClassData()
    }
  }, [classId, fetchClassData])

  const copyClassCode = () => {
    if (classData?.classLink) {
      navigator.clipboard.writeText(classData.classLink)
      alert('Class code copied to clipboard!')
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
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{classData.name}</h1>
      
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
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
              }}
            >
              Copy Code
            </button>
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Class Members</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {classData.members.map((member) => (
            <div key={member.user.id} style={{ padding: '0.5rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              {member.user.username} {member.role === 'TEACHER' && '(Teacher)'}
            </div>
          ))}
        </div>
      </div>

      {userRole === 'TEACHER' && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Teacher Controls</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Teacher features (start quiz, set active quiz, view results) coming soon...
          </p>
        </div>
      )}

      {userRole === 'STUDENT' && (
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
              <p style={{ marginTop: '1rem', color: '#666' }}>
                Quiz participation features coming soon...
              </p>
            </div>
          ) : (
            <p style={{ color: '#666' }}>No active quiz. Wait for your teacher to start one.</p>
          )}
        </div>
      )}
    </div>
  )
}

