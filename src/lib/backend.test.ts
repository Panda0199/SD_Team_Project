import { describe, expect, it } from 'vitest'
import { mapDatabaseWorkspace } from './backend'

describe('Supabase workspace mapping', () => {
  it('maps persisted course conversations and role/status fields to the existing UI model', () => {
    const result = mapDatabaseWorkspace({
      profiles: [
        { id: 'student-1', university_id: 'u-1', display_name: 'Student One', role: 'student', availability: true },
        { id: 'instructor-1', university_id: 'u-2', display_name: 'Dr. Example', role: 'instructor', availability: false },
      ],
      courses: [{ id: 'course-1', name: 'Research Methods', instructor_id: 'instructor-1', teaching_assistant_id: null }],
      enrollments: [{ course_id: 'course-1', student_id: 'student-1' }],
      conversations: [{
        id: 'conversation-1', course_id: 'course-1', student_id: 'student-1',
        resolved: false, urgent: true, staff_unread: false, student_unread: true,
        created_at: '2026-10-21T10:00:00.000Z', updated_at: '2026-10-21T10:05:00.000Z',
      }],
      messages: [{
        id: 'message-1', conversation_id: 'conversation-1', author_id: 'instructor-1',
        body: 'Use the assigned reading.', status: 'Replied', created_at: '2026-10-21T10:05:00.000Z',
      }],
    }, 'student-1')

    expect(result.profile).toMatchObject({ id: 'student-1', role: 'Student', demoId: 'u-1' })
    expect(result.groups[0]).toMatchObject({ name: 'Research Methods', studentIds: ['student-1'] })
    expect(result.conversations[0]).toMatchObject({
      course: 'Research Methods', instructor: 'Dr. Example', availability: 'Away',
      urgent: true, unreadForStudent: true, status: 'Replied',
    })
    expect(result.conversations[0].messages[0]).toMatchObject({
      author: 'Dr. Example', body: 'Use the assigned reading.', direction: 'instructor', status: 'Replied',
    })
  })

  it('fails clearly if a signed-in user has no Quickly profile', () => {
    expect(() => mapDatabaseWorkspace({
      profiles: [],
      courses: [],
      enrollments: [],
      conversations: [],
      messages: [],
    }, 'missing-user')).toThrow('Your account does not have a Quickly profile.')
  })

  it('maps an authenticated admin profile to the Admin role', () => {
    const result = mapDatabaseWorkspace({
      profiles: [{ id: 'admin-1', university_id: 'admin-1', display_name: 'Quickly Admin', role: 'admin' }],
      courses: [],
      enrollments: [],
      conversations: [],
      messages: [],
    }, 'admin-1')
    expect(result.profile.role).toBe('Admin')
  })
})
