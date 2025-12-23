/**
 * Agreement scoring utility for partnership quiz attempts
 * Rules:
 * - A question is considered "agreed" only if ALL partnership members give the same answer
 * - Answers are compared using deep JSON equality
 * - If any member gives a different answer, the question is marked as "not agreed"
 * - Agreement scoring does NOT apply to class mode (individual results only)
 */

export interface AgreementResult {
  agreed: boolean
  answerCount: number
  uniqueAnswers: number
}

/**
 * Deep compare two JSON values for equality
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (a == null || b == null) return false

  if (typeof a !== typeof b) return false

  if (typeof a !== 'object') return a === b

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}

/**
 * Calculate agreement for a question in a partnership attempt
 * @param answers Array of answer data objects from all partnership members
 * @returns Agreement result
 */
export function calculateAgreement(answers: any[]): AgreementResult {
  if (answers.length === 0) {
    return {
      agreed: false,
      answerCount: 0,
      uniqueAnswers: 0,
    }
  }

  // Group answers by their JSON representation
  const uniqueAnswerGroups: any[][] = []

  for (const answer of answers) {
    let found = false
    for (const group of uniqueAnswerGroups) {
      if (deepEqual(group[0], answer)) {
        group.push(answer)
        found = true
        break
      }
    }
    if (!found) {
      uniqueAnswerGroups.push([answer])
    }
  }

  // Agreement means all answers are identical (only one unique group)
  const agreed = uniqueAnswerGroups.length === 1

  return {
    agreed,
    answerCount: answers.length,
    uniqueAnswers: uniqueAnswerGroups.length,
  }
}

/**
 * Calculate overall agreement score for an attempt
 * @param questionAgreements Array of agreement results for each question
 * @returns Overall score as percentage (0-100)
 */
export function calculateOverallScore(questionAgreements: AgreementResult[]): number {
  if (questionAgreements.length === 0) return 0

  const agreedCount = questionAgreements.filter((q) => q.agreed).length
  return Math.round((agreedCount / questionAgreements.length) * 100)
}

