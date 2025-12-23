'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description?: string
  topic: string
  state: 'DRAFT' | 'PUBLISHED'
  creator: {
    id: string
    username: string
  }
  _count: {
    questions: number
  }
}

export default function QuizList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchQuizzes()
  }, [search, topic, page])

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (topic) params.append('topic', topic)
      params.append('page', page.toString())

      const response = await fetch(`/api/quizzes/list?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch quizzes')
      }
      const data = await response.json()
      setQuizzes(data.quizzes || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setError('Failed to load quizzes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopic(e.target.value)
    setPage(1)
  }

  // Predefined topics (can be extended)
  const topics = [
    '',
    'Opening Bids',
    'Overcalls',
    'Doubles',
    'Slam Bidding',
    'Competitive Bidding',
    'Conventions',
    'Other',
  ]

  if (loading && quizzes.length === 0) {
    return <div>Loading quizzes...</div>
  }

  if (error) {
    return <div style={{ color: '#c33' }}>{error}</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={handleSearchChange}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
          <select
            value={topic}
            onChange={handleTopicChange}
            style={{
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t || 'All Topics'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div>
          <p>No quizzes found.</p>
          <Link href="/quizzes/create" style={{ color: '#0070f3', textDecoration: 'underline' }}>
            Create a quiz
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
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
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                        <Link
                          href={`/quizzes/${quiz.id}/edit`}
                          style={{ color: '#0070f3', textDecoration: 'none' }}
                        >
                          {quiz.title}
                        </Link>
                      </h3>
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
                    </div>
                    {quiz.description && (
                      <p style={{ color: '#666', marginBottom: '0.5rem' }}>{quiz.description}</p>
                    )}
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      <span>Topic: {quiz.topic}</span>
                      <span style={{ marginLeft: '1rem' }}>Questions: {quiz._count.questions}</span>
                      <span style={{ marginLeft: '1rem' }}>By: {quiz.creator.username}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ padding: '0.5rem 1rem', alignSelf: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

