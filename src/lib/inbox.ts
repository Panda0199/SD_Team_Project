export type MessageStatus = 'Sent' | 'Seen' | 'Replied'
export type InstructorAvailability = 'Available' | 'Away'
export type ConversationFilter = 'Active' | 'Resolved'
export type DemoRole = 'Student' | 'Instructor' | 'Teaching Assistant' | 'Admin'
export type ReplyRole = 'Instructor' | 'Teaching Assistant'

export type ProfileRole = Exclude<DemoRole, 'Admin'>
export interface DemoProfile { id: string; name: string; demoId: string; role: ProfileRole }
export interface DemoCourseGroup { id: string; name: string; instructorId: string; studentIds: string[]; taId: string }

export function createDemoProfile(profiles: DemoProfile[], role: ProfileRole, name: string, demoId: string): DemoProfile | null {
  const cleanName = name.trim()
  const cleanId = demoId.trim()
  const id = `profile-${cleanId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  if (!cleanName || !cleanId || profiles.some((profile) =>
    profile.demoId.toLowerCase() === cleanId.toLowerCase()
    || `profile-${profile.demoId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` === id
  )) return null
  return { id, name: cleanName, demoId: cleanId, role }
}

export function createDemoCourseGroup(groups: DemoCourseGroup[], profiles: DemoProfile[], name: string, instructorId: string, studentIds: string[], taId = ''): DemoCourseGroup | null {
  const cleanName = name.trim()
  const id = `course-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const instructor = profiles.find((profile) => profile.id === instructorId)
  const students = studentIds.map((studentId) => profiles.find((profile) => profile.id === studentId))
  const ta = taId ? profiles.find((profile) => profile.id === taId) : undefined
  if (!cleanName || !instructor || instructor.role !== 'Instructor' || !studentIds.length
    || students.some((profile) => !profile || profile.role !== 'Student')
    || (taId && (!ta || ta.role !== 'Teaching Assistant'))
    || groups.some((group) => group.name.toLowerCase() === cleanName.toLowerCase() || group.id === id)) return null
  return { id, name: cleanName, instructorId, studentIds: [...new Set(studentIds)], taId }
}

export const initialDemoProfiles: DemoProfile[] = [
  { id: 'p1', name: 'Jordan Doe', demoId: 'student-jordan', role: 'Student' },
  { id: 'p2', name: 'Dr. Lina Kask', demoId: 'instructor-lina', role: 'Instructor' },
  { id: 'p3', name: 'Sam Lee', demoId: 'ta-sam', role: 'Teaching Assistant' },
]

export const initialDemoCourseGroups: DemoCourseGroup[] = [
  { id: 'g1', name: 'Research Methods', instructorId: 'p2', studentIds: ['p1'], taId: 'p3' },
]

export const DEMO_STUDENT_NAME = 'Jordan Doe'
export const TEACHING_ASSISTANT_NAME = 'Sam Lee'

export interface Message {
  id: string
  author: string
  body: string
  direction: 'student' | 'instructor' | 'ta'
  time: string
  status?: MessageStatus
  course: string
}

export interface Conversation {
  id: string
  course: string
  instructor: string
  availability: InstructorAvailability
  preview: string
  updatedAt: string
  status: MessageStatus
  waitingHours: number
  urgent: boolean
  resolved: boolean
  unreadForInstructor: boolean
  unreadForStudent: boolean
  messages: Message[]
  courseGroupId?: string
  studentId?: string
  studentName?: string
}

export function demoProfileIdForRole(role: DemoRole, profiles: DemoProfile[], groups: DemoCourseGroup[]): string | undefined {
  if (role === 'Student') {
    return profiles.find((profile) => profile.id === 'p1' && profile.role === role)?.id
      ?? profiles.find((profile) => profile.role === role)?.id
  }
  if (role === 'Instructor') {
    return groups.findLast((group) => profiles.some((profile) => profile.id === group.instructorId && profile.role === role))?.instructorId
      ?? profiles.find((profile) => profile.role === role)?.id
  }
  if (role === 'Teaching Assistant') {
    return groups.findLast((group) => profiles.some((profile) => profile.id === group.taId && profile.role === role))?.taId
      ?? profiles.find((profile) => profile.role === role)?.id
  }
  return undefined
}

export function createCourseGroupConversations(
  groups: DemoCourseGroup[],
  profiles: DemoProfile[],
  conversations: Conversation[],
): Conversation[] {
  const newConversations: Conversation[] = []
  for (const group of groups) {
    if (conversations.some((conversation) => !conversation.courseGroupId && conversation.course === group.name)) continue
    const instructor = profiles.find((profile) => profile.id === group.instructorId && profile.role === 'Instructor')
    if (!instructor) continue
    for (const studentId of group.studentIds) {
      const student = profiles.find((profile) => profile.id === studentId && profile.role === 'Student')
      if (!student || conversations.some((conversation) => conversation.courseGroupId === group.id && conversation.studentId === studentId)
        || newConversations.some((conversation) => conversation.courseGroupId === group.id && conversation.studentId === studentId)) continue
      newConversations.push({
        id: `${group.id}-${student.id}`,
        course: group.name,
        instructor: instructor.name,
        availability: 'Available',
        preview: '',
        updatedAt: 'New',
        status: 'Sent',
        waitingHours: 0,
        urgent: false,
        resolved: false,
        unreadForInstructor: false,
        unreadForStudent: false,
        messages: [],
        courseGroupId: group.id,
        studentId: student.id,
        studentName: student.name,
      })
    }
  }
  return newConversations
}

export function createStudentMessage(id: string, course: string, body: string, author = 'You'): Message {
  return { id, author, body, direction: 'student', time: 'Just now', status: 'Sent', course }
}

export function createReplyMessage(
  id: string,
  course: string,
  body: string,
  role: ReplyRole,
  instructor: string,
  author?: string,
): Message {
  const isTeachingAssistant = role === 'Teaching Assistant'
  return { id, author: author ?? (isTeachingAssistant ? TEACHING_ASSISTANT_NAME : instructor), body, direction: isTeachingAssistant ? 'ta' : 'instructor', time: 'Just now', status: 'Replied', course }
}

export function appendConversationMessage(
  conversation: Conversation,
  message: Message,
  sender: DemoRole,
): Conversation {
  return { ...conversation, messages: [...conversation.messages, message], preview: message.body, status: sender === 'Student' ? 'Sent' : 'Replied', waitingHours: 0, urgent: false, updatedAt: 'Just now', unreadForInstructor: sender === 'Student', unreadForStudent: sender !== 'Student' }
}

export function markConversationSeen(conversation: Conversation, reader: DemoRole): Conversation {
  if (reader === 'Student') {
    return { ...conversation, unreadForStudent: false }
  }

  const lastStudentMessageIndex = conversation.messages.findLastIndex((message) => message.direction === 'student')
  return {
    ...conversation,
    messages: conversation.messages.map((message, index) =>
      index === lastStudentMessageIndex && message.status === 'Sent' ? { ...message, status: 'Seen' as const } : message),
    status: conversation.status === 'Sent' ? 'Seen' : conversation.status,
    unreadForInstructor: false,
  }
}

export function conversationsForRole(
  conversations: Conversation[],
  role: DemoRole,
  groups: DemoCourseGroup[] = initialDemoCourseGroups,
  profileId = role === 'Student' ? 'p1' : role === 'Instructor' ? 'p2' : 'p3',
): Conversation[] {
  if (role === 'Admin') return []
  return conversations.filter((conversation) => {
    if (!conversation.courseGroupId) {
      return role !== 'Teaching Assistant'
        || groups.some((group) => group.taId === profileId && group.name === conversation.course)
    }
    const group = groups.find((item) => item.id === conversation.courseGroupId)
    if (!group) return false
    if (role === 'Student') return conversation.studentId === profileId && group.studentIds.includes(profileId)
    if (role === 'Instructor') return group.instructorId === profileId
    return group.taId === profileId
  })
}

export function canReplyToConversation(
  conversation: Conversation,
  role: DemoRole,
  groups: DemoCourseGroup[] = initialDemoCourseGroups,
  profileId = role === 'Teaching Assistant' ? 'p3' : undefined,
): boolean {
  if (role === 'Instructor' && !conversation.courseGroupId) return true
  return conversationsForRole([conversation], role, groups, profileId).length > 0
}

export function flagConversationUrgent(conversation: Conversation): Conversation {
  if (conversation.resolved || conversation.status === 'Replied' || conversation.waitingHours <= 2) {
    return conversation
  }
  return { ...conversation, urgent: true }
}

export function resolveConversation(conversation: Conversation): Conversation {
  return { ...conversation, resolved: true }
}

export function filterConversations(
  conversations: Conversation[],
  filter: ConversationFilter,
  query: string,
): Conversation[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return conversations.filter((conversation) => {
    const matchesFilter = filter === 'Resolved' ? conversation.resolved : !conversation.resolved
    const searchableText = [
      conversation.course,
      conversation.instructor,
      ...conversation.messages.map((message) => message.body),
    ].join(' ').toLocaleLowerCase()
    return matchesFilter && (!normalizedQuery || searchableText.includes(normalizedQuery))
  })
}

export const initialConversations: Conversation[] = [
  {
    id: 'research',
    course: 'Research Methods',
    instructor: 'Dr. Lina Kask',
    availability: 'Available',
    preview: 'Thanks, that clears it up!',
    updatedAt: '10:42',
    status: 'Replied',
    waitingHours: 0,
    urgent: false,
    resolved: false,
    unreadForInstructor: false,
    unreadForStudent: false,
    messages: [
      { id: 'r1', author: 'You', body: 'Should our survey include open-ended questions?', direction: 'student', time: 'Today, 10:12', status: 'Replied', course: 'Research Methods' },
      { id: 'r2', author: 'Dr. Lina Kask', body: 'A couple can be useful. Keep them focused on your research question.', direction: 'instructor', time: 'Today, 10:30', course: 'Research Methods' },
      { id: 'r3', author: 'You', body: 'Thanks, that clears it up!', direction: 'student', time: 'Today, 10:42', course: 'Research Methods' },
    ],
  },
  {
    id: 'writing',
    course: 'Academic Writing',
    instructor: 'Lect. Marko Saar',
    availability: 'Away',
    preview: 'Could you clarify the citation style?',
    updatedAt: 'Yesterday',
    status: 'Seen',
    waitingHours: 5,
    urgent: false,
    resolved: false,
    unreadForInstructor: false,
    unreadForStudent: false,
    messages: [
      { id: 'w1', author: 'You', body: 'Could you clarify the citation style for our course paper?', direction: 'student', time: 'Yesterday, 14:06', status: 'Seen', course: 'Academic Writing' },
    ],
  },
  {
    id: 'statistics',
    course: 'Business Statistics',
    instructor: 'Dr. Karin Tamm',
    availability: 'Available',
    preview: 'I have a question about the lecture notes.',
    updatedAt: '3h ago',
    status: 'Sent',
    waitingHours: 3,
    urgent: false,
    resolved: false,
    unreadForInstructor: false,
    unreadForStudent: false,
    messages: [
      { id: 's1', author: 'You', body: 'I have a question about the lecture notes.', direction: 'student', time: 'Today, 08:18', status: 'Sent', course: 'Business Statistics' },
    ],
  },
  {
    id: 'marketing',
    course: 'Marketing Principles',
    instructor: 'Dr. Erik Pärn',
    availability: 'Available',
    preview: 'We agreed on the audience for the case study.',
    updatedAt: 'Tue',
    status: 'Replied',
    waitingHours: 0,
    urgent: false,
    resolved: true,
    unreadForInstructor: false,
    unreadForStudent: false,
    messages: [
      { id: 'm1', author: 'You', body: 'Can we focus the case study on local businesses?', direction: 'student', time: 'Tuesday, 11:05', status: 'Replied', course: 'Marketing Principles' },
      { id: 'm2', author: 'Dr. Erik Pärn', body: 'Yes, local businesses are a good fit for the case study.', direction: 'instructor', time: 'Tuesday, 12:20', course: 'Marketing Principles' },
    ],
  },
]
