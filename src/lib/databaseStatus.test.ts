import { describe, expect, it } from 'vitest'
import { databaseStatus } from './databaseStatus'

describe('databaseStatus', () => {
  it('says not-connected when nothing is set', () => {
    expect(databaseStatus(undefined, undefined)).toBe('not-connected')
  })

  it('says not-connected when the example values are still there', () => {
    expect(databaseStatus('https://your-project.supabase.co', 'your-anon-key')).toBe('not-connected')
  })

  it('says connected when both values are real', () => {
    expect(databaseStatus('https://abcd.supabase.co', 'eyJ-real-key')).toBe('connected')
  })
})
