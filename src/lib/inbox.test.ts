import { describe, expect, it } from 'vitest'
import {
  appendConversationMessage,
  canReplyToConversation,
  createCourseGroupConversations,
  createDemoSummary,
  createDemoCourseGroup,
  createDemoProfile,
  explainDemoReplySimply,
  conversationsForRole,
  createReplyMessage,
  createStudentMessage,
  demoProfileIdForRole,
  filterConversations,
  flagConversationUrgent,
  initialConversations,
  initialDemoCourseGroups,
  initialDemoProfiles,
  isLongStudentMessage,
  isWaitingForReply,
  markConversationSeen,
  resolveConversation,
} from './inbox'
import { label } from './labels'

describe('local inbox data', () => {
  it('creates local AI demo derivations without changing or sending human messages', () => {
    const originalBody = 'Please explain the assignment. I have reviewed the requirements and need help understanding the next step. '.repeat(3)
    const original = createStudentMessage('long-question', 'Research Methods', originalBody)
    const before = { ...original }
    expect(isLongStudentMessage(original)).toBe(true)
    expect(isLongStudentMessage(createStudentMessage('short-question', 'Research Methods', 'One quick question?'))).toBe(false)

    const summary = createDemoSummary(original.body)
    expect(summary).toContain('Student needs help')
    expect(summary.length).toBeLessThan(original.body.length)
    expect(original).toEqual(before)

    const reply = 'Utilize the outline prior to commencing your work.'
    expect(explainDemoReplySimply(reply)).toBe('In simpler words: use the outline before commencing your work.')
    expect(reply).toBe('Utilize the outline prior to commencing your work.')
    expect(label('EN', 'aiSummaryLabel')).toBe('AI summary · Demo')
    expect(label('EN', 'aiExplanationLabel')).toBe('AI explanation · Demo')
    expect(label('EN', 'transcriptLabel')).toBe('Transcript · Demo')
    expect(label('EN', 'voiceDemoNotice')).toContain('No audio is recorded or uploaded')
    expect(label('ET', 'aiSummaryLabel')).toBe('AI kokkuvõte · Demo')
    expect(label('ET', 'aiExplanationLabel')).toBe('AI selgitus · Demo')
    expect(label('ET', 'transcriptLabel')).toBe('Transkriptsioon · Demo')
  })

  it('extracts the question and problem details instead of truncating a long message opening', () => {
    const body = 'I am working on the next assignment and I understand the first part, but I am confused about the second section where we need to compare the methods. I am not sure which method should be used and what kind of example I should include. Could you please clarify what I should focus on before I continue?'
    const original = createStudentMessage('comparison-question', 'Research Methods', body)
    const originalBody = original.body
    const summary = createDemoSummary(original.body)

    expect(summary.length).toBeLessThan(body.length)
    expect(summary).not.toBe(`Key point: ${body.slice(0, 18)}…`)
    expect(summary).not.toContain(body.slice(0, 90))
    expect(summary).toContain('first part')
    expect(summary).toContain('assignment')
    expect(summary).toContain('comparison method')
    expect(summary).toContain('example')
    expect(summary).toContain('focus on before continuing')
    expect(summary.split(/\s+/).length).toBeGreaterThanOrEqual(15)
    expect(summary.split(/\s+/).length).toBeLessThanOrEqual(30)
    expect(original.body).toBe(originalBody)

    const secondQuestion = 'I am preparing my research report and have read the instructions, but I am unsure how many sources are required. I also do not know whether the references count toward the word limit. Could you clarify what should be included in the appendix before I submit?'
    const secondSummary = createDemoSummary(secondQuestion)
    expect(secondSummary).toContain('sources')
    expect(secondSummary).toContain('references')
    expect(secondSummary).toContain('appendix')
  })

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
  it('flags an unanswered conversation after the two-hour boundary', () => {
    const waiting = initialConversations.find(({ id }) => id === 'statistics')!
    expect(flagConversationUrgent({ ...waiting, waitingHours: 1.5 }).urgent).toBe(false)
    expect(flagConversationUrgent({ ...waiting, waitingHours: 2 + 10 / 60 }).urgent).toBe(true)
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
    expect(filterConversations(initialConversations, 'Active', 'Research', 'course')).toHaveLength(1)
    expect(filterConversations(initialConversations, 'Active', 'Karin', 'instructor')).toHaveLength(1)
    expect(filterConversations(initialConversations, 'Active', 'open-ended', 'instructor')).toHaveLength(0)
    expect(filterConversations(initialConversations, 'Resolved', '')[0].course).toBe('Marketing Principles')
    expect(filterConversations(initialConversations, 'Active', 'no match')).toHaveLength(0)
  })

  it('shows waiting status only while the latest student message needs a reply', () => {
    const sent = initialConversations.find(({ id }) => id === 'statistics')!
    expect(isWaitingForReply(sent)).toBe(true)
    expect(isWaitingForReply(markConversationSeen(sent, 'Instructor'))).toBe(true)
    expect(isWaitingForReply(initialConversations.find(({ id }) => id === 'research')!)).toBe(false)
    const replied = appendConversationMessage(sent, createReplyMessage('reply', sent.course, 'Here is an answer.', 'Instructor', sent.instructor), 'Instructor')
    expect(isWaitingForReply(replied)).toBe(false)
    expect(isWaitingForReply(resolveConversation(sent))).toBe(false)
    expect(markConversationSeen(replied, 'Student').unreadForStudent).toBe(false)
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

  it('marks every unanswered student message seen when an instructor or assigned TA opens the thread', () => {
    const original = initialConversations.find(({ id }) => id === 'research')!
    const withFirstQuestion = appendConversationMessage(
      original,
      createStudentMessage('unanswered-1', original.course, 'First unanswered question?'),
      'Student',
    )
    const withTwoQuestions = appendConversationMessage(
      withFirstQuestion,
      createStudentMessage('unanswered-2', original.course, 'Second unanswered question?'),
      'Student',
    )

    for (const reader of ['Instructor', 'Teaching Assistant'] as const) {
      expect(canReplyToConversation(withTwoQuestions, reader)).toBe(true)
      const seen = markConversationSeen(withTwoQuestions, reader)
      expect(seen.messages.filter((message) => message.id.startsWith('unanswered-')).map(({ status }) => status))
        .toEqual(['Seen', 'Seen'])
      expect(seen.status).toBe('Seen')
      expect(seen.unreadForInstructor).toBe(false)
    }
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
    expect(label('EN', 'waitingForReply')).toBe('Waiting for reply')
    expect(label('ET', 'waitingForReply')).toBe('Vastust oodates')
    expect(label('EN', 'teacherInstructor')).toBe('Teacher / Instructor')
    expect(label('ET', 'teacherInstructor')).toBe('Õpetaja / õppejõud')
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
