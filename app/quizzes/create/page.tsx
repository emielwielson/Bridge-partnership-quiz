import CreateQuiz from '@/components/quizzes/CreateQuiz'
import Link from 'next/link'

export default function CreateQuizPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <Link
        href="/quizzes"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          color: '#0070f3',
          textDecoration: 'underline',
        }}
      >
        ← Back to Quizzes
      </Link>
      <CreateQuiz />
    </main>
  )
}

