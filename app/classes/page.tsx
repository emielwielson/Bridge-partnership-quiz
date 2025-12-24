import ClassList from '@/components/classes/ClassList'
import ClassesHeader from '@/components/classes/ClassesHeader'

export default function ClassesPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <ClassesHeader />

      <ClassList />
    </main>
  )
}

