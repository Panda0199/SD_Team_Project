import { useEffect, useState, type FormEvent } from 'react'
import AdminWorkspace from './AdminWorkspace'
import { label, type Language, type LabelKey } from './lib/labels'
import {
  createCourse as createPersistedCourse,
  createProfile as createPersistedProfile,
  currentSession,
  loadWorkspace,
  markConversationSeen as markPersistedConversationSeen,
  sendMessage as sendPersistedMessage,
  setResolved as resolvePersistedConversation,
  setUrgent as flagPersistedConversationUrgent,
} from './lib/backend'
import { subscribeToWorkspace, supabase, supabaseConfigured } from './lib/supabase'
import {
  appendConversationMessage,
  canReplyToConversation,
  conversationsForRole,
  createDemoSummary,
  createCourseGroupConversations,
  explainDemoReplySimply,
  isLongStudentMessage,
  createStudentMessage,
  createReplyMessage,
  demoProfileIdForRole,
  DEMO_STUDENT_NAME,
  initialDemoCourseGroups,
  initialDemoProfiles,
  filterConversations,
  flagConversationUrgent,
  isWaitingForReply,
  initialConversations,
  markConversationSeen,
  resolveConversation,
  type Conversation,
  type ConversationFilter,
  type ConversationSearchField,
  type DemoRole,
  type Message,
  type DemoCourseGroup,
  type DemoProfile,
} from './lib/inbox'

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(supabaseConfigured ? [] : initialConversations)
  const [profiles, setProfiles] = useState<DemoProfile[]>(supabaseConfigured ? [] : initialDemoProfiles)
  const [courseGroups, setCourseGroups] = useState<DemoCourseGroup[]>(supabaseConfigured ? [] : initialDemoCourseGroups)
  const [role, setRole] = useState<DemoRole>('Student')
  const [demoProfileId, setDemoProfileId] = useState('p1')
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(supabaseConfigured)
  const [backendError, setBackendError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [language, setLanguage] = useState<Language>('EN')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [demoSummaries, setDemoSummaries] = useState<Record<string, string>>({})
  const [demoExplanations, setDemoExplanations] = useState<Record<string, string>>({})
  const [showVoiceDemo, setShowVoiceDemo] = useState(false)
  const [filter, setFilter] = useState<ConversationFilter>('Active')
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState<ConversationSearchField>('all')
  useEffect(() => {
    if (supabaseConfigured) return
    setConversations((current) => {
      const additions = createCourseGroupConversations(courseGroups, profiles, current)
      return additions.length ? [...current, ...additions] : current
    })
  }, [courseGroups, profiles])
  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    let mounted = true
    async function restoreSession() {
      try {
        const session = await currentSession()
        if (!mounted) return
        if (session) {
          setAuthUserId(session.user.id)
          const workspace = await loadWorkspace(session.user.id)
          if (mounted) applyWorkspace(workspace)
        }
      } catch (error) {
        if (mounted) setBackendError(error instanceof Error ? error.message : String(error))
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) {
        setAuthUserId(null)
        setProfiles([])
        setCourseGroups([])
        setConversations([])
        setActiveId(null)
        setBackendError('')
      }
    })
    void restoreSession()
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!supabaseConfigured || !authUserId) return
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = subscribeToWorkspace(() => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        void loadWorkspace(authUserId)
          .then(applyWorkspace)
          .catch((error: unknown) => setBackendError(error instanceof Error ? error.message : String(error)))
      }, 150)
    })
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      unsubscribe()
    }
  }, [authUserId])
  const active = conversations.find((conversation) => conversation.id === activeId)
  const roleConversations = conversationsForRole(conversations, role, courseGroups, demoProfileId)
  const visibleConversations = filterConversations(roleConversations, filter, query, searchField)
  const activeProfile = profiles.find((profile) => profile.id === demoProfileId && profile.role === role)
  const visibleProfiles = profiles.filter((profile) => profile.role === role)
  const t = (key: LabelKey) => label(language, key)
  const roleKey = (value: DemoRole): LabelKey => value === 'Student' ? 'student' : value === 'Instructor' ? 'instructor' : value === 'Admin' ? 'admin' : 'assistant'
  const statusLabel = (status: string) => status === 'Sent' ? t('sent') : status === 'Seen' ? t('seen') : t('replied')

  function applyWorkspace(workspace: Awaited<ReturnType<typeof loadWorkspace>>) {
    setRole(workspace.profile.role)
    setDemoProfileId(workspace.profile.id)
    setProfiles(workspace.profiles)
    setCourseGroups(workspace.groups)
    setConversations(workspace.conversations)
    setActiveId((current) => current && workspace.conversations.some((item) => item.id === current) ? current : null)
  }

  async function refreshBackendWorkspace(userId = authUserId) {
    if (!userId) return
    const workspace = await loadWorkspace(userId)
    applyWorkspace(workspace)
    setBackendError('')
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setBackendError(t('authEmailPassword'))
      return
    }
    setBusy(true)
    setBackendError('')
    try {
      if (!supabase) throw new Error('Supabase is not configured.')
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      if (!data.user) throw new Error('Supabase sign-in returned no user.')
      setAuthUserId(data.user.id)
      await refreshBackendWorkspace(data.user.id)
      setPassword('')
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
      setAuthLoading(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  function isOutgoing(direction: Message['direction']) {
    return (role === 'Student' && direction === 'student')
      || (role === 'Instructor' && direction === 'instructor')
      || (role === 'Teaching Assistant' && direction === 'ta')
  }

  function changeSearchField(nextField: ConversationSearchField) {
    setSearchField(nextField)
    setActiveId(null)
    setDraft('')
  }

  function messageAuthor(direction: Message['direction'], instructor: string, author: string) {
    if (direction === 'student') return role === 'Student' ? t('you') : author === 'You' ? DEMO_STUDENT_NAME : author
    if (direction === 'ta') return role === 'Teaching Assistant' ? t('you') : author === 'You' ? 'Sam Lee' : author
    return role === 'Instructor' ? t('you') : instructor
  }

  function selectRole(nextRole: DemoRole) {
    setRole(nextRole)
    setDemoProfileId(demoProfileIdForRole(nextRole, profiles, courseGroups) ?? '')
    setActiveId(null)
    setDraft('')
  }

  function selectDemoProfile(profileId: string) {
    setDemoProfileId(profileId)
    setActiveId(null)
    setDraft('')
  }

  function openConversation(conversation: Conversation) {
    setActiveId(conversation.id)
    setDraft('')
    setShowVoiceDemo(false)
    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id ? markConversationSeen(item, role) : item,
      ),
    )
    if (supabaseConfigured && authUserId) {
      void markPersistedConversationSeen(conversation.id, role, authUserId)
        .then(() => refreshBackendWorkspace())
        .catch((error: unknown) => setBackendError(error instanceof Error ? error.message : String(error)))
    }
  }

  function generateSummary(message: Message) {
    setDemoSummaries((current) => ({ ...current, [message.id]: createDemoSummary(message.body) }))
  }

  function explainReply(message: Message) {
    setDemoExplanations((current) => ({ ...current, [message.id]: explainDemoReplySimply(message.body) }))
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !active
      || active.resolved
      || !draft.trim()
      || role === 'Admin'
      || !canReplyToConversation(active, role, courseGroups, demoProfileId)
    ) return
    if (supabaseConfigured) {
      if (!authUserId) return
      setBusy(true)
      try {
        await sendPersistedMessage(active.id, draft.trim(), authUserId, role)
        setDraft('')
        await refreshBackendWorkspace()
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : String(error))
      } finally {
        setBusy(false)
      }
      return
    }
    const message = role === 'Student'
      ? createStudentMessage(`${Date.now()}`, active.course, draft.trim(), activeProfile?.name)
      : createReplyMessage(`${Date.now()}`, active.course, draft.trim(), role, active.instructor, activeProfile?.name)
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id
          ? appendConversationMessage(conversation, message, role)
          : conversation,
      ),
    )
    setDraft('')
  }

  async function markResolved() {
    if (!active || role !== 'Instructor' || !canReplyToConversation(active, role, courseGroups, demoProfileId)) return
    if (supabaseConfigured) {
      setBusy(true)
      try {
        await resolvePersistedConversation(active.id)
        setFilter('Resolved')
        await refreshBackendWorkspace()
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : String(error))
      } finally {
        setBusy(false)
      }
      return
    }
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id ? resolveConversation(conversation) : conversation,
      ),
    )
    setFilter('Resolved')
  }

  async function markUrgent() {
    if (!active || role !== 'Student') return
    if (supabaseConfigured) {
      setBusy(true)
      try {
        await flagPersistedConversationUrgent(active.id)
        await refreshBackendWorkspace()
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : String(error))
      } finally {
        setBusy(false)
      }
      return
    }
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id ? flagConversationUrgent(conversation) : conversation,
      ),
    )
  }

  function changeFilter(nextFilter: ConversationFilter) {
    setFilter(nextFilter)
    setActiveId(null)
    setDraft('')
  }

  if (supabaseConfigured && (authLoading || !authUserId || !activeProfile)) {
    return (
      <div className="app-shell">
        <header className="topbar auth-topbar">
          <a className="brand" href="/" aria-label={t('home')}><span className="brand-mark" aria-hidden="true">Q</span>Quickly</a>
          <div className="language-control" role="group" aria-label={t('language')}>
            {(['EN', 'ET'] as const).map((value) => <button key={value} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value}</button>)}
          </div>
        </header>
        <main className="auth-panel">
          {authLoading
            ? <p role="status">{t('signingIn')}</p>
            : authUserId
              ? <><h1>{t('profileMissing')}</h1><button className="admin-primary" onClick={() => void signOut()}>{t('signOut')}</button></>
              : <form className="auth-form" onSubmit={signIn}>
                <p className="eyebrow">QUICKLY</p>
                <h1>{t('signIn')}</h1>
                <p>{t('authRequired')}</p>
                <label>{t('email')}<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label>{t('password')}<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                {backendError && <p className="auth-error" role="alert">{backendError}</p>}
                <button className="admin-primary" type="submit" disabled={busy}>{busy ? t('signingIn') : t('signInButton')}</button>
              </form>}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t('home')}>
          <span className="brand-mark" aria-hidden="true">Q</span>
          Quickly
        </a>
        {!supabaseConfigured && <span className="demo-label">{t('demoData')}</span>}
        {!supabaseConfigured && <div className="demo-role-control">
          <span className="demo-role-label">{t('demoView')}</span>
          <div className="demo-role-buttons" role="group" aria-label={t('switchRole')}>
            {(['Student', 'Instructor', 'Teaching Assistant', 'Admin'] as const).map((demoRole) => (
              <button
                key={demoRole}
                aria-label={t(roleKey(demoRole))}
                aria-pressed={role === demoRole}
                onClick={() => selectRole(demoRole)}
              >
                {demoRole === 'Teaching Assistant' ? t('taLabel') : t(roleKey(demoRole))}
              </button>
            ))}
          </div>
        </div>}
        <div className="language-control" role="group" aria-label={t('language')}>
          {(['EN', 'ET'] as const).map((value) => <button key={value} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value}</button>)}
        </div>
        {supabaseConfigured && <button className="sign-out-button" onClick={() => void signOut()} disabled={busy}>{t('signOut')}</button>}
      </header>

      {backendError && <p className="backend-error" role="alert">{backendError}</p>}
      {role === 'Admin' ? <AdminWorkspace language={language} profiles={profiles} setProfiles={setProfiles} groups={courseGroups} setGroups={setCourseGroups}
        backendMode={supabaseConfigured}
        onCreateProfile={async (input) => { await createPersistedProfile(input); await refreshBackendWorkspace() }}
        onCreateCourse={async (input) => { await createPersistedCourse(input); await refreshBackendWorkspace() }} /> : <main className={`workspace${active ? ' conversation-open' : ''}`}>
        <aside className="inbox-panel" aria-label={t('inbox')}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t(role === 'Student' ? 'studentSpace' : role === 'Instructor' ? 'instructorSpace' : 'assistantSpace')}</p>
              <h1>{t('inbox')}</h1>
            </div>
            <span className="count">{visibleConversations.length}</span>
          </div>
          <p className="panel-intro">
            {t(role === 'Student' ? 'yourConversations' : 'studentConversations')}
          </p>
          {!supabaseConfigured && <><label className="demo-account-label" htmlFor="demo-account">{t('demoAccount')}</label>
          <select id="demo-account" className="demo-account-select" value={demoProfileId} onChange={(event) => selectDemoProfile(event.target.value)}>
            {visibleProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select></>}
          {role === 'Teaching Assistant' && (
            <p className="role-scope-note">
              {t('scopeNote')}
            </p>
          )}
          <label className="search-label" htmlFor="conversation-search">{t('search')}</label>
          <input
            id="conversation-search"
            className="search-input"
            type="search"
            placeholder={t('searchHint')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="search-label" htmlFor="conversation-search-field">{t('searchBy')}</label>
          <select
            id="conversation-search-field"
            className="search-field-select"
            value={searchField}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'all' || value === 'course' || value === 'instructor') changeSearchField(value)
            }}
          >
            <option value="all">{t('allFields')}</option>
            <option value="course">{t('course')}</option>
            <option value="instructor">{t('teacherInstructor')}</option>
          </select>

          <div className="filter-tabs" role="group" aria-label={t('filterConversations')}>
            {(['Active', 'Resolved'] as const).map((tab) => (
              <button
                key={tab}
                className={`filter-tab${filter === tab ? ' selected' : ''}`}
                aria-pressed={filter === tab}
                onClick={() => changeFilter(tab)}
              >
                {t(tab === 'Active' ? 'active' : 'resolved')}
              </button>
            ))}
          </div>

          <nav className="conversation-list" aria-label={t('courseConversations')}>
            {visibleConversations.map((conversation) => (
              <button
                className={`conversation-card${activeId === conversation.id ? ' selected' : ''}`}
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                aria-current={activeId === conversation.id ? 'page' : undefined}
              >
                <span className="course-icon" aria-hidden="true">{conversation.course.slice(0, 1)}</span>
                <span className="card-copy">
                  <span className="card-topline">
                    <strong>{conversation.course}</strong>
                    <time>{conversation.updatedAt}</time>
                  </span>
                  <span className="instructor-name">
                    {role === 'Student' ? conversation.instructor : conversation.studentName ?? DEMO_STUDENT_NAME}
                  </span>
                  <span className="preview">{conversation.messages.length ? conversation.preview : t('noMessagesYet')}</span>
                  {conversation.messages.length > 0 && <span className="card-badges">
                    <span className={`status ${
                      conversation.resolved
                        ? 'status-resolved'
                        : (role === 'Student' ? conversation.unreadForStudent : conversation.unreadForInstructor)
                          ? role === 'Student' ? 'status-new status-new-reply' : 'status-new'
                          : `status-${conversation.status.toLowerCase()}`
                    }`}>
                      {conversation.resolved
                        ? t('resolved')
                        : (role === 'Student' ? conversation.unreadForStudent : conversation.unreadForInstructor)
                          ? role === 'Student' ? t('newReply') : t('newMessage')
                          : statusLabel(conversation.status)}
                    </span>
                    {conversation.urgent && <span className="urgent-badge">{t('urgencyBadge')}</span>}
                  </span>}
                </span>
              </button>
            ))}
            {visibleConversations.length === 0 && (
              <p className="no-results">{t('noResults')}</p>
            )}
          </nav>
          <div className="privacy-note">{t('privateConversations')}</div>
        </aside>

        <section className="thread-panel" aria-label={active ? `${active.course} ${t('conversation').toLowerCase()}` : t('conversation')}>
          {active ? (
            <>
              <div className="thread-heading">
                <button className="back-button" onClick={() => setActiveId(null)}>← <span>{t('inbox')}</span></button>
                <span className="course-pill">{active.course}</span>
                <h2>{role === 'Student' ? active.instructor : active.studentName ?? DEMO_STUDENT_NAME}</h2>
                <p>{role === 'Student' ? t('courseInstructor') : t(supabaseConfigured ? 'student' : 'studentDemo')}</p>
                {role === 'Student' && (
                  <>
                    <div className="availability-row">
                      <span className={`availability-dot ${active.availability.toLowerCase()}`} aria-hidden="true" />
                      <span>{t(active.availability === 'Available' ? 'available' : 'away')}</span>
                    </div>
                    {active.availability === 'Away' && (
                      <p className="away-note">{t('awayNote')}</p>
                    )}
                  </>
                )}
                {active.resolved && <p className="resolved-note">{t('resolvedNote')}</p>}
              </div>
              <div className="message-list" aria-live="polite">
                <p className="thread-date">
                  {role === 'Student' ? t('yourConversation') : `${t('conversationWith')} ${active.studentName ?? DEMO_STUDENT_NAME}`} · {active.course}
                </p>
                {role === 'Student' && isWaitingForReply(active) && (
                  <div className="reply-waiting-state" role="status">
                    <strong>{t('waitingForReply')}</strong>
                    <span>{t('demoWaitingNote')}</span>
                  </div>
                )}
                {active.messages.length === 0
                  ? <p className="thread-empty-copy">{t('noMessagesYet')}</p>
                  : active.messages.map((message) => (
                  <div className={`message-group${isOutgoing(message.direction) ? ' outgoing-group' : ''}`} key={message.id}>
                    <article className={`message ${message.direction} ${isOutgoing(message.direction) ? 'outgoing' : ''}`}>
                      <span className="message-author">{messageAuthor(message.direction, active.instructor, message.author)}</span>
                      <p>{message.body}</p>
                      <div className="message-meta">
                        <time>{message.time}</time>
                        {message.status && <span className={`status status-${message.status.toLowerCase()}`}>{statusLabel(message.status)}</span>}
                      </div>
                    </article>
                    {role !== 'Student' && isLongStudentMessage(message) && (
                      <div className="derived-actions">
                        {!demoSummaries[message.id] && <button type="button" onClick={() => generateSummary(message)}>{t('generateSummary')}</button>}
                        {demoSummaries[message.id] && (
                          <section className="derived-panel" aria-label={t('aiSummaryLabel')}>
                            <strong>{t('aiSummaryLabel')}</strong>
                            <p>{demoSummaries[message.id]}</p>
                            <small>{t('aiSummaryNote')}</small>
                          </section>
                        )}
                      </div>
                    )}
                    {role === 'Student' && (message.direction === 'instructor' || message.direction === 'ta') && (
                      <div className="derived-actions">
                        {!demoExplanations[message.id] && <button type="button" onClick={() => explainReply(message)}>{t('explainSimply')}</button>}
                        {demoExplanations[message.id] && (
                          <section className="derived-panel" aria-label={t('aiExplanationLabel')}>
                            <strong>{t('aiExplanationLabel')}</strong>
                            <p>{demoExplanations[message.id]}</p>
                          </section>
                        )}
                      </div>
                    )}
                    {role === 'Student' && demoSummaries[message.id] && (
                      <section className="derived-panel shared-summary" aria-label={t('aiSummaryLabel')}>
                        <strong>{t('aiSummaryLabel')}</strong>
                        <p>{demoSummaries[message.id]}</p>
                        <small>{t('aiSummaryNote')}</small>
                      </section>
                    )}
                  </div>
                ))}
                {role === 'Student' && active.waitingHours > 2 && active.status !== 'Replied' && !active.resolved && (
                  <div className="urgent-prompt">
                    <div>
                      <strong>{t('waiting')}</strong>
                      <span>{t('urgentPrompt')}</span>
                    </div>
                    {active.urgent
                      ? <span className="urgent-badge" role="status">{t('urgent')}</span>
                      : <button onClick={markUrgent}>{t('flagUrgent')}</button>}
                  </div>
                )}
                {showVoiceDemo && (
                  <section className="voice-demo-preview" role="status">
                    <strong>{t('voiceMessageLabel')}</strong>
                    <div className="voice-demo-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
                    <strong>{t('transcriptLabel')}</strong>
                    <p>{t('demoTranscript')}</p>
                    <small>{t('voiceDemoNotice')}</small>
                  </section>
                )}
              </div>
              <div className="thread-actions">
                {role === 'Instructor' && !active.resolved
                  ? <button className="resolve-button" onClick={markResolved}>{t('markResolved')}</button>
                  : active.resolved ? <span className="resolved-label">{t('resolvedConversation')}</span> : null}
              </div>
              {!active.resolved && (role === 'Student' || canReplyToConversation(active, role, courseGroups, demoProfileId)) && (
                <form className="composer" onSubmit={sendMessage}>
                  <label htmlFor="question">
                    {role === 'Student' ? `${t('askQuestion')} ${active.course}` : `${t('replyTo')} ${active.studentName ?? DEMO_STUDENT_NAME} · ${active.course}`}
                  </label>
                  <textarea
                    id="question"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={role === 'Student' ? t('questionPlaceholder') : t('replyPlaceholder')}
                    rows={2}
                  />
                  <div className="composer-footer">
                    <span>{role === 'Student' ? `${t('taggedTo')} ${active.course}` : `${t('replyingIn')} ${active.course}`}</span>
                    <button type="submit" disabled={!draft.trim() || busy}>
                      {role === 'Student' ? t('sendQuestion') : t('sendReply')} <span aria-hidden="true">↑</span>
                    </button>
                  </div>
                  {(role === 'Student' || role === 'Instructor') && (
                    <button className="voice-demo-toggle" type="button" onClick={() => setShowVoiceDemo((visible) => !visible)}>
                      {showVoiceDemo ? t('hideVoiceDemo') : t('voiceMessageDemo')}
                    </button>
                  )}
                </form>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">✉</span>
              <h2>{t('selectConversation')}</h2>
              <p>{t('chooseConversation')}</p>
            </div>
          )}
        </section>
      </main>}
    </div>
  )
}
