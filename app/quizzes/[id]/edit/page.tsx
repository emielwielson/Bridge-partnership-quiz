import QuizEditor from '@/components/quizzes/QuizEditor'
import Link from 'next/link'

export default function QuizEditPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '1200px',
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
      <QuizEditor />
    </main>
  )
}

