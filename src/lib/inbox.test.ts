import { describe, expect, it } from 'vitest'
import {
  appendConversationMessage,
  canReplyToConversation,
  createCourseGroupConversations,
  createDemoCourseGroup,
  createDemoProfile,
  conversationsForRole,
  createReplyMessage,
  createStudentMessage,
  demoProfileIdForRole,
  filterConversations,
  flagConversationUrgent,
  initialConversations,
  initialDemoCourseGroups,
  initialDemoProfiles,
  markConversationSeen,
  resolveConversation,
} from './inbox'
import { label } from './labels'

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
  it('validates fictional profile/course creation and translates interface labels', () => {
    expect(createDemoProfile(initialDemoProfiles, 'Student', '', 'new-student')).toBeNull()
    expect(createDemoProfile(initialDemoProfiles, 'Student', 'Fictional Learner', 'student-jordan')).toBeNull()
    expect(createDemoProfile(initialDemoProfiles, 'Teaching Assistant', 'Taylor Example', 'ta-taylor')).toMatchObject({ name: 'Taylor Example', role: 'Teaching Assistant' })
    expect(createDemoProfile(initialDemoProfiles, 'Student', 'Another Learner', 'student jordan')).toBeNull()
    expect(createDemoCourseGroup(initialDemoCourseGroups, initialDemoProfiles, 'New course', '', ['p1'])).toBeNull()
    expect(createDemoCourseGroup(initialDemoCourseGroups, initialDemoProfiles, 'New course', 'p2', [])).toBeNull()
    expect(createDemoCourseGroup(initialDemoCourseGroups, initialDemoProfiles, 'New course', 'p1', ['p1'])).toBeNull()
    expect(createDemoCourseGroup(initialDemoCourseGroups, initialDemoProfiles, 'New course', 'p2', ['p1'], 'p3')).toMatchObject({ name: 'New course', instructorId: 'p2', studentIds: ['p1'], taId: 'p3' })
    expect(label('ET', 'adminTitle')).toBe('Profiilide ja kursuste haldus')
  })

  it('creates empty per-student course threads and scopes them to assigned demo accounts', () => {
    const profiles = [
      ...initialDemoProfiles,
      { id: 'p4', name: 'Demo Student', demoId: 'student-demo', role: 'Student' as const },
      { id: 'p5', name: 'Ami', demoId: 'instructor-ami', role: 'Instructor' as const },
      { id: 'p6', name: 'Taylor Student', demoId: 'student-taylor', role: 'Student' as const },
      { id: 'p7', name: 'Riley TA', demoId: 'ta-riley', role: 'Teaching Assistant' as const },
    ]
    const group = createDemoCourseGroup([], profiles, 'Mobile Application Development', 'p5', ['p1', 'p4'], 'p3')!
    const threads = createCourseGroupConversations([group], profiles, initialConversations)

    expect(threads).toHaveLength(2)
    expect(threads.every((thread) => thread.messages.length === 0)).toBe(true)
    expect(conversationsForRole(threads, 'Student', [group], 'p1')).toHaveLength(1)
    expect(conversationsForRole(threads, 'Student', [group], 'p4')).toHaveLength(1)
    expect(conversationsForRole(threads, 'Student', [group], 'p6')).toHaveLength(0)
    expect(conversationsForRole(threads, 'Instructor', [group], 'p5')).toHaveLength(2)
    expect(conversationsForRole(threads, 'Instructor', [group], 'p2')).toHaveLength(0)
    expect(conversationsForRole(threads, 'Teaching Assistant', [group], 'p3')).toHaveLength(2)
    expect(conversationsForRole(threads, 'Teaching Assistant', [group], 'p7')).toHaveLength(0)
    expect(canReplyToConversation(threads[0], 'Instructor', [group], 'p5')).toBe(true)
    expect(canReplyToConversation(threads[0], 'Instructor', [group], 'p2')).toBe(false)
    expect(canReplyToConversation(threads[0], 'Teaching Assistant', [group], 'p3')).toBe(true)
    expect(canReplyToConversation(threads[0], 'Teaching Assistant', [group], 'p7')).toBe(false)
    expect(demoProfileIdForRole('Instructor', profiles, [group])).toBe('p5')
    expect(demoProfileIdForRole('Teaching Assistant', profiles, [group])).toBe('p3')
  })

  it('delivers the first new-course question with Sent, Seen, and reply updates', () => {
    const group = createDemoCourseGroup(initialDemoCourseGroups, initialDemoProfiles, 'New Demo Course', 'p2', ['p1'], 'p3')!
    const [emptyThread] = createCourseGroupConversations([group], initialDemoProfiles, initialConversations)
    const question = createStudentMessage('new-course-question', emptyThread.course, 'How do I start?', 'Jordan Doe')
    const sentThread = appendConversationMessage(emptyThread, question, 'Student')
    expect(sentThread).toMatchObject({ preview: 'How do I start?', unreadForInstructor: true, status: 'Sent' })
    expect(sentThread.messages[0].status).toBe('Sent')
    expect(markConversationSeen(sentThread, 'Instructor')).toMatchObject({ status: 'Seen', unreadForInstructor: false })
    const repliedThread = appendConversationMessage(sentThread, {
      ...createReplyMessage('new-course-reply', emptyThread.course, 'Start with the course outline.', 'Instructor', emptyThread.instructor, 'Ami'),
    }, 'Instructor')
    expect(repliedThread).toMatchObject({ status: 'Replied', unreadForStudent: true })
    expect(repliedThread.messages[1]).toMatchObject({ author: 'Ami', direction: 'instructor', status: 'Replied' })
    const taReply = createReplyMessage('new-course-ta-reply', emptyThread.course, 'Ask the TA too.', 'Teaching Assistant', emptyThread.instructor, 'Sam Lee')
    const taRepliedThread = appendConversationMessage(repliedThread, taReply, 'Teaching Assistant')
    expect(taRepliedThread).toMatchObject({ status: 'Replied', unreadForStudent: true })
    expect(taRepliedThread.messages[2]).toMatchObject({ author: 'Sam Lee', direction: 'ta', status: 'Replied' })
  })
})
