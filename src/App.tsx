import { useState, type FormEvent } from 'react'
import {
  createStudentMessage,
  filterConversations,
  flagConversationUrgent,
  initialConversations,
  resolveConversation,
  type Conversation,
  type ConversationFilter,
} from './lib/inbox'

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<ConversationFilter>('Active')
  const [query, setQuery] = useState('')
  const active = conversations.find((conversation) => conversation.id === activeId)
  const visibleConversations = filterConversations(conversations, filter, query)

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!active || active.resolved || !draft.trim()) return
    const message = createStudentMessage(`${Date.now()}`, active.course, draft.trim())
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              preview: message.body,
              status: 'Sent',
              waitingHours: 0,
              urgent: false,
              updatedAt: 'Just now',
            }
          : conversation,
      ),
    )
    setDraft('')
  }

  function markResolved() {
    if (!active) return
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id ? resolveConversation(conversation) : conversation,
      ),
    )
    setFilter('Resolved')
  }

  function markUrgent() {
    if (!active) return
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
        <span className="demo-label">Fictional demo data</span>
        <span className="avatar" aria-hidden="true">JD</span>
      </header>

      <main className={`workspace${active ? ' conversation-open' : ''}`}>
        <aside className="inbox-panel" aria-label="Inbox">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">STUDENT SPACE</p>
              <h1>Inbox</h1>
            </div>
            <span className="count">{visibleConversations.length}</span>
          </div>
          <p className="panel-intro">Your course conversations</p>

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
                onClick={() => { setActiveId(conversation.id); setDraft('') }}
                aria-current={activeId === conversation.id ? 'page' : undefined}
              >
                <span className="course-icon" aria-hidden="true">{conversation.course.slice(0, 1)}</span>
                <span className="card-copy">
                  <span className="card-topline">
                    <strong>{conversation.course}</strong>
                    <time>{conversation.updatedAt}</time>
                  </span>
                  <span className="instructor-name">{conversation.instructor}</span>
                  <span className="preview">{conversation.preview}</span>
                  <span className="card-badges">
                    <span className={`status status-${conversation.status.toLowerCase()}`}>{conversation.resolved ? 'Resolved' : conversation.status}</span>
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
                <h2>{active.instructor}</h2>
                <p>Course instructor</p>
                <div className="availability-row">
                  <span className={`availability-dot ${active.availability.toLowerCase()}`} aria-hidden="true" />
                  <span>{active.availability}</span>
                </div>
                {active.availability === 'Away' && (
                  <p className="away-note">This instructor is away; replies may be delayed.</p>
                )}
                {active.resolved && <p className="resolved-note">This conversation is resolved. You can still read its history.</p>}
              </div>
              <div className="message-list" aria-live="polite">
                <p className="thread-date">Your conversation · {active.course}</p>
                {active.messages.map((message) => (
                  <article className={`message ${message.direction}`} key={message.id}>
                    <span className="message-author">{message.author}</span>
                    <p>{message.body}</p>
                    <div className="message-meta">
                      <time>{message.time}</time>
                      {message.status && <span className={`status status-${message.status.toLowerCase()}`}>{message.status}</span>}
                    </div>
                  </article>
                ))}
                {active.waitingHours > 2 && active.status !== 'Replied' && !active.resolved && (
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
                {!active.resolved
                  ? <button className="resolve-button" onClick={markResolved}>Mark as resolved</button>
                  : <span className="resolved-label">Resolved conversation</span>}
              </div>
              {!active.resolved && (
                <form className="composer" onSubmit={sendMessage}>
                  <label htmlFor="question">Ask a question about {active.course}</label>
                  <textarea
                    id="question"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write your course question…"
                    rows={2}
                  />
                  <div className="composer-footer">
                    <span>Tagged to {active.course}</span>
                    <button type="submit" disabled={!draft.trim()}>Send question <span aria-hidden="true">↑</span></button>
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
