import { db } from '../lib/db'

async function clearAllResults() {
  try {
    console.log('Deleting all answers...')
    const deletedAnswers = await db.answer.deleteMany({})
    console.log(`Deleted ${deletedAnswers.count} answers`)

    console.log('Deleting all attempts...')
    const deletedAttempts = await db.attempt.deleteMany({})
    console.log(`Deleted ${deletedAttempts.count} attempts`)

    console.log('All results cleared successfully!')
  } catch (error) {
    console.error('Error clearing results:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

clearAllResults()

