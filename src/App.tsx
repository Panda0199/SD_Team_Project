import { useState, type FormEvent } from 'react'
import { createStudentMessage, initialConversations, type Conversation } from './lib/inbox'

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const active = conversations.find((conversation) => conversation.id === activeId)

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!active || !draft.trim()) return
    const message = createStudentMessage(
      `${Date.now()}`,
      active.course,
      draft.trim(),
    )
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === active.id
          ? { ...conversation, messages: [...conversation.messages, message], preview: message.body, status: 'Sent', updatedAt: 'Just now' }
          : conversation,
      ),
    )
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
            <span className="count">{conversations.length}</span>
          </div>
          <p className="panel-intro">Your course conversations</p>
          <nav className="conversation-list" aria-label="Course conversations">
            {conversations.map((conversation) => (
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
                  <span className={`status status-${conversation.status.toLowerCase()}`}>{conversation.status}</span>
                </span>
              </button>
            ))}
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
              </div>
              <form className="composer" onSubmit={sendMessage}>
                <label htmlFor="question">Ask a question about {active.course}</label>
                <textarea
                  id="question"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write your course question…"
                  rows={3}
                />
                <div className="composer-footer">
                  <span>Tagged to {active.course}</span>
                  <button type="submit" disabled={!draft.trim()}>Send question <span aria-hidden="true">↑</span></button>
                </div>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">✉</span>
              <h2>Your course, one conversation away</h2>
              <p>Choose a course conversation to read messages or ask your instructor a question.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
