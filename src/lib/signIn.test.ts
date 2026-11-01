import { describe, expect, it } from 'vitest'
import { toSignInEmail } from './signIn'

describe('toSignInEmail', () => {
  it('converts a university ID to a lowercase Quickly email', () => {
    expect(toSignInEmail('STUDENT-123')).toBe('student-123@quickly.test')
  })

  it('keeps an email address unchanged', () => {
    expect(toSignInEmail('Student@University.Edu')).toBe('Student@University.Edu')
  })

  it('trims whitespace around the input', () => {
    expect(toSignInEmail('  Student-123  ')).toBe('student-123@quickly.test')
  })

  it('returns an empty string for empty input', () => {
    expect(toSignInEmail('   ')).toBe('')
  })
})
