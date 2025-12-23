'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Class {
  id: string
  name: string
  classLink: string
  createdAt: string
  role: string
  joinedAt: string
  members: Array<{
    user: {
      id: string
      username: string
    }
  }>
  activeQuiz?: {
    id: string
    title: string
  } | null
}

export default function ClassList() {
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([])
  const [studentClasses, setStudentClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes/list')
      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }
      const data = await response.json()
      setTeacherClasses(data.teacherClasses || [])
      setStudentClasses(data.studentClasses || [])
    } catch (err) {
      setError('Failed to load classes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading classes...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Classes</h2>

      {teacherClasses.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Classes I Teach</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {teacherClasses.map((classData) => (
              <div
                key={classData.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{classData.name}</strong>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Members: {classData.members.length} |{' '}
                  {classData.activeQuiz ? `Active Quiz: ${classData.activeQuiz.title}` : 'No active quiz'}
                </div>
                <Link
                  href={`/classes/${classData.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  Manage Class
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {studentClasses.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Classes I'm In</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {studentClasses.map((classData) => (
              <div
                key={classData.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{classData.name}</strong>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  {classData.activeQuiz ? `Active Quiz: ${classData.activeQuiz.title}` : 'No active quiz'}
                </div>
                <Link
                  href={`/classes/${classData.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  View Class
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {teacherClasses.length === 0 && studentClasses.length === 0 && (
        <div>
          <p>You're not in any classes yet.</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <Link
              href="/classes/create"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0070f3',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              Create Class
            </Link>
            <Link
              href="/classes/join"
              style={{
                padding: '0.5rem 1rem',
                color: '#0070f3',
                border: '1px solid #0070f3',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              Join Class
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

