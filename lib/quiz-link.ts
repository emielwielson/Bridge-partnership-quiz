import { db } from './db'

const QUIZ_LINK_LENGTH = 12
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generate a random alphanumeric quiz link
 * @returns Random quiz link string
 */
function generateRandomLink(): string {
  let link = ''
  for (let i = 0; i < QUIZ_LINK_LENGTH; i++) {
    link += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))
  }
  return link
}

/**
 * Check if a quiz link is unique in the database
 * @param link - Quiz link to check
 * @returns True if link is unique (not in database)
 */
async function isQuizLinkUnique(link: string): Promise<boolean> {
  const existingQuiz = await db.quiz.findUnique({
    where: { publicLink: link },
  })
  return !existingQuiz
}

/**
 * Generate a unique quiz link
 * Checks database for uniqueness and retries if needed
 * @returns Unique quiz link
 */
export async function generateQuizLink(): Promise<string> {
  let link = generateRandomLink()
  let attempts = 0
  const maxAttempts = 100

  while (!(await isQuizLinkUnique(link))) {
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique quiz link after maximum attempts')
    }
    link = generateRandomLink()
    attempts++
  }

  return link
}

