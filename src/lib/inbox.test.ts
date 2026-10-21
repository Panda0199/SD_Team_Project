import { describe, expect, it } from 'vitest'
import {
  appendConversationMessage,
  canReplyToConversation,
  conversationsForRole,
  createStudentMessage,
  filterConversations,
  flagConversationUrgent,
  initialConversations,
  markConversationSeen,
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

  it('shares messages between demo roles and limits the TA to assigned courses', () => {
    const conversation = initialConversations.find(({ id }) => id === 'statistics')!
    const withQuestion = appendConversationMessage(conversation, createStudentMessage('new-2', conversation.course, 'Could you explain the median?'), 'Student')
    expect(withQuestion).toMatchObject({ unreadForInstructor: true, preview: 'Could you explain the median?' })
    expect(markConversationSeen(withQuestion, 'Instructor')).toMatchObject({ unreadForInstructor: false, status: 'Seen' })
    expect(conversationsForRole(initialConversations, 'Teaching Assistant').map(({ course }) => course)).toEqual(['Research Methods'])
    const research = initialConversations.find(({ id }) => id === 'research')!
    expect(canReplyToConversation(research, 'Teaching Assistant')).toBe(true)
    expect(canReplyToConversation(initialConversations.find(({ id }) => id === 'statistics')!, 'Teaching Assistant')).toBe(false)
  })
})
