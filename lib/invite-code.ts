import { db } from './db'

const INVITE_CODE_LENGTH = 8
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generate a random alphanumeric invite code
 * @returns Random invite code string
 */
function generateRandomCode(): string {
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))
  }
  return code
}

/**
 * Check if an invite code is unique in the database
 * @param code - Invite code to check
 * @returns True if code is unique (not in database)
 */
async function isInviteCodeUnique(code: string): Promise<boolean> {
  const existingUser = await db.user.findUnique({
    where: { inviteCode: code },
  })
  return !existingUser
}

/**
 * Generate a unique invite code
 * Checks database for uniqueness and retries if needed
 * @returns Unique invite code
 */
export async function generateInviteCode(): Promise<string> {
  let code = generateRandomCode()
  let attempts = 0
  const maxAttempts = 100

  while (!(await isInviteCodeUnique(code))) {
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique invite code after maximum attempts')
    }
    code = generateRandomCode()
    attempts++
  }

  return code
}

