import { describe, expect, it } from 'vitest'
import { createStudentMessage, initialConversations } from './inbox'

describe('local inbox data', () => {
  it('provides fictional course conversations with visible message statuses', () => {
    expect(initialConversations.map(({ status }) => status)).toEqual(['Replied', 'Seen', 'Sent'])
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
})
