import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import {
  createDemoCourseGroup, createDemoProfile,
  type DemoCourseGroup, type DemoProfile, type ProfileRole,
} from './lib/inbox'
import { label, type Language } from './lib/labels'

interface Props {
  language: Language
  profiles: DemoProfile[]
  setProfiles: Dispatch<SetStateAction<DemoProfile[]>>
  groups: DemoCourseGroup[]
  setGroups: Dispatch<SetStateAction<DemoCourseGroup[]>>
  backendMode?: boolean
  onCreateProfile?: (input: { id: string; universityId: string; name: string; role: DemoProfile['role'] }) => Promise<void>
  onCreateCourse?: (input: { name: string; instructorId: string; studentIds: string[]; taId: string }) => Promise<void>
}

export default function AdminWorkspace({ language, profiles, setProfiles, groups, setGroups, backendMode = false, onCreateProfile, onCreateCourse }: Props) {
  const [name, setName] = useState('')
  const [demoId, setDemoId] = useState('')
  const [authUserId, setAuthUserId] = useState('')
  const [profileRole, setProfileRole] = useState<DemoProfile['role']>('Student')
  const [course, setCourse] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [taId, setTaId] = useState('')
  const [message, setMessage] = useState('')
  const t = (key: Parameters<typeof label>[1]) => label(language, key)
  const byRole = (role: ProfileRole) => profiles.filter((profile) => profile.role === role)

  async function addProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (backendMode) {
      if (!authUserId.trim() || !name.trim() || !demoId.trim() || !onCreateProfile) { setMessage(t('required')); return }
      try {
        await onCreateProfile({ id: authUserId.trim(), universityId: demoId.trim(), name: name.trim(), role: profileRole })
        setName(''); setDemoId(''); setAuthUserId(''); setMessage(t('profileCreated'))
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error))
      }
      return
    }
    if (profileRole === 'Admin') { setMessage(t('required')); return }
    const profile = createDemoProfile(profiles, profileRole, name, demoId)
    if (!profile) { setMessage(t('duplicate')); return }
    setProfiles((current) => [...current, profile])
    setName(''); setDemoId(''); setMessage(t('profileCreated'))
  }

  async function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!course.trim() || !instructorId || !studentIds.length) { setMessage(t('required')); return }
    if (groups.some((group) => group.name.toLowerCase() === course.trim().toLowerCase())) { setMessage(t('duplicate')); return }
    const group = createDemoCourseGroup(groups, profiles, course, instructorId, studentIds, taId)
    if (!group) { setMessage(t('required')); return }
    if (backendMode && onCreateCourse) {
      try {
        await onCreateCourse({ name: course, instructorId, studentIds, taId })
        setCourse(''); setInstructorId(''); setStudentIds([]); setTaId(''); setMessage(t('courseCreated'))
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error))
      }
      return
    }
    setGroups((current) => [...current, group])
    setCourse(''); setInstructorId(''); setStudentIds([]); setTaId(''); setMessage(t('courseCreated'))
  }

  return (
    <main className="admin-workspace">
      <header className="admin-heading">
        <p className="eyebrow">{t('adminSpace')}</p>
        <h1>{t('adminTitle')}</h1>
        <p>{t('adminIntro')}</p>
        <p className="admin-demo-note">{t(backendMode ? 'authProfileNote' : 'demoSecurity')}</p>
      </header>
      {message && <p className="form-feedback" role="status">{message}</p>}
      <div className="admin-grid">
        <section className="admin-card">
          <h2>{t('profiles')}</h2>
          <div className="profile-list">
            {profiles.map((profile) => (
              <div className="profile-row" key={profile.id}>
                <span><strong>{profile.name}</strong><small>{profile.demoId}</small></span>
                <span className="role-chip">{profile.role === 'Student' ? t('student') : profile.role === 'Instructor' ? t('instructor') : profile.role === 'Admin' ? t('admin') : t('assistant')}</span>
              </div>
            ))}
          </div>
          <form className="admin-form" onSubmit={addProfile}>
            <h3>{t('createProfile')}</h3>
            {backendMode && <label>{t('authUserId')}<input required value={authUserId} onChange={(event) => setAuthUserId(event.target.value)} /></label>}
            <label>{t('profileName')}<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>{t('demoId')}<input required value={demoId} onChange={(event) => setDemoId(event.target.value)} /></label>
            <label>{t('profileType')}
              <select value={profileRole} onChange={(event) => setProfileRole(event.target.value as DemoProfile['role'])}>
                <option value="Student">{t('student')}</option><option value="Instructor">{t('instructor')}</option><option value="Teaching Assistant">{t('assistant')}</option>
                {backendMode && <option value="Admin">{t('admin')}</option>}
              </select>
            </label>
            <button className="admin-primary" type="submit">{t('create')}</button>
          </form>
        </section>
        <section className="admin-card">
          <h2>{t('courses')}</h2>
          <div className="profile-list">
            {groups.map((group) => (
              <div className="course-row" key={group.id}>
                <strong>{group.name}</strong>
                <span>{byRole('Instructor').find((profile) => profile.id === group.instructorId)?.name}</span>
                <small>{group.studentIds.map((id) => profiles.find((profile) => profile.id === id)?.name).filter(Boolean).join(', ')}</small>
                {group.taId && <small>{t('taLabel')}: {profiles.find((profile) => profile.id === group.taId)?.name}</small>}
              </div>
            ))}
          </div>
          <form className="admin-form" onSubmit={addCourse}>
            <h3>{t('createCourse')}</h3>
            <label>{t('courseName')}<input required value={course} onChange={(event) => setCourse(event.target.value)} /></label>
            <label>{t('assignInstructor')}<select required value={instructorId} onChange={(event) => setInstructorId(event.target.value)}>
              <option value="">—</option>{byRole('Instructor').map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select></label>
            <fieldset><legend>{t('assignStudents')} *</legend>
              {byRole('Student').map((profile) => <label className="check-row" key={profile.id}>
                <input type="checkbox" checked={studentIds.includes(profile.id)} onChange={(event) => setStudentIds((current) => event.target.checked ? [...current, profile.id] : current.filter((id) => id !== profile.id))} />
                {profile.name}
              </label>)}
            </fieldset>
            <label>{t('assignTa')}<select value={taId} onChange={(event) => setTaId(event.target.value)}>
              <option value="">{t('none')}</option>{byRole('Teaching Assistant').map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select></label>
            <button className="admin-primary" type="submit">{t('createCourse')}</button>
          </form>
        </section>
      </div>
    </main>
  )
}
