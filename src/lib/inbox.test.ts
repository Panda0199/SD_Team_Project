import { describe, expect, it } from 'vitest'
import {
  createStudentMessage,
  filterConversations,
  flagConversationUrgent,
  initialConversations,
  resolveConversation,
} from './inbox'

describe('local inbox data', () => {
  it('provides fictional course conversations with visible message statuses', () => {
    expect(initialConversations.map(({ status }) => status)).toEqual(['Replied', 'Seen', 'Sent', 'Replied'])
    expect(initialConversations.every((conversation) => conversation.messages.every((message) => message.course === conversation.course))).toBe(true)
  })

  it('creates a course-tagged student message in Sent state', () => {
    expect(createStudentMessage('new-1', 'Research Methods', 'How do I begin?')).toEqual({
      id: 'new-1',
      author: 'You',
      body: 'How do I begin?',
      direction: 'student',
      time: 'Just now',
      status: 'Sent',
      course: 'Research Methods',
    })
  })
  it('flags an unanswered conversation only after two hours', () => {
    const waiting = initialConversations.find(({ id }) => id === 'statistics')!
    const urgent = flagConversationUrgent(waiting)
    expect(urgent.urgent).toBe(true)
    expect(flagConversationUrgent(initialConversations[0])).toBe(initialConversations[0])
  })
  it('resolves a conversation without removing its message history', () => {
    const conversation = initialConversations.find(({ id }) => id === 'research')!
    const resolved = resolveConversation(conversation)
    expect(resolved.resolved).toBe(true)
    expect(resolved.messages).toEqual(conversation.messages)
  })
  it('filters by active or resolved and searches course, instructor, and message text', () => {
    expect(filterConversations(initialConversations, 'Active', 'Karin')).toHaveLength(1)
    expect(filterConversations(initialConversations, 'Active', 'open-ended')).toHaveLength(1)
    expect(filterConversations(initialConversations, 'Resolved', '')[0].course).toBe('Marketing Principles')
    expect(filterConversations(initialConversations, 'Active', 'no match')).toHaveLength(0)
  })
})
