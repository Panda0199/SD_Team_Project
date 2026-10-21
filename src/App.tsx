import { useState, type FormEvent } from 'react'
import {
  appendConversationMessage,
  canReplyToConversation,
  conversationsForRole,
  createStudentMessage,
  createReplyMessage,
  DEMO_STUDENT_NAME,
  filterConversations,
  flagConversationUrgent,
  initialConversations,
  markConversationSeen,
  resolveConversation,
  type Conversation,
  type ConversationFilter,
  type DemoRole,
  type Message,
} from './lib/inbox'

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [role, setRole] = useState<DemoRole>('Student')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<ConversationFilter>('Active')
  const [query, setQuery] = useState('')
  const active = conversations.find((conversation) => conversation.id === activeId)
  const roleConversations = conversationsForRole(conversations, role)
  const visibleConversations = filterConversations(roleConversations, filter, query)

  function isOutgoing(direction: Message['direction']) {
    return (role === 'Student' && direction === 'student')
      || (role === 'Instructor' && direction === 'instructor')
      || (role === 'Teaching Assistant' && direction === 'ta')
  }

  function messageAuthor(direction: Message['direction'], instructor: string) {
    if (direction === 'student') return role === 'Student' ? 'You' : DEMO_STUDENT_NAME
    if (direction === 'ta') return role === 'Teaching Assistant' ? 'You' : 'Sam Lee'
    return role === 'Instructor' ? 'You' : instructor
  }

  function selectRole(nextRole: DemoRole) {
    setRole(nextRole)
    setActiveId(null)
    setDraft('')
  }

  function openConversation(conversation: Conversation) {
    setActiveId(conversation.id)
    setDraft('')
    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id ? markConversationSeen(item, role) : item,
      ),
    )
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !active
      || active.resolved
      || !draft.trim()
      || (role !== 'Student' && !canReplyToConversation(active, role))
    ) return
    const message = role === 'Student'
      ? createStudentMessage(`${Date.now()}`, active.course, draft.trim())
      : createReplyMessage(`${Date.now()}`, active.course, draft.trim(), role, active.instructor)
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id
          ? appendConversationMessage(conversation, message, role)
          : conversation,
      ),
    )
    setDraft('')
  }

  function markResolved() {
    if (!active || role !== 'Instructor') return
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id ? resolveConversation(conversation) : conversation,
      ),
    )
    setFilter('Resolved')
  }

  function markUrgent() {
    if (!active || role !== 'Student') return
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Quickly home">
          <span className="brand-mark" aria-hidden="true">Q</span>
          Quickly
        </a>
        <span className="demo-label">Fictional data · no sign-in</span>
        <div className="demo-role-control">
          <span className="demo-role-label">DEMO VIEW</span>
          <div className="demo-role-buttons" role="group" aria-label="Switch demo role">
            {(['Student', 'Instructor', 'Teaching Assistant'] as const).map((demoRole) => (
              <button
                key={demoRole}
                aria-label={demoRole}
                aria-pressed={role === demoRole}
                onClick={() => selectRole(demoRole)}
              >
                {demoRole === 'Teaching Assistant' ? 'TA' : demoRole}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={`workspace${active ? ' conversation-open' : ''}`}>
        <aside className="inbox-panel" aria-label="Inbox">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{role === 'Student' ? 'STUDENT SPACE' : `${role.toUpperCase()} SPACE`}</p>
              <h1>Inbox</h1>
            </div>
            <span className="count">{visibleConversations.length}</span>
          </div>
          <p className="panel-intro">
            {role === 'Student' ? 'Your course conversations' : 'Student course conversations'}
          </p>
          {role === 'Teaching Assistant' && (
            <p className="role-scope-note">
              Sam Lee can access Research Methods only. Other course conversations are unavailable in this demo.
            </p>
          )}
          <label className="search-label" htmlFor="conversation-search">Search conversations</label>
          <input
            id="conversation-search"
            className="search-input"
            type="search"
            placeholder="Course, instructor, or message"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="filter-tabs" role="group" aria-label="Filter conversations">
            {(['Active', 'Resolved'] as const).map((tab) => (
              <button
                key={tab}
                className={`filter-tab${filter === tab ? ' selected' : ''}`}
                aria-pressed={filter === tab}
                onClick={() => changeFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <nav className="conversation-list" aria-label="Course conversations">
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
                    {role === 'Student' ? conversation.instructor : DEMO_STUDENT_NAME}
                  </span>
                  <span className="preview">{conversation.preview}</span>
                  <span className="card-badges">
                    <span className={`status ${
                      conversation.resolved
                        ? 'status-resolved'
                        : (role === 'Student' ? conversation.unreadForStudent : conversation.unreadForInstructor)
                          ? 'status-new'
                          : `status-${conversation.status.toLowerCase()}`
                    }`}>
                      {conversation.resolved
                        ? 'Resolved'
                        : (role === 'Student' ? conversation.unreadForStudent : conversation.unreadForInstructor)
                          ? role === 'Student' ? 'New reply' : 'New message'
                          : conversation.status}
                    </span>
                    {conversation.urgent && <span className="urgent-badge">Urgent</span>}
                  </span>
                </span>
              </button>
            ))}
            {visibleConversations.length === 0 && (
              <p className="no-results">No conversations match your search.</p>
            )}
          </nav>
          <div className="privacy-note">Private course conversations</div>
        </aside>

        <section className="thread-panel" aria-label={active ? `${active.course} conversation` : 'Conversation'}>
          {active ? (
            <>
              <div className="thread-heading">
                <button className="back-button" onClick={() => setActiveId(null)}>← <span>Inbox</span></button>
                <span className="course-pill">{active.course}</span>
                <h2>{role === 'Student' ? active.instructor : DEMO_STUDENT_NAME}</h2>
                <p>{role === 'Student' ? 'Course instructor' : 'Student · fictional demo account'}</p>
                {role === 'Student' && (
                  <>
                    <div className="availability-row">
                      <span className={`availability-dot ${active.availability.toLowerCase()}`} aria-hidden="true" />
                      <span>{active.availability}</span>
                    </div>
                    {active.availability === 'Away' && (
                      <p className="away-note">This instructor is away; replies may be delayed.</p>
                    )}
                  </>
                )}
                {active.resolved && <p className="resolved-note">This conversation is resolved. You can still read its history.</p>}
              </div>
              <div className="message-list" aria-live="polite">
                <p className="thread-date">
                  {role === 'Student' ? 'Your conversation' : `Conversation with ${DEMO_STUDENT_NAME}`} · {active.course}
                </p>
                {active.messages.map((message) => (
                  <article
                    className={`message ${message.direction} ${isOutgoing(message.direction) ? 'outgoing' : ''}`}
                    key={message.id}
                  >
                    <span className="message-author">{messageAuthor(message.direction, active.instructor)}</span>
                    <p>{message.body}</p>
                    <div className="message-meta">
                      <time>{message.time}</time>
                      {message.status && <span className={`status status-${message.status.toLowerCase()}`}>{message.status}</span>}
                    </div>
                  </article>
                ))}
                {role === 'Student' && active.waitingHours > 2 && active.status !== 'Replied' && !active.resolved && (
                  <div className="urgent-prompt">
                    <div>
                      <strong>Waiting over 2 hours</strong>
                      <span>You can flag this question for follow-up.</span>
                    </div>
                    {active.urgent
                      ? <span className="urgent-badge" role="status">Urgent</span>
                      : <button onClick={markUrgent}>Flag as urgent</button>}
                  </div>
                )}
              </div>
              <div className="thread-actions">
                {role === 'Instructor' && !active.resolved
                  ? <button className="resolve-button" onClick={markResolved}>Mark as resolved</button>
                  : active.resolved ? <span className="resolved-label">Resolved conversation</span> : null}
              </div>
              {!active.resolved && (role === 'Student' || canReplyToConversation(active, role)) && (
                <form className="composer" onSubmit={sendMessage}>
                  <label htmlFor="question">
                    {role === 'Student' ? `Ask a question about ${active.course}` : `Reply to ${DEMO_STUDENT_NAME} · ${active.course}`}
                  </label>
                  <textarea
                    id="question"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={role === 'Student' ? 'Write your course question…' : 'Write a reply…'}
                    rows={2}
                  />
                  <div className="composer-footer">
                    <span>{role === 'Student' ? `Tagged to ${active.course}` : `Replying in ${active.course}`}</span>
                    <button type="submit" disabled={!draft.trim()}>
                      {role === 'Student' ? 'Send question' : 'Send reply'} <span aria-hidden="true">↑</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">✉</span>
              <h2>Select a conversation</h2>
              <p>Choose a course conversation to read its messages.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
