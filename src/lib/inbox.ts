export type MessageStatus = 'Sent' | 'Seen' | 'Replied'
export type InstructorAvailability = 'Available' | 'Away'
export type ConversationFilter = 'Active' | 'Resolved'

export interface Message {
  id: string
  author: string
  body: string
  direction: 'student' | 'instructor'
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
  messages: Message[]
}

export function createStudentMessage(id: string, course: string, body: string): Message {
  return { id, author: 'You', body, direction: 'student', time: 'Just now', status: 'Sent', course }
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
    messages: [
      { id: 'm1', author: 'You', body: 'Can we focus the case study on local businesses?', direction: 'student', time: 'Tuesday, 11:05', status: 'Replied', course: 'Marketing Principles' },
      { id: 'm2', author: 'Dr. Erik Pärn', body: 'Yes, local businesses are a good fit for the case study.', direction: 'instructor', time: 'Tuesday, 12:20', course: 'Marketing Principles' },
    ],
  },
]
