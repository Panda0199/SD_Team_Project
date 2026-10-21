import { describe, expect, it } from 'vitest'
import { searchProductItems } from '../../mcp/search'

describe('MCP product search', () => {
  it('finds fictional course, instructor, and message data case-insensitively', () => {
    expect(searchProductItems('research methods')).toMatchObject({
      count: 1,
      matches: [{ course: 'Research Methods', matchedFields: ['course'] }],
    })
    expect(searchProductItems('LINA')).toMatchObject({
      count: 1,
      matches: [{ course: 'Research Methods', instructor: 'Dr. Lina Kask', matchedFields: ['instructor'] }],
    })
    expect(searchProductItems('CITATION')).toMatchObject({
      count: 1,
      matches: [{
        course: 'Academic Writing',
        matchedFields: ['message'],
        matchingMessages: [{ text: 'Could you clarify the citation style for our course paper?' }],
      }],
    })
  })

  it('returns a clear no-match result', () => {
    expect(searchProductItems('Quantum Botany')).toEqual({
      query: 'Quantum Botany',
      count: 0,
      matches: [],
      message: 'No matching conversations found.',
    })
  })
})
