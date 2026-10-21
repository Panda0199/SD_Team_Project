export type MessageStatus = 'Sent' | 'Seen' | 'Replied'

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
  preview: string
  updatedAt: string
  status: MessageStatus
  messages: Message[]
}

export function createStudentMessage(id: string, course: string, body: string): Message {
  return { id, author: 'You', body, direction: 'student', time: 'Just now', status: 'Sent', course }
}

export const initialConversations: Conversation[] = [
  {
    id: 'research',
    course: 'Research Methods',
    instructor: 'Dr. Lina Kask',
    preview: 'Thanks, that clears it up!',
    updatedAt: '10:42',
    status: 'Replied',
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
    preview: 'Could you clarify the citation style?',
    updatedAt: 'Yesterday',
    status: 'Seen',
    messages: [
      { id: 'w1', author: 'You', body: 'Could you clarify the citation style for our course paper?', direction: 'student', time: 'Yesterday, 14:06', status: 'Seen', course: 'Academic Writing' },
    ],
  },
  {
    id: 'statistics',
    course: 'Business Statistics',
    instructor: 'Dr. Karin Tamm',
    preview: 'I have a question about the lecture notes.',
    updatedAt: 'Mon',
    status: 'Sent',
    messages: [
      { id: 's1', author: 'You', body: 'I have a question about the lecture notes.', direction: 'student', time: 'Monday, 09:18', status: 'Sent', course: 'Business Statistics' },
    ],
  },
]
