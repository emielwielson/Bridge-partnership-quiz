import { PrismaClient, AttemptStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function clearActiveAttempts() {
  try {
    console.log('Deleting all active (IN_PROGRESS) attempts and related data...')
    
    // Delete all IN_PROGRESS attempts - this will cascade delete:
    // - Answers
    const result = await prisma.attempt.deleteMany({
      where: {
        status: AttemptStatus.IN_PROGRESS,
      },
    })
    
    console.log(`Deleted ${result.count} active attempt(s) and all related data.`)
  } catch (error) {
    console.error('Error clearing active attempts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearActiveAttempts()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to clear active attempts:', error)
    process.exit(1)
  })

