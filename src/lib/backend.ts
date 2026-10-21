import type { Session } from '@supabase/supabase-js'
import type { Conversation, DemoCourseGroup, DemoRole, DemoProfile, Message, MessageStatus } from './inbox'
import { requireSupabase } from './supabase'

type Row = Record<string, unknown>

export interface WorkspaceData {
  profile: DemoProfile
  profiles: DemoProfile[]
  groups: DemoCourseGroup[]
  conversations: Conversation[]
}

const roleFromDatabase: Record<string, DemoRole> = {
  student: 'Student',
  instructor: 'Instructor',
  teaching_assistant: 'Teaching Assistant',
  admin: 'Admin',
}

const roleToDatabase: Record<DemoRole, string> = {
  Student: 'student',
  Instructor: 'instructor',
  'Teaching Assistant': 'teaching_assistant',
  Admin: 'admin',
}

function failIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function profileFromRow(row: Row): DemoProfile {
  const role = roleFromDatabase[String(row.role)]
  if (!role) throw new Error(`Unsupported profile role: ${String(row.role)}`)
  return {
    id: String(row.id),
    name: String(row.display_name),
    demoId: String(row.university_id),
    role,
  }
}

function dateLabel(value: unknown): string {
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

export function mapDatabaseWorkspace(
  rows: { profiles: Row[]; courses: Row[]; enrollments: Row[]; conversations: Row[]; messages: Row[] },
  userId: string,
): WorkspaceData {
  const profiles = rows.profiles.map(profileFromRow)
  const profile = profiles.find((item) => item.id === userId)
  if (!profile) throw new Error('Your account does not have a Quickly profile. Ask an administrator to add one.')
  const profileById = new Map(profiles.map((item) => [item.id, item]))
  const enrollmentsByCourse = new Map<string, string[]>()
  for (const row of rows.enrollments) {
    const courseId = String(row.course_id)
    enrollmentsByCourse.set(courseId, [...(enrollmentsByCourse.get(courseId) ?? []), String(row.student_id)])
  }
  const groups: DemoCourseGroup[] = rows.courses.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    instructorId: String(row.instructor_id),
    studentIds: enrollmentsByCourse.get(String(row.id)) ?? [],
    taId: row.teaching_assistant_id ? String(row.teaching_assistant_id) : '',
  }))
  const courseById = new Map(rows.courses.map((row) => [String(row.id), row]))
  const messagesByConversation = new Map<string, Message[]>()
  const courseIdByConversation = new Map(rows.conversations.map((row) => [String(row.id), String(row.course_id)]))
  for (const row of rows.messages) {
    const conversationId = String(row.conversation_id)
    const courseId = courseIdByConversation.get(conversationId) ?? ''
    const authorId = String(row.author_id)
    const author = profileById.get(authorId)
    const direction = author?.role === 'Teaching Assistant'
      ? 'ta'
      : author?.role === 'Instructor' ? 'instructor' : 'student'
    const message: Message = {
      id: String(row.id),
      author: authorId === userId ? 'You' : author?.name ?? 'Quickly user',
      body: String(row.body),
      direction,
      time: dateLabel(row.created_at),
      status: row.status as MessageStatus,
      course: String(courseById.get(courseId)?.name ?? ''),
    }
    messagesByConversation.set(conversationId, [...(messagesByConversation.get(conversationId) ?? []), message])
  }
  const conversations = rows.conversations.map((row): Conversation => {
    const courseId = String(row.course_id)
    const course = courseById.get(courseId)
    const group = groups.find((item) => item.id === courseId)
    const student = profileById.get(String(row.student_id))
    const instructor = profileById.get(String(course?.instructor_id))
    const messages = messagesByConversation.get(String(row.id)) ?? []
    const latest = messages.at(-1)
    const updated = new Date(String(row.updated_at ?? row.created_at))
    const waitingHours = latest?.direction === 'student' && !Number.isNaN(updated.getTime())
      ? Math.max(0, (Date.now() - updated.getTime()) / 3_600_000)
      : 0
    return {
      id: String(row.id),
      course: String(course?.name ?? ''),
      instructor: instructor?.name ?? 'Instructor',
      availability: course?.instructor_id && (rows.profiles.find((item) => String(item.id) === String(course.instructor_id))?.availability === false) ? 'Away' : 'Available',
      preview: latest?.body ?? '',
      updatedAt: dateLabel(row.updated_at ?? row.created_at),
      status: latest?.status ?? 'Sent',
      waitingHours,
      urgent: Boolean(row.urgent),
      resolved: Boolean(row.resolved),
      unreadForInstructor: Boolean(row.staff_unread),
      unreadForStudent: Boolean(row.student_unread),
      messages,
      courseGroupId: group?.id,
      studentId: student?.id,
      studentName: student?.name,
    }
  })
  return { profile, profiles, groups, conversations }
}

export async function loadWorkspace(userId: string): Promise<WorkspaceData> {
  const client = requireSupabase()
  const profileResult = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  failIfError(profileResult.error)
  if (!profileResult.data) throw new Error('Your account does not have a Quickly profile. Ask an administrator to add one.')

  const [profilesResult, coursesResult, enrollmentsResult, conversationsResult] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('courses').select('*'),
    client.from('course_enrollments').select('*'),
    client.from('conversations').select('*'),
  ])
  failIfError(profilesResult.error)
  failIfError(coursesResult.error)
  failIfError(enrollmentsResult.error)
  failIfError(conversationsResult.error)
  const conversationIds = (conversationsResult.data ?? []).map((row) => row.id)
  const messagesResult = conversationIds.length
    ? await client.from('messages').select('*').in('conversation_id', conversationIds).order('created_at')
    : { data: [], error: null }
  failIfError(messagesResult.error)
  return mapDatabaseWorkspace({
    profiles: profilesResult.data ?? [],
    courses: coursesResult.data ?? [],
    enrollments: enrollmentsResult.data ?? [],
    conversations: conversationsResult.data ?? [],
    messages: messagesResult.data ?? [],
  }, userId)
}

export async function currentSession(): Promise<Session | null> {
  const { data, error } = await requireSupabase().auth.getSession()
  failIfError(error)
  return data.session
}

export async function sendMessage(conversationId: string, body: string, authorId: string, role: DemoRole): Promise<void> {
  const { error } = await requireSupabase().from('messages').insert({
    conversation_id: conversationId,
    author_id: authorId,
    body,
    status: role === 'Student' ? 'Sent' : 'Replied',
  })
  failIfError(error)
}

export async function markConversationSeen(conversationId: string, role: DemoRole, userId: string): Promise<void> {
  const client = requireSupabase()
  if (role === 'Student') {
    const { error } = await client.from('conversations').update({ student_unread: false }).eq('id', conversationId)
    failIfError(error)
    return
  }
  const messageResult = await client.from('messages').update({ status: 'Seen' })
    .eq('conversation_id', conversationId).eq('status', 'Sent').neq('author_id', userId)
  failIfError(messageResult.error)
  const conversationResult = await client.from('conversations').update({ staff_unread: false }).eq('id', conversationId)
  failIfError(conversationResult.error)
}

export async function setResolved(conversationId: string): Promise<void> {
  const { error } = await requireSupabase().from('conversations').update({ resolved: true }).eq('id', conversationId)
  failIfError(error)
}

export async function setUrgent(conversationId: string): Promise<void> {
  const { error } = await requireSupabase().from('conversations').update({ urgent: true }).eq('id', conversationId)
  failIfError(error)
}

export async function setAvailability(userId: string, available: boolean): Promise<void> {
  const { error } = await requireSupabase().from('profiles').update({ availability: available }).eq('id', userId)
  failIfError(error)
}

export async function createProfile(input: { id: string; universityId: string; name: string; role: DemoRole }): Promise<void> {
  const { error } = await requireSupabase().from('profiles').insert({
    id: input.id,
    university_id: input.universityId.trim(),
    display_name: input.name.trim(),
    role: roleToDatabase[input.role],
  })
  failIfError(error)
}

export async function createCourse(input: { name: string; instructorId: string; studentIds: string[]; taId: string }): Promise<void> {
  const { error } = await requireSupabase().rpc('create_course_group', {
    p_name: input.name.trim(),
    p_instructor_id: input.instructorId,
    p_student_ids: input.studentIds,
    p_teaching_assistant_id: input.taId || null,
  })
  failIfError(error)
}
