import { describe, expect, it, vi } from 'vitest'

const invoke = vi.hoisted(() => vi.fn())
const insert = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({
  requireSupabase: () => ({
    functions: { invoke },
    from: () => ({ insert }),
    rpc,
  }),
}))

import { createAccount, deleteAccount, loopInTeachingAssistant, mapDatabaseWorkspace, sendMessage } from './backend'

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
        resolved: false, urgent: true, ta_looped_in: true, staff_unread: false, student_unread: true,
        created_at: '2026-10-21T10:00:00.000Z', updated_at: '2026-10-21T10:05:00.000Z',
      }],
      messages: [{
        id: 'message-1', conversation_id: 'conversation-1', author_id: 'instructor-1',
        body: 'Use the assigned reading.', assignment_tag: 'Assignment 2',
        status: 'Replied', created_at: '2026-10-21T10:05:00.000Z',
      }],
    }, 'student-1')

    expect(result.profile).toMatchObject({ id: 'student-1', role: 'Student', demoId: 'u-1' })
    expect(result.groups[0]).toMatchObject({ name: 'Research Methods', studentIds: ['student-1'] })
    expect(result.conversations[0]).toMatchObject({
      course: 'Research Methods', instructor: 'Dr. Example', availability: 'Away',
      urgent: true, unreadForStudent: true, status: 'Replied',
      taLoopedIn: true,
    })

    expect(result.conversations[0].messages[0]).toMatchObject({
      author: 'Dr. Example', body: 'Use the assigned reading.', assignmentTag: 'Assignment 2',
      direction: 'instructor', status: 'Replied',
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

describe('Supabase message assignment tags', () => {
  it('trims and inserts an optional assignment tag', async () => {
    insert.mockResolvedValue({ error: null })

    await sendMessage('conversation-1', 'Question', 'student-1', 'Student', ' Assignment 2 ')

    expect(insert).toHaveBeenCalledWith({
      conversation_id: 'conversation-1',
      author_id: 'student-1',
      body: 'Question',
      status: 'Sent',
      assignment_tag: 'Assignment 2',
    })
  })
})

describe('Supabase teaching-assistant loop in', () => {
  it('calls the loop-in RPC for the selected conversation', async () => {
    rpc.mockResolvedValue({ error: null })

    await loopInTeachingAssistant('conversation-1')

    expect(rpc).toHaveBeenCalledWith('loop_in_teaching_assistant', {
      p_conversation_id: 'conversation-1',
    })
  })
})

describe('Supabase account creation', () => {
  it('invokes the admin Edge Function with the account fields mapped to its request body', async () => {
    invoke.mockResolvedValue({ data: { id: 'auth-user-1' }, error: null })

    await createAccount({
      universityId: ' S1001 ',
      name: 'Student One',
      password: 'secret1',
      role: 'Student',
    })

    expect(invoke).toHaveBeenCalledWith('admin-create-user', {
      body: {
        universityId: ' S1001 ',
        displayName: 'Student One',
        password: 'secret1',
        role: 'Student',
      },
    })
  })

  it('passes Admin as an account role to the Edge Function', async () => {
    invoke.mockResolvedValue({ data: { id: 'auth-admin-2' }, error: null })

    await createAccount({
      universityId: ' S1002 ',
      name: 'Second Admin',
      password: 'secret1',
      role: 'Admin',
    })

    expect(invoke).toHaveBeenCalledWith('admin-create-user', {
      body: {
        universityId: ' S1002 ',
        displayName: 'Second Admin',
        password: 'secret1',
        role: 'Admin',
      },
    })
  })

  describe('Supabase account deletion', () => {
    it('invokes the admin Edge Function with the target user ID', async () => {
      invoke.mockResolvedValue({ data: { success: true }, error: null })

      await deleteAccount('user-123')

      expect(invoke).toHaveBeenCalledWith('admin-delete-user', {
        body: { userId: 'user-123' },
      })
    })
  })
})
