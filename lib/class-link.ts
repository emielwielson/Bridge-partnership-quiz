import { db } from './db'

const CLASS_LINK_LENGTH = 10
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generate a random alphanumeric class link
 * @returns Random class link string
 */
function generateRandomLink(): string {
  let link = ''
  for (let i = 0; i < CLASS_LINK_LENGTH; i++) {
    link += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))
  }
  return link
}

/**
 * Check if a class link is unique in the database
 * @param link - Class link to check
 * @returns True if link is unique (not in database)
 */
async function isClassLinkUnique(link: string): Promise<boolean> {
  const existingClass = await db.class.findUnique({
    where: { classLink: link },
  })
  return !existingClass
}

/**
 * Generate a unique class link
 * Checks database for uniqueness and retries if needed
 * @returns Unique class link
 */
export async function generateClassLink(): Promise<string> {
  let link = generateRandomLink()
  let attempts = 0
  const maxAttempts = 100

  while (!(await isClassLinkUnique(link))) {
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique class link after maximum attempts')
    }
    link = generateRandomLink()
    attempts++
  }

  return link
}

