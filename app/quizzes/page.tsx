import QuizList from '@/components/quizzes/QuizList'
import Link from 'next/link'

export default function QuizzesPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>Quizzes</h1>
        <Link
          href="/quizzes/create"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Create Quiz
        </Link>
      </div>

      <QuizList />
    </main>
  )
}

