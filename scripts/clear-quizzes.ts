import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAllQuizzes() {
  try {
    console.log('Deleting all quizzes and related data...')
    
    // Delete all quizzes - this will cascade delete:
    // - Questions (and their auctions, bids, alerts)
    // - Answers
    // - Attempts
    // - Class activeQuizId references (will be set to null)
    const result = await prisma.quiz.deleteMany({})
    
    console.log(`Deleted ${result.count} quiz(es) and all related data.`)
  } catch (error) {
    console.error('Error clearing quizzes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearAllQuizzes()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to clear quizzes:', error)
    process.exit(1)
  })

